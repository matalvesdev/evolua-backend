import { z } from 'zod';
import { UuidSchema } from './common.js';

export const ClinicalScaleCategoryEnum = z.enum(['voz', 'degluticao', 'linguagem', 'fluencia', 'audicao']);
export type ClinicalScaleCategory = z.infer<typeof ClinicalScaleCategoryEnum>;

export const ClinicalScaleTypeEnum = z.enum(['numeric', 'categorical']);
export type ClinicalScaleType = z.infer<typeof ClinicalScaleTypeEnum>;

export const ClinicalScaleSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  type: z.string(),
  domain: z.unknown(),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ClinicalScale = z.infer<typeof ClinicalScaleSchema>;

export const ClinicalScaleResultSchema = z.object({
  id: UuidSchema,
  patientId: UuidSchema,
  scaleId: UuidSchema,
  therapistId: UuidSchema.nullable(),
  appointmentId: UuidSchema.nullable(),
  score: z.unknown(),
  notes: z.string().nullable(),
  conductedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type ClinicalScaleResult = z.infer<typeof ClinicalScaleResultSchema>;

export const RecordScaleResultSchema = z.object({
  patientId: UuidSchema,
  scaleId: UuidSchema,
  appointmentId: UuidSchema.optional().nullable(),
  score: z.record(z.unknown()),
  notes: z.string().max(2000).optional().nullable(),
  conductedAt: z.string().datetime().optional(),
});
export type RecordScaleResultInput = z.infer<typeof RecordScaleResultSchema>;
