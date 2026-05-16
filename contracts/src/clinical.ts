import { z } from 'zod';
import { UuidSchema } from './common.js';

// ── Treatment Plans ─────────────────────────────────────────────────────────

export const TreatmentPlanStatusSchema = z.enum([
  'active',
  'completed',
  'suspended',
  'cancelled',
]);

export const TreatmentPlanSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  therapistId: UuidSchema,
  title: z.string(),
  diagnosis: z.string().nullable(),
  objectives: z.array(z.string()),
  totalSessions: z.number().int(),
  usedSessions: z.number().int(),
  status: z.string(),
  insuranceName: z.string().nullable(),
  authorizationCode: z.string().nullable(),
  authorizationExpiry: z.string().nullable(),
  startDate: z.string(),
  expectedEndDate: z.string().nullable(),
  completedAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TreatmentPlan = z.infer<typeof TreatmentPlanSchema>;

export const CreateTreatmentPlanSchema = z.object({
  patientId: UuidSchema,
  therapistId: UuidSchema,
  title: z.string().min(1).max(300),
  diagnosis: z.string().max(2000).optional().nullable(),
  objectives: z.array(z.string().min(1).max(500)).default([]),
  totalSessions: z.number().int().min(1).max(1000),
  insuranceName: z.string().max(200).optional().nullable(),
  authorizationCode: z.string().max(100).optional().nullable(),
  authorizationExpiry: z.string().optional().nullable(),
  startDate: z.string(),
  expectedEndDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});
export type CreateTreatmentPlanInput = z.infer<typeof CreateTreatmentPlanSchema>;

export const UpdateTreatmentPlanSchema = CreateTreatmentPlanSchema.partial().extend({
  status: TreatmentPlanStatusSchema.optional(),
});
export type UpdateTreatmentPlanInput = z.infer<typeof UpdateTreatmentPlanSchema>;

export const TreatmentSessionSchema = z.object({
  id: UuidSchema,
  treatmentPlanId: UuidSchema,
  appointmentId: UuidSchema.nullable(),
  sessionNumber: z.number().int(),
  conductedAt: z.string().datetime(),
  evolution: z.string().nullable(),
  goalProgress: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});
export type TreatmentSession = z.infer<typeof TreatmentSessionSchema>;

export const RegisterSessionSchema = z.object({
  appointmentId: UuidSchema.optional().nullable(),
  conductedAt: z.string().datetime(),
  evolution: z.string().max(20_000).optional().nullable(),
  goalProgress: z.unknown().optional(),
});
export type RegisterSessionInput = z.infer<typeof RegisterSessionSchema>;

// ── Patient Goals ───────────────────────────────────────────────────────────

export const GoalStatusSchema = z.enum(['in_progress', 'achieved', 'paused', 'cancelled']);
export const GoalPrioritySchema = z.enum(['low', 'medium', 'high']);

export const PatientGoalSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  therapistId: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  startDate: z.string().datetime(),
  targetDate: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PatientGoal = z.infer<typeof PatientGoalSchema>;

export const CreateGoalSchema = z.object({
  patientId: UuidSchema,
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  priority: GoalPrioritySchema.default('medium'),
  startDate: z.string().datetime(),
  targetDate: z.string().datetime().optional().nullable(),
});
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  status: GoalStatusSchema.optional(),
});
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

export const GoalSnapshotSchema = z.object({
  id: UuidSchema,
  goalId: UuidSchema,
  therapistId: UuidSchema,
  progress: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type GoalSnapshot = z.infer<typeof GoalSnapshotSchema>;

export const RegisterSnapshotSchema = z.object({
  progress: z.number().min(0).max(100),
  notes: z.string().max(2000).optional().nullable(),
});
export type RegisterSnapshotInput = z.infer<typeof RegisterSnapshotSchema>;

export const GoalMilestoneSchema = z.object({
  id: UuidSchema,
  goalId: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string(),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>;

export const CreateMilestoneSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string(),
});
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;
