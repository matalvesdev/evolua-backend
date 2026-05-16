import { z } from 'zod';
import { UuidSchema } from './common.js';

// ============================================================================
// CAA — Comunicação Aumentativa e Alternativa
// ============================================================================

/** Célula individual de uma prancha CAA. */
export const CaaCellSchema = z.object({
  id: z.string().min(1).max(40),
  row: z.number().int().min(0).max(7),
  col: z.number().int().min(0).max(9),
  label: z.string().min(1).max(60),
  pictogramId: z.number().int().positive().optional(),
  /** URL absoluta para o PNG do pictograma (geralmente static.arasaac.org). */
  pictogramUrl: z.string().url().max(500).optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  /** Texto livre para ação opcional (ex: "abrir-emocoes"). */
  action: z.string().max(60).optional(),
});
export type CaaCell = z.infer<typeof CaaCellSchema>;

export const CaaCategoryEnum = z.enum([
  'Comunicação Básica',
  'Rotina Diária',
  'Alimentação',
  'Emoções',
  'Escola',
  'Família',
  'Atividades',
  'Vocabulário',
  'Frases',
  'Personalizado',
]);
export type CaaCategory = z.infer<typeof CaaCategoryEnum>;

export const CaaBoardSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  therapistId: UuidSchema,
  patientId: UuidSchema.nullable(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  rows: z.number().int().min(1).max(8),
  cols: z.number().int().min(1).max(10),
  cells: z.array(CaaCellSchema),
  category: z.string().max(60),
  therapeuticObjective: z.string().max(120).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CaaBoard = z.infer<typeof CaaBoardSchema>;

export const CreateCaaBoardSchema = z.object({
  patientId: UuidSchema.optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  rows: z.number().int().min(1).max(8).default(3),
  cols: z.number().int().min(1).max(10).default(5),
  cells: z.array(CaaCellSchema).default([]),
  category: z.string().max(60).default('Personalizado'),
  therapeuticObjective: z.string().max(120).optional(),
});
export type CreateCaaBoardInput = z.infer<typeof CreateCaaBoardSchema>;

export const UpdateCaaBoardSchema = z.object({
  patientId: UuidSchema.nullable().optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  rows: z.number().int().min(1).max(8).optional(),
  cols: z.number().int().min(1).max(10).optional(),
  cells: z.array(CaaCellSchema).optional(),
  category: z.string().max(60).optional(),
  therapeuticObjective: z.string().max(120).nullable().optional(),
});
export type UpdateCaaBoardInput = z.infer<typeof UpdateCaaBoardSchema>;

export const ListCaaBoardsQuerySchema = z.object({
  patientId: UuidSchema.optional(),
  category: z.string().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListCaaBoardsQuery = z.infer<typeof ListCaaBoardsQuerySchema>;

// ============================================================================
// ARASAAC — proxy de pictogramas
// ============================================================================

export const ArasaacKeywordSchema = z.object({
  keyword: z.string(),
  type: z.number().int().optional(),
  plural: z.string().optional(),
  meaning: z.string().optional(),
});

export const ArasaacPictogramSchema = z.object({
  _id: z.number().int(),
  keywords: z.array(ArasaacKeywordSchema),
  categories: z.array(z.string()).optional(),
  schematic: z.boolean().optional(),
  sex: z.boolean().optional(),
  violence: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  synsets: z.array(z.string()).optional(),
});
export type ArasaacPictogram = z.infer<typeof ArasaacPictogramSchema>;

export const ArasaacSearchQuerySchema = z.object({
  q: z.string().min(2).max(60),
  lang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']).default('pt'),
});
export type ArasaacSearchQuery = z.infer<typeof ArasaacSearchQuerySchema>;
