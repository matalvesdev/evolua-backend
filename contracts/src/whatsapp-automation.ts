import { z } from 'zod';
import { UuidSchema } from './common.js';

export const WhatsAppTriggerEnum = z.enum([
  'welcome',
  'appointment_reminder_24h',
  'appointment_reminder_1h',
  'post_session',
  'inactive_30d',
]);
export type WhatsAppTrigger = z.infer<typeof WhatsAppTriggerEnum>;

export const WhatsAppAutomationSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  label: z.string(),
  description: z.string().nullable(),
  trigger: z.string(),
  active: z.boolean(),
  template: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WhatsAppAutomation = z.infer<typeof WhatsAppAutomationSchema>;

export const CreateWhatsAppAutomationSchema = z.object({
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  trigger: WhatsAppTriggerEnum,
  template: z.string().min(1),
});
export type CreateWhatsAppAutomationInput = z.infer<typeof CreateWhatsAppAutomationSchema>;

export const UpdateWhatsAppAutomationSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  template: z.string().min(1).optional(),
});
export type UpdateWhatsAppAutomationInput = z.infer<typeof UpdateWhatsAppAutomationSchema>;
