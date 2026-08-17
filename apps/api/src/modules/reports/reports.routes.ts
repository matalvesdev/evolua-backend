import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ReportSchema,
  CreateReportSchema,
  UpdateReportSchema,
  ReviewReportSchema,
  SendReportSchema,
  ListReportsQuerySchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { reportsService } from './reports.service.js';
import {
  requireClinicAdministration,
  requireResourceOwnerOrClinicAdmin,
  resolveClinicId,
} from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { reportToDTO } from './reports.mapper.js';

const notFound = { error: 'NotFound', message: 'Report not found' };

const reportsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['reports'],
        querystring: ListReportsQuerySchema,
        response: { 200: PaginatedResponseSchema(ReportSchema) },
      },
    },
    async (req) => reportsService.list(await resolveClinicId(req.user.id), req.query),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ReportSchema, 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await reportsService.findById(await resolveClinicId(req.user.id), req.params.id);
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['reports'],
        body: CreateReportSchema,
        response: { 201: ReportSchema, 403: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await reportsService.create(clinicId, req.user.id, req.body);
      auditAsync({
        clinicId, userId: req.user.id, action: 'CREATE', resource: 'Report',
        resourceId: r.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: r.patientId },
      });
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        body: UpdateReportSchema,
        response: { 200: ReportSchema, 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      try {
        const r = await reportsService.update(
          await resolveClinicId(req.user.id),
          req.user.id,
          req.params.id,
          req.body,
        );
        return r ?? rep.code(404).send(notFound);
      } catch (error) {
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 409) {
          return rep.code(409).send({ error: 'Conflict', message: error.message });
        }
        throw error;
      }
    },
  );

  route.post(
    '/:id/submit',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ReportSchema, 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await reportsService.submitForReview(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/review',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        body: ReviewReportSchema,
        response: { 200: ReportSchema, 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await reportsService.review(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.user.id,
        req.body,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/approve',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ReportSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await requireClinicAdministration(req.user.id);
      const r = await reportsService.approve(clinicId, req.params.id, req.user.id);
      if (r) auditAsync({
        clinicId, userId: req.user.id, action: 'SIGN', resource: 'Report',
        resourceId: r.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/send',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        body: SendReportSchema,
        response: { 200: ReportSchema, 404: ErrorResponseSchema, 501: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      try {
        const clinicId = await resolveClinicId(req.user.id);
        const r = await reportsService.send(clinicId, req.params.id, req.body);
        return r ?? rep.code(404).send(notFound);
      } catch (error) {
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 501) {
          return rep.code(501).send({ error: 'NotImplemented', message: error.message });
        }
        throw error;
      }
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      let r;
      try {
        r = await reportsService.remove(clinicId, req.user.id, req.params.id);
      } catch (error) {
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 409) {
          return rep.code(409).send({ error: 'Conflict', message: error.message });
        }
        throw error;
      }
      if (!r) return rep.code(404).send(notFound);
      auditAsync({
        clinicId, userId: req.user.id, action: 'DELETE', resource: 'Report',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );

  // ── Laudos ──────────────────────────────────────────────────────────────

  route.get(
    '/laudos',
    {
      schema: {
        tags: ['reports'],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
          patientId: UuidSchema.optional(),
          status: z.string().optional(),
        }),
        response: {
          200: PaginatedResponseSchema(ReportSchema),
        },
      },
    },
    async (req) => reportsService.listLaudos(await resolveClinicId(req.user.id), req.query),
  );

  route.post(
    '/laudos',
    {
      schema: {
        tags: ['reports'],
        body: z.object({
          patientId: UuidSchema,
          type: z.string().min(1),
          title: z.string().min(1).max(300),
          content: z.string().default(''),
        }),
        response: { 201: ReportSchema, 403: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await reportsService.createLaudo(clinicId, req.user.id, req.body);
      auditAsync({
        clinicId, userId: req.user.id, action: 'CREATE', resource: 'Report',
        resourceId: r.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: r.patientId, type: r.type },
      });
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/laudos/:id',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        body: z.object({
          title: z.string().min(1).max(300).optional(),
          content: z.string().optional(),
        }),
        response: { 200: ReportSchema, 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const existing = await prisma.report.findFirst({
        where: { id: req.params.id, clinicId, deletedAt: null, type: { in: ['laudo', 'atestado', 'declaracao', 'relatorio'] } },
        select: { id: true, status: true, therapistId: true },
      });
      if (!existing) return rep.code(404).send(notFound);
      await requireResourceOwnerOrClinicAdmin(req.user.id, existing.therapistId);
      if (['approved', 'sent', 'signed'].includes(existing.status)) {
        return rep.code(409).send({
          error: 'Conflict',
          message: 'Finalized clinical records cannot be changed',
        });
      }
      const updated = await prisma.report.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.title !== undefined && { title: req.body.title }),
          ...(req.body.content !== undefined && { content: req.body.content }),
        },
      });
      return reportToDTO(updated);
    },
  );

  route.delete(
    '/laudos/:id',
    {
      schema: {
        tags: ['reports'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const existing = await prisma.report.findFirst({
        where: { id: req.params.id, clinicId, deletedAt: null, type: { in: ['laudo', 'atestado', 'declaracao', 'relatorio'] } },
        select: { id: true, therapistId: true },
      });
      if (!existing) return rep.code(404).send(notFound);
      await requireResourceOwnerOrClinicAdmin(req.user.id, existing.therapistId);
      await reportsService.remove(clinicId, req.user.id, req.params.id);
      auditAsync({
        clinicId, userId: req.user.id, action: 'DELETE', resource: 'Report',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );
};

export default reportsRoutes;
