import type { Message as PrismaMessage } from '@prisma/client';
import type { Message } from '@evolua/contracts';

export const messageMapper = {
  toDto(m: PrismaMessage): Message {
    return {
      id: m.id,
      clinicId: m.clinicId,
      patientId: m.patientId,
      therapistId: m.therapistId,
      content: m.content,
      templateType: m.templateType as Message['templateType'],
      recipientPhone: m.recipientPhone,
      recipientName: m.recipientName,
      channel: m.channel,
      deliveryStatus: m.deliveryStatus as Message['deliveryStatus'],
      deliveryAttempts: m.deliveryAttempts,
      deliveredAt: m.deliveredAt?.toISOString() ?? null,
      sentAt: m.sentAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
    };
  },
};
