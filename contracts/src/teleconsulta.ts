import { z } from 'zod';
import { UuidSchema } from './common.js';

export const TeleSessionStatusSchema = z.enum(['scheduled', 'active', 'ended']);

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)');
const TimeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)');
const UrlStringSchema = z.string().url('Link inválido').refine(
  (value) => new URL(value).protocol === 'https:',
  'O link deve usar HTTPS',
);

export const TeleSessionSchema = z.object({
  id: UuidSchema,
  patient: z.string(),
  patientId: UuidSchema,
  date: DateStringSchema,
  time: TimeStringSchema,
  link: UrlStringSchema,
  status: TeleSessionStatusSchema,
  sentViaWhatsApp: z.boolean(),
  clinicId: UuidSchema,
  createdAt: z.string(),
});
export type TeleSession = z.infer<typeof TeleSessionSchema>;

export const CreateTeleSessionSchema = z.object({
  patientId: UuidSchema,
  date: DateStringSchema,
  time: TimeStringSchema,
  // O Evolua ainda não hospeda salas próprias. A profissional fornece o link
  // do provedor de teleconsulta autorizado pela clínica.
  link: UrlStringSchema,
  sendWA: z.boolean().default(false),
});
export type CreateTeleSessionInput = z.infer<typeof CreateTeleSessionSchema>;

export const UpdateTeleSessionSchema = z.object({
  status: TeleSessionStatusSchema.optional(),
  sentViaWhatsApp: z.boolean().optional(),
  link: UrlStringSchema.optional(),
});
export type UpdateTeleSessionInput = z.infer<typeof UpdateTeleSessionSchema>;
