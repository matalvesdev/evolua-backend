import { z } from 'zod';

// System instructions are server-owned. Client history can only represent a
// prior user/assistant exchange and must not override RAG policy.
export const ChatRoleEnum = z.enum(['user', 'assistant']);

export const ChatMessageSchema = z.object({
  role: ChatRoleEnum,
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AiChatRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z.array(ChatMessageSchema).max(10).default([]),
  specialty: z.string().max(100).optional(),
});
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export const ChatCitationSchema = z.object({
  source: z.string(),
  title: z.string().optional(),
  source_url: z.string().url().optional(),
  page: z.number().int().nullable().optional(),
  snippet: z.string().optional(),
  similarity: z.number().optional(),
});
export type ChatCitation = z.infer<typeof ChatCitationSchema>;

export const AiChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(ChatCitationSchema).default([]),
  latency_ms: z.number().optional(),
  model: z.string().optional(),
});
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;

// ── Geração de relatório a partir de transcrição ────────────────────────────
export const ReportTemplateEnum = z.enum([
  'resumo',
  'evolucao-mensal',
  'encaminhamento',
  'avaliacao-inicial',
  'alta',
]);
export type ReportTemplate = z.infer<typeof ReportTemplateEnum>;

export const GenerateReportRequestSchema = z.object({
  patientId: z.string().uuid(),
  transcription: z.string().min(10).max(50000),
  template: ReportTemplateEnum,
});
export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;

export const ReportSectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  content: z.string(),
  isAIGenerated: z.boolean().optional(),
  hasHighlights: z.boolean().optional(),
});
export type ReportSection = z.infer<typeof ReportSectionSchema>;

export const GenerateReportResponseSchema = z.object({
  success: z.boolean(),
  sections: z.array(ReportSectionSchema).optional(),
  error: z.string().optional(),
});
export type GenerateReportResponse = z.infer<typeof GenerateReportResponseSchema>;

// ── Geração de evolução SOAP a partir de transcript ─────────────────────────
export const GenerateEvolutionRequestSchema = z.object({
  patientId: z.string().uuid(),
  transcript: z.string().max(50000).optional(),
  therapistNotes: z.string().max(10000).optional(),
  treatmentPlanSummary: z.string().max(5000).optional(),
}).refine(
  (v) => Boolean((v.transcript && v.transcript.trim()) || (v.therapistNotes && v.therapistNotes.trim())),
  { message: 'Forneça transcript e/ou therapistNotes' },
);
export type GenerateEvolutionRequest = z.infer<typeof GenerateEvolutionRequestSchema>;

export const SoapSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});
export type Soap = z.infer<typeof SoapSchema>;

export const GeneratedEvolutionSchema = z.object({
  soap: SoapSchema,
  summary: z.string(),
  nextSessionSuggestions: z.array(z.string()).default([]),
});
export type GeneratedEvolution = z.infer<typeof GeneratedEvolutionSchema>;

// ── Biblioteca clínica (RAG) ────────────────────────────────────────────────
export const LibraryDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  source: z.string(),
  source_url: z.string().url().nullable().optional(),
  author: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  language: z.string(),
  chunk_count: z.number().int(),
  created_at: z.string(),
});
export type LibraryDocument = z.infer<typeof LibraryDocumentSchema>;

export const LibraryDocumentListResponseSchema = z.object({
  items: z.array(LibraryDocumentSchema),
  total: z.number().int(),
});
export type LibraryDocumentListResponse = z.infer<
  typeof LibraryDocumentListResponseSchema
>;

export const LibraryIngestUrlRequestSchema = z.object({
  source_url: z.string().url(),
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional(),
  specialty: z.string().max(100).optional(),
  language: z.string().min(2).max(10).default('pt-BR'),
});
export type LibraryIngestUrlRequest = z.infer<typeof LibraryIngestUrlRequestSchema>;

export const LibraryIngestResponseSchema = z.object({
  documentId: z.string().uuid(),
  chunks: z.number().int(),
  latencyMs: z.number().int(),
});
export type LibraryIngestResponse = z.infer<typeof LibraryIngestResponseSchema>;

export const LibraryListQuerySchema = z.object({
  specialty: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type LibraryListQuery = z.infer<typeof LibraryListQuerySchema>;
