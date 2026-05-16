import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  MaterialSchema,
  CreateMaterialSchema,
  UpdateMaterialSchema,
  ListMaterialsQuerySchema,
  GenerateMaterialRequestSchema,
  GeneratedMaterialSchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { materialsService } from './materials.service.js';
import { materialsMapper } from './materials.mapper.js';
import { aiService } from '../ai/ai.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';

const notFound = { error: 'NotFound', message: 'Material not found' };

const materialsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  // ── Listar ─────────────────────────────────────────────────────────────────
  route.get(
    '/',
    {
      schema: {
        tags: ['materials'],
        querystring: ListMaterialsQuerySchema,
        response: { 200: PaginatedResponseSchema(MaterialSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await materialsService.list(clinicId, req.user.id, req.query);
      return { data: r.data.map((m) => materialsMapper.toDto(m)), pagination: r.pagination };
    },
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['materials'],
        params: z.object({ id: UuidSchema }),
        response: { 200: MaterialSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const m = await materialsService.findOne(clinicId, req.user.id, req.params.id);
      if (!m) return rep.code(404).send(notFound);
      return materialsMapper.toDto(m);
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['materials'],
        body: CreateMaterialSchema,
        response: { 201: MaterialSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const m = await materialsService.create(clinicId, req.user.id, req.body);
      auditAsync({
        clinicId,
        userId: req.user.id,
        action: 'CREATE',
        resource: 'TherapeuticMaterial',
        resourceId: m.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: {
          area: req.body.area,
          format: req.body.format,
          isAiGenerated: req.body.isAiGenerated ?? false,
        },
      });
      return rep.code(201).send(materialsMapper.toDto(m));
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['materials'],
        params: z.object({ id: UuidSchema }),
        body: UpdateMaterialSchema,
        response: { 200: MaterialSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      try {
        const m = await materialsService.update(clinicId, req.user.id, req.params.id, req.body);
        auditAsync({
          clinicId,
          userId: req.user.id,
          action: 'UPDATE',
          resource: 'TherapeuticMaterial',
          resourceId: m.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        });
        return materialsMapper.toDto(m);
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) {
          return rep.code(404).send(notFound);
        }
        throw err;
      }
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['materials'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const ok = await materialsService.remove(clinicId, req.user.id, req.params.id);
      if (!ok) return rep.code(404).send(notFound);
      auditAsync({
        clinicId,
        userId: req.user.id,
        action: 'DELETE',
        resource: 'TherapeuticMaterial',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );

  // ── Geração IA (proxy, NÃO persiste) ───────────────────────────────────────
  route.post(
    '/generate',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        tags: ['materials'],
        body: GenerateMaterialRequestSchema,
        response: { 200: GeneratedMaterialSchema, 502: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      try {
        const result = await aiService.generateMaterial(req.body, req.user.id);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI service error';
        return rep.code(502).send({ error: 'AIServiceError', message: msg });
      }
    },
  );
};

export default materialsRoutes;
