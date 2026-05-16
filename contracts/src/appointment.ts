import { z } from 'zod';
import { UuidSchema } from './common.js';

export const AppointmentTypeSchema = z.enum([
  'evaluation',
  'session',
  'reevaluation',
  'family_meeting',
  'other',
]);
export type AppointmentType = z.infer<typeof AppointmentTypeSchema>;

export const AppointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const CancellationReasonSchema = z.enum([
  'patient_request',
  'therapist_unavailable',
  'illness',
  'other',
]);
export type CancellationReason = z.infer<typeof CancellationReasonSchema>;

export const AppointmentSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  patientName: z.string(),
  therapistId: UuidSchema.nullable(),
  therapistName: z.string(),
  dateTime: z.string().datetime(),
  duration: z.number().int().positive(),
  // status/type permanecem string-livre no DB; enums aplicados em inputs.
  type: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
  sessionNotes: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  cancellationNotes: z.string().nullable(),
  cancelledBy: z.string().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  confirmedAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  googleCalendarEventId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentSchema = z.object({
  patientId: UuidSchema,
  patientName: z.string().min(1).max(200),
  therapistId: UuidSchema.optional().nullable(),
  therapistName: z.string().min(1).max(200),
  dateTime: z.string().datetime(),
  duration: z.number().int().min(5).max(480).default(60),
  type: AppointmentTypeSchema,
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z
  .object({
    dateTime: z.string().datetime(),
    duration: z.number().int().min(5).max(480),
    type: AppointmentTypeSchema,
    notes: z.string().max(2000).nullable(),
    sessionNotes: z.string().max(10_000).nullable(),
  })
  .partial();
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;

export const CancelAppointmentSchema = z.object({
  reason: CancellationReasonSchema,
  notes: z.string().max(1000).optional().nullable(),
  cancelledBy: z.enum(['therapist', 'patient', 'system']).default('therapist'),
});
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;

export const CompleteAppointmentSchema = z.object({
  sessionNotes: z.string().max(10_000).optional(),
});
export type CompleteAppointmentInput = z.infer<typeof CompleteAppointmentSchema>;

export const ListAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: UuidSchema.optional(),
  therapistId: UuidSchema.optional(),
  status: AppointmentStatusSchema.optional(),
  type: AppointmentTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;
