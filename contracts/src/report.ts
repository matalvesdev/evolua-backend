import { z } from 'zod';
import { UuidSchema } from './common.js';

export const ReportTypeSchema = z.enum([
  'evolution',
  'evaluation',
  'reevaluation',
  'discharge',
  'referral',
  'treatment_plan',
  'progress',
  'other',
]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const ReportStatusSchema = z.enum(['draft', 'review', 'approved', 'sent', 'signed']);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  patientName: z.string(),
  therapistId: UuidSchema.nullable(),
  therapistName: z.string(),
  therapistCrfa: z.string(),
  type: z.string(),
  status: z.string(),
  title: z.string(),
  content: z.string(),
  sections: z.unknown().nullable(),
  transcription: z.string().nullable(),
  periodStartDate: z.string().nullable(),
  periodEndDate: z.string().nullable(),
  appointmentId: UuidSchema.nullable(),
  reviewedBy: UuidSchema.nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewNotes: z.string().nullable(),
  approvedBy: UuidSchema.nullable(),
  approvedAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime().nullable(),
  sentTo: z.array(z.string()),
  signedAt: z.string().datetime().nullable(),
  signedBy: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Report = z.infer<typeof ReportSchema>;

export const CreateReportSchema = z.object({
  patientId: UuidSchema,
  patientName: z.string().min(1).max(200),
  therapistName: z.string().min(1).max(200),
  therapistCrfa: z.string().max(50).default(''),
  type: ReportTypeSchema,
  title: z.string().min(1).max(300),
  content: z.string().default(''),
  sections: z.unknown().optional(),
  appointmentId: UuidSchema.optional().nullable(),
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const UpdateReportSchema = z
  .object({
    title: z.string().min(1).max(300),
    content: z.string(),
    sections: z.unknown(),
    type: ReportTypeSchema,
    transcription: z.string().nullable(),
    periodStartDate: z.string().nullable(),
    periodEndDate: z.string().nullable(),
  })
  .partial();
export type UpdateReportInput = z.infer<typeof UpdateReportSchema>;

export const ReviewReportSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});
export type ReviewReportInput = z.infer<typeof ReviewReportSchema>;

export const SendReportSchema = z.object({
  recipients: z.array(z.string().email()).min(1),
});
export type SendReportInput = z.infer<typeof SendReportSchema>;

export const ListReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: UuidSchema.optional(),
  therapistId: UuidSchema.optional(),
  status: ReportStatusSchema.optional(),
  type: ReportTypeSchema.optional(),
});
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;
