import { z } from 'zod';
import { UuidSchema } from './common.js';

export const TeleSessionStatusSchema = z.enum(['scheduled', 'active', 'ended']);

export const TeleSessionSchema = z.object({
  id: UuidSchema,
  patient: z.string(),
  patientId: UuidSchema,
  date: z.string(),
  time: z.string(),
  link: z.string(),
  status: TeleSessionStatusSchema,
  sentViaWhatsApp: z.boolean(),
  clinicId: UuidSchema,
  createdAt: z.string(),
});
export type TeleSession = z.infer<typeof TeleSessionSchema>;

export const CreateTeleSessionSchema = z.object({
  patientId: UuidSchema,
  patient: z.string().min(1),
  date: z.string(),
  time: z.string(),
  sendWA: z.boolean().default(false),
});
export type CreateTeleSessionInput = z.infer<typeof CreateTeleSessionSchema>;

export const UpdateTeleSessionSchema = z.object({
  status: TeleSessionStatusSchema.optional(),
  sentViaWhatsApp: z.boolean().optional(),
});
export type UpdateTeleSessionInput = z.infer<typeof UpdateTeleSessionSchema>;
