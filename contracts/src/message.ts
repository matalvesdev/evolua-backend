import { z } from 'zod';
import { UuidSchema } from './common.js';

export const MessageTemplateTypeEnum = z.enum(['reminder', 'activity', 'feedback', 'free']);
export type MessageTemplateType = z.infer<typeof MessageTemplateTypeEnum>;

export const MessageChannelEnum = z.enum(['whatsapp', 'sms', 'email']);
export type MessageChannel = z.infer<typeof MessageChannelEnum>;
export const MessageDeliveryStatusEnum = z.enum(['pending', 'processing', 'sent', 'failed']);

export const MessageSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  therapistId: UuidSchema,
  content: z.string(),
  templateType: MessageTemplateTypeEnum,
  recipientPhone: z.string(),
  recipientName: z.string(),
  channel: z.string(),
  deliveryStatus: MessageDeliveryStatusEnum,
  deliveryAttempts: z.number().int().nonnegative(),
  deliveredAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageSchema = z
  .object({
    patientId: UuidSchema,
    content: z.string().min(1).max(10_000),
    templateType: MessageTemplateTypeEnum,
    recipientName: z.string().min(1).max(200),
    channel: MessageChannelEnum.default('whatsapp'),
    // WhatsApp/SMS
    recipientPhone: z.string().min(8).max(32).optional(),
    // Email (Resend/SMTP)
    recipientEmail: z.string().email().max(254).optional(),
    subject: z.string().min(1).max(200).optional(),
    htmlBody: z.string().max(50_000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.channel === 'email') {
      if (!v.recipientEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientEmail'],
          message: 'recipientEmail é obrigatório para channel=email',
        });
      }
      if (!v.subject) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subject'],
          message: 'subject é obrigatório para channel=email',
        });
      }
    } else if (!v.recipientPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientPhone'],
        message: 'recipientPhone é obrigatório para channel whatsapp/sms',
      });
    }
  });
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export const ListMessagesQuerySchema = z.object({
  patientId: UuidSchema.optional(),
  templateType: MessageTemplateTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;
