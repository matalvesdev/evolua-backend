import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  CaaBoardSchema,
  CreateCaaBoardSchema,
  UpdateCaaBoardSchema,
  ListCaaBoardsQuerySchema,
  ArasaacPictogramSchema,
  ArasaacSearchQuerySchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { caaService } from './caa.service.js';
import { caaMapper } from './caa.mapper.js';
import { arasaacService } from './arasaac.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';

const notFound = { error: 'NotFound', message: 'CAA board not found' };

const caaRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  // ── Boards CRUD ────────────────────────────────────────────────────────────
  route.get(
    '/boards',
    {
      schema: {
        tags: ['caa'],
        querystring: ListCaaBoardsQuerySchema,
        response: { 200: PaginatedResponseSchema(CaaBoardSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await caaService.list(clinicId, req.user.id, req.query);
      return { data: r.data.map((b) => caaMapper.toDto(b)), pagination: r.pagination };
    },
  );

  route.get(
    '/boards/:id',
    {
      schema: {
        tags: ['caa'],
        params: z.object({ id: UuidSchema }),
        response: { 200: CaaBoardSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const b = await caaService.findOne(clinicId, req.user.id, req.params.id);
      if (!b) return rep.code(404).send(notFound);
      return caaMapper.toDto(b);
    },
  );

  route.post(
    '/boards',
    {
      schema: {
        tags: ['caa'],
        body: CreateCaaBoardSchema,
        response: { 201: CaaBoardSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const b = await caaService.create(clinicId, req.user.id, req.body);
      auditAsync({
        clinicId,
        userId: req.user.id,
        action: 'CREATE',
        resource: 'CaaBoard',
        resourceId: b.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: req.body.patientId ?? null, category: req.body.category ?? null },
      });
      return rep.code(201).send(caaMapper.toDto(b));
    },
  );

  route.patch(
    '/boards/:id',
    {
      schema: {
        tags: ['caa'],
        params: z.object({ id: UuidSchema }),
        body: UpdateCaaBoardSchema,
        response: { 200: CaaBoardSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      try {
        const b = await caaService.update(clinicId, req.user.id, req.params.id, req.body);
        auditAsync({
          clinicId,
          userId: req.user.id,
          action: 'UPDATE',
          resource: 'CaaBoard',
          resourceId: b.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        });
        return caaMapper.toDto(b);
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) {
          return rep.code(404).send(notFound);
        }
        throw err;
      }
    },
  );

  route.delete(
    '/boards/:id',
    {
      schema: {
        tags: ['caa'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const ok = await caaService.remove(clinicId, req.user.id, req.params.id);
      if (!ok) return rep.code(404).send(notFound);
      auditAsync({
        clinicId,
        userId: req.user.id,
        action: 'DELETE',
        resource: 'CaaBoard',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );

  // ── ARASAAC pictogram proxy (cache 5min, rate 30/min) ──────────────────────
  route.get(
    '/pictograms/search',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['caa'],
        querystring: ArasaacSearchQuerySchema,
        response: { 200: z.array(ArasaacPictogramSchema) },
      },
    },
    async (req) => {
      return arasaacService.search(req.query.q, req.query.lang);
    },
  );
};

export default caaRoutes;
