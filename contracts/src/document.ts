import { z } from 'zod';
import { UuidSchema } from './common.js';

export const DocumentSchema = z.object({
  id: UuidSchema,
  patientId: UuidSchema,
  patientName: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  status: z.enum(['draft', 'final']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const CreateDocumentSchema = z.object({
  patientId: UuidSchema,
  patientName: z.string().min(1).max(200),
  type: z.enum(['referral', 'prescription', 'document']),
  title: z.string().min(1).max(300),
  content: z.string().optional(),
});
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export const UpdateDocumentSchema = z
  .object({
    patientId: UuidSchema,
    patientName: z.string().min(1).max(200),
    type: z.enum(['referral', 'prescription', 'document']),
    title: z.string().min(1).max(300),
    content: z.string(),
  })
  .partial();
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;

export const ListDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: UuidSchema.optional(),
});
export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuerySchema>;
