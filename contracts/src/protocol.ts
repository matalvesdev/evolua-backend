import { z } from 'zod';
import { UuidSchema } from './common.js';

// ── Clinical Protocols ──────────────────────────────────────────────────────

export const ClinicalProtocolTemplateSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  area: z.string(),
  description: z.string().nullable(),
  version: z.string(),
  fields: z.unknown(),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ClinicalProtocolTemplate = z.infer<typeof ClinicalProtocolTemplateSchema>;

export const ClinicalProtocolEntrySchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  therapistId: UuidSchema,
  treatmentPlanId: UuidSchema.nullable(),
  appointmentId: UuidSchema.nullable(),
  templateId: UuidSchema,
  values: z.unknown(),
  totalScore: z.number().nullable(),
  interpretation: z.string().nullable(),
  conductedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type ClinicalProtocolEntry = z.infer<typeof ClinicalProtocolEntrySchema>;

export const CreateProtocolEntrySchema = z.object({
  patientId: UuidSchema,
  templateId: UuidSchema,
  values: z.record(z.unknown()),
  treatmentPlanId: UuidSchema.optional().nullable(),
  appointmentId: UuidSchema.optional().nullable(),
  conductedAt: z.string().datetime(),
  totalScore: z.number().optional().nullable(),
  interpretation: z.string().max(500).optional().nullable(),
});
export type CreateProtocolEntryInput = z.infer<typeof CreateProtocolEntrySchema>;

// ── Exercises ───────────────────────────────────────────────────────────────

export const ExerciseTemplateSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  area: z.string(),
  subarea: z.string().nullable(),
  description: z.string(),
  instructions: z.string(),
  duration: z.number().int().nullable(),
  frequency: z.string().nullable(),
  repetitions: z.string().nullable(),
  videoUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  tags: z.array(z.string()),
  difficulty: z.string(),
  ageGroup: z.string(),
  isSystem: z.boolean(),
  clinicId: UuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExerciseTemplate = z.infer<typeof ExerciseTemplateSchema>;

export const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(300),
  area: z.string().min(1).max(100),
  subarea: z.string().max(100).optional().nullable(),
  description: z.string().min(1).max(5000),
  instructions: z.string().min(1).max(10_000),
  duration: z.number().int().min(1).max(1440).optional().nullable(),
  frequency: z.string().max(100).optional().nullable(),
  repetitions: z.string().max(100).optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().max(50)).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  ageGroup: z.enum(['child', 'adult', 'elderly', 'all']).default('all'),
});
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;

export const UpdateExerciseSchema = CreateExerciseSchema.partial();
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseSchema>;

export const PatientExercisePrescriptionSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  therapistId: UuidSchema,
  exerciseId: UuidSchema,
  treatmentPlanId: UuidSchema.nullable(),
  customInstructions: z.string().nullable(),
  frequency: z.string(),
  repetitions: z.string().nullable(),
  durationDays: z.number().int().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: z.string(),
  sentAt: z.string().datetime().nullable(),
  sentVia: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PatientExercisePrescription = z.infer<typeof PatientExercisePrescriptionSchema>;

export const PrescribeExerciseSchema = z.object({
  patientId: UuidSchema,
  exerciseId: UuidSchema,
  treatmentPlanId: UuidSchema.optional().nullable(),
  customInstructions: z.string().max(5000).optional().nullable(),
  frequency: z.string().min(1).max(100),
  repetitions: z.string().max(100).optional().nullable(),
  durationDays: z.number().int().min(1).max(365).optional().nullable(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
});
export type PrescribeExerciseInput = z.infer<typeof PrescribeExerciseSchema>;
