import type {
  WaConversation as PrismaWaConversation,
  WaMessage as PrismaWaMessage,
  Patient as PrismaPatient,
} from '@prisma/client';
import type {
  WaConversation,
  WaConversationDetail,
  WaMessage,
  WaMessageStatus,
  WaMessageType,
  WaDirection,
} from '@evolua/contracts';

type ConversationWithRels = PrismaWaConversation & {
  patient?: Pick<PrismaPatient, 'id' | 'name' | 'guardianName'> | null;
  messages?: PrismaWaMessage[];
};

export const waCrmMapper = {
  message(m: PrismaWaMessage): WaMessage {
    return {
      id: m.id,
      conversationId: m.conversationId,
      direction: m.direction as WaDirection,
      type: m.type as WaMessageType,
      content: m.content,
      mediaUrl: m.mediaUrl ?? null,
      paymentLink: m.paymentLink ?? null,
      paymentAmount:
        m.paymentAmount === null || m.paymentAmount === undefined
          ? null
          : Number(m.paymentAmount),
      status: m.status as WaMessageStatus,
      evolutionId: m.evolutionId ?? null,
      sentAt: m.sentAt.toISOString(),
    };
  },

  conversation(c: ConversationWithRels): WaConversation {
    const messages = c.messages ?? [];
    const last = messages[0];
    return {
      id: c.id,
      clinicId: c.clinicId,
      patientId: c.patientId,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      patient: c.patient
        ? {
            id: c.patient.id,
            name: c.patient.name,
            guardianName: c.patient.guardianName ?? null,
          }
        : undefined,
      lastMessage: last ? waCrmMapper.message(last) : null,
    };
  },

  conversationDetail(
    c: ConversationWithRels,
  ): WaConversationDetail {
    return {
      ...waCrmMapper.conversation(c),
      messages: (c.messages ?? []).map(waCrmMapper.message),
    };
  },
};
