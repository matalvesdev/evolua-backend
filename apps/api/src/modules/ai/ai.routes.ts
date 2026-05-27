import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AiChatRequestSchema,
  AiChatResponseSchema,
  GenerateEvolutionRequestSchema,
  GeneratedEvolutionSchema,
  GenerateReportRequestSchema,
  GenerateReportResponseSchema,
  MarketingGenerateRequestSchema,
  MarketingGenerateResponseSchema,
  LibraryDocumentListResponseSchema,
  LibraryIngestResponseSchema,
  LibraryIngestUrlRequestSchema,
  LibraryListQuerySchema,
  UuidSchema,
  ErrorResponseSchema,
} from '@evolua/contracts';
import { aiService } from './ai.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const aiRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.post(
    '/chat',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['ai'],
        body: AiChatRequestSchema,
        response: { 200: AiChatResponseSchema },
      },
    },
    async (req) => aiService.chat(req.body, req.user.id),
  );

  route.post(
    '/reports/generate',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        tags: ['ai'],
        body: GenerateReportRequestSchema,
        response: { 200: GenerateReportResponseSchema },
      },
    },
    async (req) => aiService.generateReport(req.body, req.user.id),
  );

  route.post(
    '/evolution/generate',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        tags: ['ai'],
        body: GenerateEvolutionRequestSchema,
        response: {
          200: GeneratedEvolutionSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        return await aiService.generateEvolution(req.body, req.user.id);
      } catch (e) {
        return reply.code(502).send({
          error: 'AiServiceError',
          message: e instanceof Error ? e.message : 'Falha ao gerar evolução',
        });
      }
    },
  );

  // ── Biblioteca clínica (RAG) ───────────────────────────────────────────

  route.get(
    '/library/documents',
    {
      schema: {
        tags: ['ai-library'],
        querystring: LibraryListQuerySchema,
        response: { 200: LibraryDocumentListResponseSchema },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return aiService.listLibraryDocuments(req.query, clinicId, req.user.id);
    },
  );

  route.post(
    '/library/ingest-url',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['ai-library'],
        body: LibraryIngestUrlRequestSchema,
        response: {
          200: LibraryIngestResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const clinicId = await resolveClinicId(req.user.id);
      try {
        return await aiService.ingestLibraryUrl(req.body, clinicId, req.user.id);
      } catch (e) {
        return reply.code(502).send({
          error: 'AiServiceError',
          message: e instanceof Error ? e.message : 'Falha ao ingerir documento',
        });
      }
    },
  );

  // Upload multipart — não usa Zod schema no body (binário).
  route.post(
    '/library/ingest-file',
    {
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
      schema: {
        tags: ['ai-library'],
        consumes: ['multipart/form-data'],
        response: {
          200: LibraryIngestResponseSchema,
          400: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const clinicId = await resolveClinicId(req.user.id);
      const data = await req.file();
      if (!data) {
        return reply.code(400).send({
          error: 'BadRequest',
          message: 'Arquivo ausente (campo "file")',
        });
      }
      const fields = data.fields as Record<
        string,
        { value?: string } | undefined
      >;
      const title = fields.title?.value?.toString();
      if (!title) {
        return reply.code(400).send({
          error: 'BadRequest',
          message: 'Campo "title" é obrigatório',
        });
      }
      const buffer = await data.toBuffer();

      try {
        return await aiService.ingestLibraryFile(
          buffer,
          data.filename,
          data.mimetype,
          {
            title,
            author: fields.author?.value?.toString(),
            specialty: fields.specialty?.value?.toString(),
            language: fields.language?.value?.toString() ?? 'pt-BR',
          },
          clinicId,
          req.user.id,
        );
      } catch (e) {
        return reply.code(502).send({
          error: 'AiServiceError',
          message: e instanceof Error ? e.message : 'Falha ao ingerir arquivo',
        });
      }
    },
  );

  route.delete(
    '/library/documents/:id',
    {
      schema: {
        tags: ['ai-library'],
        params: z.object({ id: UuidSchema }),
        response: {
          204: z.null(),
          502: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const clinicId = await resolveClinicId(req.user.id);
      try {
        await aiService.deleteLibraryDocument(req.params.id, clinicId, req.user.id);
        return reply.code(204).send(null);
      } catch (e) {
        return reply.code(502).send({
          error: 'AiServiceError',
          message: e instanceof Error ? e.message : 'Falha ao deletar documento',
        });
      }
    },
  );

  // ── Marketing ────────────────────────────────────────────────────────────

  route.post(
    '/marketing/generate',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['ai-marketing'],
        body: MarketingGenerateRequestSchema,
        response: {
          200: MarketingGenerateResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        return await aiService.generateMarketingContent(req.body, req.user.id);
      } catch (e) {
        return reply.code(502).send({
          error: 'AiServiceError',
          message: e instanceof Error ? e.message : 'Falha ao gerar conteúdo de marketing',
        });
      }
    },
  );

  // ── Suggested Questions ─────────────────────────────────────────────────

  route.get(
    '/suggested-questions',
    {
      schema: {
        tags: ['ai'],
        response: {
          200: z.array(z.string()),
        },
      },
    },
    async () => [
      'Como elaborar um relatório de evolução?',
      'Quais são os marcos do desenvolvimento infantil?',
      'Como conduzir uma anamnese de linguagem?',
      'O que é a escala MASA?',
      'Como identificar disfagia em idosos?',
      'Quais exercícios para motricidade orofacial?',
      'Como calcular o índice de desmame da sonda?',
      'O que é o protocolo FOIS?',
    ],
  );
};

export default aiRoutes;
