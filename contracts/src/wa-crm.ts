/**
 * WhatsApp CRM — histórico de conversas por paciente, com integrações
 * de envio de texto, materiais terapêuticos e cobrança Pix.
 *
 * Direção e tipos espelham os campos string da tabela `wa_messages`
 * (sem enums no DB para flexibilidade futura).
 */
import { z } from 'zod';
import { UuidSchema } from './common.js';

const Iso = () => z.string().datetime();

export const WaDirectionEnum = z.enum(['outbound', 'inbound']);
export type WaDirection = z.infer<typeof WaDirectionEnum>;

export const WaMessageTypeEnum = z.enum(['text', 'material', 'payment_link']);
export type WaMessageType = z.infer<typeof WaMessageTypeEnum>;

export const WaMessageStatusEnum = z.enum(['sent', 'delivered', 'read', 'failed']);
export type WaMessageStatus = z.infer<typeof WaMessageStatusEnum>;

export const WaMessageSchema = z.object({
  id: UuidSchema,
  conversationId: UuidSchema,
  direction: WaDirectionEnum,
  type: WaMessageTypeEnum,
  content: z.string(),
  mediaUrl: z.string().url().nullable().optional(),
  paymentLink: z.string().nullable().optional(),
  paymentAmount: z.number().nullable().optional(),
  status: WaMessageStatusEnum,
  evolutionId: z.string().nullable().optional(),
  sentAt: Iso(),
});
export type WaMessage = z.infer<typeof WaMessageSchema>;

export const WaConversationSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  phone: z.string(),
  createdAt: Iso(),
  updatedAt: Iso(),
  patient: z
    .object({
      id: UuidSchema,
      name: z.string(),
      guardianName: z.string().nullable().optional(),
    })
    .optional(),
  lastMessage: WaMessageSchema.nullable().optional(),
  unreadCount: z.number().int().min(0).optional(),
});
export type WaConversation = z.infer<typeof WaConversationSchema>;

export const WaConversationDetailSchema = WaConversationSchema.extend({
  messages: z.array(WaMessageSchema),
});
export type WaConversationDetail = z.infer<typeof WaConversationDetailSchema>;

// ── Inputs ─────────────────────────────────────────────────────────────

export const WaSendTextSchema = z.object({
  patientId: UuidSchema,
  message: z.string().min(1).max(4096),
  type: WaMessageTypeEnum.default('text'),
  mediaUrl: z.string().url().optional(),
});
export type WaSendText = z.infer<typeof WaSendTextSchema>;

export const WaSendMaterialSchema = z.object({
  patientId: UuidSchema,
  materialTitle: z.string().min(1).max(200),
  materialContent: z.string().min(1).max(4096),
  fileUrl: z.string().url().optional(),
});
export type WaSendMaterial = z.infer<typeof WaSendMaterialSchema>;

export const WaSendPaymentLinkSchema = z.object({
  patientId: UuidSchema,
  amount: z.number().positive().max(100_000),
  description: z.string().max(200).optional(),
});
export type WaSendPaymentLink = z.infer<typeof WaSendPaymentLinkSchema>;

export const WaSendPaymentLinkResponseSchema = z.object({
  message: WaMessageSchema,
  pixPayload: z.string(),
  qrCodeBase64: z.string(),
});
export type WaSendPaymentLinkResponse = z.infer<typeof WaSendPaymentLinkResponseSchema>;

// ── Webhook inbound (chamado pelo Go service) ──────────────────────────

export const WaInboundWebhookSchema = z.object({
  senderPhone: z.string().min(5).max(32),
  pushName: z.string().max(200).optional().default(''),
  messageId: z.string().max(200),
  text: z.string().max(10_000),
});
export type WaInboundWebhook = z.infer<typeof WaInboundWebhookSchema>;
