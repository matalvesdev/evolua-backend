import { Prisma, type Message } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { emailClient } from '../../lib/email-client.js';
import { logger } from '../../lib/logger.js';
import { recordDeliveryAttempt } from '../../plugins/metrics.js';
import type { CreateMessageInput, ListMessagesQuery } from '@evolua/contracts';

export interface PaginatedMessages {
  data: Message[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export class MessagesService {
  async processPendingDeliveries(limit = 50): Promise<void> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const pending = await prisma.message.findMany({
      where: { deliveryStatus: 'pending' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: safeLimit,
    });
    for (const message of pending) {
      await this.dispatchPersistedMessage(message.id);
    }

    // Email has a provider idempotency key (the message ID), so a stale claim
    // can be resumed safely. WhatsApp does not expose a verified equivalent in
    // this integration: do not resend it automatically after an unknown result.
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.message.updateMany({
      where: {
        deliveryStatus: 'processing',
        channel: 'email',
        deliveryAttemptedAt: { lt: staleBefore },
      },
      data: { deliveryStatus: 'pending' },
    });
    await prisma.message.updateMany({
      where: {
        deliveryStatus: 'processing',
        channel: 'whatsapp',
        deliveryAttemptedAt: { lt: staleBefore },
      },
      data: {
        deliveryStatus: 'failed',
        deliveryError: 'delivery outcome unknown; manual review required',
      },
    });
  }

  async create(
    clinicId: string,
    therapistId: string,
    input: CreateMessageInput,
    idempotencyKey?: string,
  ): Promise<Message> {
    // Confirma que o paciente pertence à clínica
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true, name: true, phone: true, guardianPhone: true, email: true },
    });
    if (!patient) {
      const err = new Error('Patient not found in this clinic');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (input.channel === 'sms') {
      const err = new Error('SMS delivery is not supported');
      Object.assign(err, { statusCode: 400 });
      throw err;
    }

    // Destinatário clínico é derivado do paciente/responsável autorizado no
    // servidor. Dados enviados pelo navegador não são autoridade.
    const recipient = input.channel === 'email'
      ? patient.email
      : patient.guardianPhone ?? patient.phone;
    if (!recipient) {
      const err = new Error(input.channel === 'email'
        ? 'Patient has no email address'
        : 'Patient has no phone number');
      Object.assign(err, { statusCode: 400 });
      throw err;
    }
    const normalizedInput = {
      ...input,
      recipientName: patient.name,
      recipientPhone: input.channel === 'whatsapp' ? recipient : undefined,
      recipientEmail: input.channel === 'email' ? recipient : undefined,
      subject: input.channel === 'email' ? input.subject ?? 'Mensagem da clínica' : undefined,
    };

    let message: Message;
    try {
      message = await prisma.message.create({
        data: {
          clinicId,
          therapistId,
          patientId: patient.id,
          content: normalizedInput.content,
          templateType: normalizedInput.templateType,
          recipientPhone: recipient,
          recipientName: patient.name,
          channel: normalizedInput.channel,
          deliveryStatus: 'pending',
          idempotencyKey,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002' || !idempotencyKey) {
        throw error;
      }
      const existing = await prisma.message.findFirst({
        where: { clinicId, idempotencyKey },
      });
      if (!existing) throw error;
      const isSameOperation = existing.patientId === patient.id
        && existing.content === normalizedInput.content
        && existing.templateType === normalizedInput.templateType
        && existing.channel === normalizedInput.channel;
      if (!isSameOperation) {
        throw Object.assign(
          new Error('Idempotency key was already used for a different message'),
          { statusCode: 409 },
        );
      }
      return existing;
    }

    // A resposta representa aceitação persistida, não entrega. O estado muda
    // somente após o provider confirmar ou falhar.
    void this.dispatchPersistedMessage(message.id).catch(() => undefined);

    return message;
  }

  private async dispatchPersistedMessage(messageId: string): Promise<void> {
    const claimed = await prisma.message.updateMany({
      where: { id: messageId, deliveryStatus: 'pending' },
      data: { deliveryStatus: 'processing', deliveryAttempts: { increment: 1 }, deliveryAttemptedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return;
    try {
      if (message.channel === 'whatsapp') {
        await this.dispatchWhatsApp(message);
      } else if (message.channel === 'email') {
        await this.dispatchEmail(message);
      } else {
        throw new Error('Unsupported delivery channel');
      }
      await prisma.message.update({
        where: { id: message.id },
        data: { deliveryStatus: 'sent', deliveryError: null, deliveredAt: new Date() },
      });
      if (message.channel === 'email' || message.channel === 'whatsapp') {
        recordDeliveryAttempt(message.channel, 'sent');
      }
    } catch {
      await prisma.message.update({
        where: { id: message.id },
        data: { deliveryStatus: 'failed', deliveryError: 'provider unavailable' },
      });
      if (message.channel === 'email' || message.channel === 'whatsapp') {
        recordDeliveryAttempt(message.channel, 'failed');
      }
      logger.warn({ messageId: message.id, channel: message.channel }, 'messages: delivery failed');
    }
  }

  private async dispatchWhatsApp(message: Message): Promise<void> {
    const res = await fetch(`${env.WHATSAPP_SERVICE_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': message.therapistId,
      },
      body: JSON.stringify({
        to: message.recipientPhone,
        body: message.content,
        patientId: message.patientId,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new Error(`WhatsApp provider returned ${res.status}`);
    }
  }

  private async dispatchEmail(message: Message): Promise<void> {
    const result = await emailClient.sendEmail({
      to: message.recipientPhone,
      subject: 'Mensagem da clínica',
      html: `<p>${escapeHtml(message.content)}</p>`,
      text: message.content,
      idempotencyKey: message.id,
    });
    if (!result.success) {
      throw new Error('Email provider unavailable');
    }
  }

  async list(
    clinicId: string,
    query: ListMessagesQuery,
  ): Promise<PaginatedMessages> {
    const where: Prisma.MessageWhereInput = { clinicId };
    if (query.patientId) where.patientId = query.patientId;
    if (query.templateType) where.templateType = query.templateType;

    const [data, total] = await prisma.$transaction([
      prisma.message.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { sentAt: 'desc' },
      }),
      prisma.message.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  // ── WhatsApp Automations ──────────────────────────────────────────────

  async listAutomations(clinicId: string) {
    return prisma.whatsAppAutomation.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAutomation(clinicId: string, id: string) {
    return prisma.whatsAppAutomation.findFirst({
      where: { id, clinicId },
    });
  }

  async updateAutomation(
    clinicId: string,
    id: string,
    data: { active?: boolean; label?: string; description?: string | null; template?: string },
  ) {
    const exists = await prisma.whatsAppAutomation.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!exists) return null;
    return prisma.whatsAppAutomation.update({
      where: { id },
      data,
    });
  }
}

export const messagesService = new MessagesService();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
