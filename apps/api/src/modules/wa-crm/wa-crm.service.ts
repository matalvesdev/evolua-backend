import type {
  WaConversation as PrismaWaConversation,
  WaMessage as PrismaWaMessage,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { pixService } from '../../lib/pix.js';
import { logger } from '../../lib/logger.js';
import type {
  WaSendText,
  WaSendMaterial,
  WaSendPaymentLink,
  WaInboundWebhook,
} from '@evolua/contracts';

/**
 * WhatsApp CRM service.
 * - Conversa por paciente (unique [clinicId, patientId])
 * - Envio outbound delegado ao serviço Go via {to, body}
 * - Webhook inbound chamado pelo Go (já validado por internal-token na rota)
 */
class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class WaCrmService {
  // ── Listagem / detalhe ───────────────────────────────────────────────

  async listConversations(clinicId: string): Promise<PrismaWaConversation[]> {
    return prisma.waConversation.findMany({
      where: { clinicId },
      include: {
        patient: { select: { id: true, name: true, guardianName: true } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(
    clinicId: string,
    patientId: string,
  ): Promise<
    PrismaWaConversation & { messages: PrismaWaMessage[] }
  > {
    const conv = await prisma.waConversation.findFirst({
      where: { clinicId, patientId },
      include: { messages: { orderBy: { sentAt: 'asc' } } },
    });
    if (!conv) throw new HttpError(404, 'Conversa não encontrada');
    return conv;
  }

  // ── Outbound ─────────────────────────────────────────────────────────

  async sendText(clinicId: string, dto: WaSendText): Promise<PrismaWaMessage> {
    const { conv, phone } = await this.ensureConversation(clinicId, dto.patientId);

    const dispatch = await this.dispatchWhatsApp(phone, dto.message, dto.patientId);

    const msg = await prisma.waMessage.create({
      data: {
        conversationId: conv.id,
        direction: 'outbound',
        type: dto.type,
        content: dto.message,
        mediaUrl: dto.mediaUrl ?? null,
        evolutionId: dispatch.messageId ?? null,
        status: dispatch.success ? 'sent' : 'failed',
      },
    });

    await prisma.waConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return msg;
  }

  async sendMaterial(
    clinicId: string,
    dto: WaSendMaterial,
  ): Promise<PrismaWaMessage> {
    const message =
      `📋 *${dto.materialTitle}*\n\n` +
      `${dto.materialContent}\n\n` +
      (dto.fileUrl ? `📎 Acesse o material completo: ${dto.fileUrl}\n\n` : '') +
      `_Evolua — Sistema de Gestão Clínica_`;

    return this.sendText(clinicId, {
      patientId: dto.patientId,
      message,
      type: 'material',
      mediaUrl: dto.fileUrl,
    });
  }

  async sendPaymentLink(
    clinicId: string,
    dto: WaSendPaymentLink,
  ): Promise<{
    message: PrismaWaMessage;
    pixPayload: string;
    qrCodeBase64: string;
  }> {
    const patient = await prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId, deletedAt: null },
    });
    if (!patient) throw new HttpError(404, 'Paciente não encontrado');

    const amountStr = dto.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const recipientName = patient.guardianName ?? patient.name;

    // Gera Pix se PIX_KEY configurada; caso contrário envia só o aviso de valor.
    let pixPayload = '';
    let qrCodeBase64 = '';
    if (pixService.isConfigured) {
      try {
        const pix = await pixService.generate({
          amount: dto.amount,
          description: dto.description ?? 'Sessao terapia',
          txId: `EVL${Date.now().toString(36).toUpperCase()}`,
        });
        pixPayload = pix.payload;
        qrCodeBase64 = pix.qrCodeBase64;
      } catch (e) {
        logger.warn(
          { err: e, amount: dto.amount, patientId: dto.patientId },
          'wa-crm: pix generation failed',
        );
      }
    }

    const message =
      `Olá, *${recipientName}*! 👋\n\n` +
      `Segue o Pix para pagamento de *${amountStr}*` +
      (dto.description ? ` referente a: _${dto.description}_` : '') +
      `.\n\n` +
      (pixPayload
        ? `📋 *Pix Copia e Cola:*\n\`\`\`${pixPayload}\`\`\`\n\n`
        : `_Geração de QR Code Pix indisponível no momento — entre em contato com a clínica._\n\n`) +
      `_Evolua — Sistema de Gestão Clínica_`;

    const { conv, phone } = await this.ensureConversation(clinicId, dto.patientId);
    const dispatch = await this.dispatchWhatsApp(phone, message, dto.patientId);

    const msg = await prisma.waMessage.create({
      data: {
        conversationId: conv.id,
        direction: 'outbound',
        type: 'payment_link',
        content: message,
        paymentLink: pixPayload || null,
        paymentAmount: new (await import('@prisma/client/runtime/library')).Decimal(
          dto.amount.toFixed(2),
        ),
        evolutionId: dispatch.messageId ?? null,
        status: dispatch.success ? 'sent' : 'failed',
      },
    });

    await prisma.waConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return { message: msg, pixPayload, qrCodeBase64 };
  }

  // ── Inbound webhook (chamado pelo Go service) ────────────────────────

  async handleInbound(payload: WaInboundWebhook): Promise<void> {
    const phoneVariants = this.phoneVariants(payload.senderPhone);

    // Idempotência: ignora se já temos a mensagem
    if (payload.messageId) {
      const dup = await prisma.waMessage.findFirst({
        where: { evolutionId: payload.messageId },
        select: { id: true },
      });
      if (dup) return;
    }

    // 1. Conversa existente?
    const existing = await prisma.waConversation.findFirst({
      where: { phone: { in: phoneVariants } },
    });
    if (existing) {
      await this.saveInbound(existing.id, payload.messageId, payload.text);
      await prisma.waConversation.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
      return;
    }

    // 2. Paciente pelo telefone?
    const patient = await prisma.patient.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { phone: { in: phoneVariants } },
          { guardianPhone: { in: phoneVariants } },
        ],
      },
    });
    if (patient) {
      const conv = await prisma.waConversation.create({
        data: {
          clinicId: patient.clinicId,
          patientId: patient.id,
          phone: payload.senderPhone,
        },
      });
      await this.saveInbound(conv.id, payload.messageId, payload.text);
      return;
    }

    // 3. Órfã: descarta com log. TODO: criar lead / notificar clínica.
    logger.info(
      { pushName: payload.pushName, messageId: payload.messageId },
      'wa-crm: inbound de número desconhecido — descartado',
    );
  }

  // ── Privados ─────────────────────────────────────────────────────────

  private async ensureConversation(
    clinicId: string,
    patientId: string,
  ): Promise<{ conv: PrismaWaConversation; phone: string }> {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId, deletedAt: null },
      select: { id: true, phone: true, guardianPhone: true },
    });
    if (!patient) throw new HttpError(404, 'Paciente não encontrado');

    const phone = patient.guardianPhone ?? patient.phone;
    if (!phone) {
      throw new HttpError(
        400,
        'Paciente/responsável sem telefone cadastrado',
      );
    }

    const conv = await prisma.waConversation.upsert({
      where: { clinicId_patientId: { clinicId, patientId } },
      update: {},
      create: { clinicId, patientId, phone },
    });

    return { conv, phone };
  }

  private async dispatchWhatsApp(
    phone: string,
    body: string,
    patientId: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch(`${env.WHATSAPP_SERVICE_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify({ to: phone, body, patientId }),
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      if (!res.ok) {
        return { success: false, error: `${res.status}: ${text.slice(0, 200)}` };
      }
      try {
        const data = JSON.parse(text) as { messageId?: string };
        return { success: true, messageId: data.messageId };
      } catch {
        return { success: true };
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private async saveInbound(
    conversationId: string,
    evolutionId: string,
    content: string,
  ): Promise<void> {
    await prisma.waMessage.create({
      data: {
        conversationId,
        direction: 'inbound',
        type: 'text',
        content,
        evolutionId: evolutionId || null,
        status: 'delivered',
      },
    });
  }

  /** Variantes de busca: com e sem DDI 55. */
  private phoneVariants(phone: string): string[] {
    const digits = phone.replace(/\D/g, '');
    const variants = new Set<string>([digits, phone]);
    if (digits.startsWith('55') && digits.length >= 12) {
      variants.add(digits.slice(2));
    } else if (digits.length >= 10) {
      variants.add(`55${digits}`);
    }
    return Array.from(variants).filter(Boolean);
  }
}

export const waCrmService = new WaCrmService();
export { HttpError as WaCrmError };
