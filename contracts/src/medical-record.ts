import { z } from 'zod';
import { UuidSchema } from './common.js';

export const ClinicalAreaSchema = z.enum([
  'linguagem', 'voz', 'disfagia', 'motricidade', 'gagueira', 'tea',
]);

export const MedicalRecordScaleValueSchema = z.union([z.string(), z.number().finite()]);
export const MedicalRecordScalesSchema = z.record(z.string(), MedicalRecordScaleValueSchema);

export const MedicalRecordSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  patientName: z.string(),
  birthDate: z.string().date().nullable(),
  clinicalArea: ClinicalAreaSchema,
  diagnosis: z.string(),
  anamnesis: z.string(),
  scales: MedicalRecordScalesSchema,
  objectives: z.array(z.string()),
  latestEvolution: z.string(),
  sessionCount: z.number().int().nonnegative(),
  lastSessionAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateMedicalRecordSchema = z.object({
  patientId: UuidSchema,
  clinicalArea: ClinicalAreaSchema.default('linguagem'),
  diagnosis: z.string().max(500).default(''),
});

export const UpdateMedicalRecordSchema = z.object({
  clinicalArea: ClinicalAreaSchema.optional(),
  diagnosis: z.string().max(500).optional(),
  anamnesis: z.string().max(50_000).optional(),
  scales: MedicalRecordScalesSchema.optional(),
  objectives: z.array(z.string().min(1).max(500)).max(100).optional(),
  latestEvolution: z.string().max(50_000).optional(),
}).strict();

export const ListMedicalRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: UuidSchema.optional(),
});

export const MedicalRecordListSchema = z.object({
  data: z.array(MedicalRecordSchema),
  pagination: z.object({
    page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int(),
  }),
});

export type MedicalRecord = z.infer<typeof MedicalRecordSchema>;
export type CreateMedicalRecordInput = z.infer<typeof CreateMedicalRecordSchema>;
export type UpdateMedicalRecordInput = z.infer<typeof UpdateMedicalRecordSchema>;
export type ListMedicalRecordsQuery = z.infer<typeof ListMedicalRecordsQuerySchema>;
