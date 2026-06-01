import { z } from 'zod';
import { UuidSchema } from './common.js';

export const DocumentTemplateTypeEnum = z.enum(['laudo', 'encaminhamento', 'parecer', 'atestado']);
export type DocumentTemplateType = z.infer<typeof DocumentTemplateTypeEnum>;

export const DocumentTemplateSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema.nullable(),
  title: z.string(),
  type: z.string(),
  subtype: z.string().nullable(),
  content: z.string(),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>;

export const CreateDocumentTemplateSchema = z.object({
  title: z.string().min(1).max(300),
  type: DocumentTemplateTypeEnum,
  subtype: z.string().max(100).optional().nullable(),
  content: z.string().min(1),
});
export type CreateDocumentTemplateInput = z.infer<typeof CreateDocumentTemplateSchema>;

export const UpdateDocumentTemplateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  type: DocumentTemplateTypeEnum.optional(),
  subtype: z.string().max(100).optional().nullable(),
  content: z.string().min(1).optional(),
});
export type UpdateDocumentTemplateInput = z.infer<typeof UpdateDocumentTemplateSchema>;

export const ListDocumentTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: DocumentTemplateTypeEnum.optional(),
  clinicId: UuidSchema.optional(),
});
export type ListDocumentTemplatesQuery = z.infer<typeof ListDocumentTemplatesQuerySchema>;
