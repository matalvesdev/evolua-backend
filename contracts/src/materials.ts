import { z } from 'zod';
import { UuidSchema } from './common.js';

// ============================================================================
// THERAPEUTIC MATERIALS — Biblioteca + Gerador IA
// ============================================================================

/** Áreas clínicas suportadas pelo gerador. */
export const TherapyAreaEnum = z.enum([
  'linguagem',
  'fala',
  'fluencia',
  'voz',
  'degluticao',
  'fonologia',
  'mof',
  'tea',
  'caa',
]);
export type TherapyArea = z.infer<typeof TherapyAreaEnum>;

/** Formato do material gerado/salvo. */
export const MaterialFormatEnum = z.enum([
  'atividade',
  'brincadeira',
  'jogo',
  'historia',
  'exercicio',
  'roteiro',
]);
export type MaterialFormat = z.infer<typeof MaterialFormatEnum>;

/** Faixas etárias suportadas. */
export const AgeGroupEnum = z.enum(['bebe', 'infantil', 'escolar', 'adolescente', 'adulto']);
export type AgeGroup = z.infer<typeof AgeGroupEnum>;

// ── DTO de material salvo na biblioteca ──────────────────────────────────────

export const MaterialSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  therapistId: UuidSchema,
  title: z.string().min(1).max(160),
  description: z.string().max(1000).nullable(),
  area: TherapyAreaEnum,
  format: MaterialFormatEnum,
  ageGroup: AgeGroupEnum.nullable(),
  content: z.string(),
  objectives: z.array(z.string().max(280)),
  materialsNeeded: z.array(z.string().max(280)),
  durationMinutes: z.number().int().min(1).max(180).nullable(),
  tags: z.array(z.string().max(40)),
  fileUrl: z.string().url().max(500).nullable(),
  isPublic: z.boolean(),
  isAiGenerated: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const CreateMaterialSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  area: TherapyAreaEnum,
  format: MaterialFormatEnum,
  ageGroup: AgeGroupEnum.optional(),
  content: z.string().min(1).max(20_000),
  objectives: z.array(z.string().max(280)).max(20).default([]),
  materialsNeeded: z.array(z.string().max(280)).max(30).default([]),
  durationMinutes: z.number().int().min(1).max(180).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  fileUrl: z.string().url().max(500).optional(),
  isPublic: z.boolean().default(false),
  isAiGenerated: z.boolean().default(false),
});
export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;

export const UpdateMaterialSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).nullable().optional(),
  area: TherapyAreaEnum.optional(),
  format: MaterialFormatEnum.optional(),
  ageGroup: AgeGroupEnum.nullable().optional(),
  content: z.string().min(1).max(20_000).optional(),
  objectives: z.array(z.string().max(280)).max(20).optional(),
  materialsNeeded: z.array(z.string().max(280)).max(30).optional(),
  durationMinutes: z.number().int().min(1).max(180).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  fileUrl: z.string().url().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateMaterialInput = z.infer<typeof UpdateMaterialSchema>;

export const ListMaterialsQuerySchema = z.object({
  area: TherapyAreaEnum.optional(),
  format: MaterialFormatEnum.optional(),
  ageGroup: AgeGroupEnum.optional(),
  aiOnly: z.coerce.boolean().optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMaterialsQuery = z.infer<typeof ListMaterialsQuerySchema>;

// ── Gerador IA ───────────────────────────────────────────────────────────────

export const GenerateMaterialRequestSchema = z.object({
  area: TherapyAreaEnum,
  format: MaterialFormatEnum,
  age: AgeGroupEnum,
  context: z.string().max(1500).optional(),
});
export type GenerateMaterialRequest = z.infer<typeof GenerateMaterialRequestSchema>;

export const GeneratedMaterialSchema = z.object({
  title: z.string(),
  content: z.string(),
  objectives: z.array(z.string()),
  materialsNeeded: z.array(z.string()),
  durationMinutes: z.number().int().nullable(),
  instructions: z.string(),
});
export type GeneratedMaterial = z.infer<typeof GeneratedMaterialSchema>;
