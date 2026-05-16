import type { Prisma, Message } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { notificaClient } from '../../lib/notifica.js';
import { logger } from '../../lib/logger.js';
import type { CreateMessageInput, ListMessagesQuery } from '@evolua/contracts';

export interface PaginatedMessages {
  data: Message[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export class MessagesService {
  async create(
    clinicId: string,
    therapistId: string,
    input: CreateMessageInput,
  ): Promise<Message> {
    // Confirma que o paciente pertence à clínica
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) {
      const err = new Error('Patient not found in this clinic');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }

    // Recipient address: telefone (whatsapp/sms) ou email (email).
    // O schema Message.recipientPhone armazena o identificador do destinatário.
    const recipient =
      input.channel === 'email'
        ? input.recipientEmail!
        : input.recipientPhone!;

    const message = await prisma.message.create({
      data: {
        clinicId,
        therapistId,
        patientId: input.patientId,
        content: input.content,
        templateType: input.templateType,
        recipientPhone: recipient,
        recipientName: input.recipientName,
        channel: input.channel,
      },
    });

    // Dispatch best-effort por canal.
    if (input.channel === 'whatsapp') {
      void this.dispatchWhatsApp(input, therapistId).catch((err) => {
        logger.warn(
          { err, patientId: input.patientId, channel: 'whatsapp' },
          'messages: whatsapp dispatch error',
        );
      });
    } else if (input.channel === 'email') {
      void this.dispatchEmail(input, message.id).catch((err) => {
        logger.warn(
          { err, patientId: input.patientId, channel: 'email' },
          'messages: email dispatch error',
        );
      });
    }

    return message;
  }

  private async dispatchWhatsApp(
    input: CreateMessageInput,
    therapistId: string,
  ): Promise<void> {
    const res = await fetch(`${env.WHATSAPP_SERVICE_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': therapistId,
      },
      body: JSON.stringify({
        to: input.recipientPhone,
        body: input.content,
        patientId: input.patientId,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, patientId: input.patientId },
        'messages: whatsapp service returned non-2xx',
      );
    }
  }

  private async dispatchEmail(
    input: CreateMessageInput,
    messageId: string,
  ): Promise<void> {
    const result = await notificaClient.sendEmail({
      to: input.recipientEmail!,
      subject: input.subject!,
      html: input.htmlBody ?? `<p>${escapeHtml(input.content)}</p>`,
      text: input.content,
      idempotencyKey: messageId,
    });
    if (!result.success) {
      logger.warn(
        { error: result.error, messageId, patientId: input.patientId },
        'messages: notifica email dispatch failed',
      );
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
