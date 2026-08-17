import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  ListPatientsQuerySchema,
  PatientSchema,
  UuidSchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  CreateMedicalRecordSchema,
  UpdateMedicalRecordSchema,
  ListMedicalRecordsQuerySchema,
  MedicalRecordListSchema,
} from '@evolua/contracts';
import { patientsService } from './patients.service.js';
import { requireClinicAdministration, resolveClinicId } from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';

const patientsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  // todas as rotas exigem JWT válido
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['patients'],
        summary: 'Lista pacientes da clínica',
        querystring: ListPatientsQuerySchema,
        response: {
          200: PaginatedResponseSchema(PatientSchema.partial()),
          401: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return patientsService.list(clinicId, req.query);
    },
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['patients'],
        summary: 'Busca paciente por ID',
        params: z.object({ id: UuidSchema }),
        response: {
          200: PatientSchema.partial(),
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const patient = await patientsService.findById(clinicId, req.params.id);
      if (!patient) return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
      return patient;
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['patients'],
        summary: 'Cria novo paciente',
        body: CreatePatientSchema,
        response: { 201: PatientSchema.partial() },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const created = await patientsService.create(clinicId, req.body);
      auditAsync({
        clinicId, userId: req.user.id, action: 'CREATE', resource: 'Patient',
        resourceId: created.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(201).send(created);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['patients'],
        summary: 'Atualiza paciente',
        params: z.object({ id: UuidSchema }),
        body: UpdatePatientSchema,
        response: {
          200: PatientSchema.partial(),
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const updated = await patientsService.update(clinicId, req.params.id, req.body);
      if (!updated) return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
      auditAsync({
        clinicId, userId: req.user.id, action: 'UPDATE', resource: 'Patient',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { fields: Object.keys(req.body) },
      });
      return updated;
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['patients'],
        summary: 'Soft-delete de paciente',
        params: z.object({ id: UuidSchema }),
        response: {
          204: z.null(),
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const clinicId = await requireClinicAdministration(req.user.id);
      const removed = await patientsService.remove(clinicId, req.params.id);
      if (!removed) return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
      auditAsync({
        clinicId, userId: req.user.id, action: 'DELETE', resource: 'Patient',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );

  // ── Records (evoluções) ─────────────────────────────────────────────────

  route.get(
    '/records',
    {
      schema: {
        tags: ['patients'],
        summary: 'Lista prontuários clínicos persistentes',
        querystring: ListMedicalRecordsQuerySchema,
        response: { 200: MedicalRecordListSchema },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return patientsService.listRecords(clinicId, req.query);
    },
  );

  route.post(
    '/records',
    {
      schema: {
        tags: ['patients'],
        summary: 'Cria ou inicializa prontuário clínico',
        body: CreateMedicalRecordSchema,
        response: { 201: z.object({ id: UuidSchema }), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await patientsService.createRecord(clinicId, req.user.id, req.body);
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
      auditAsync({
        clinicId, userId: req.user.id, action: 'CREATE', resource: 'MedicalRecord',
        resourceId: r.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: r.patientId },
      });
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/records/:id',
    {
      schema: {
        tags: ['patients'],
        summary: 'Atualiza prontuário clínico',
        params: z.object({ id: UuidSchema }),
        body: UpdateMedicalRecordSchema,
        response: { 200: z.object({ id: UuidSchema }), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientsService.updateRecord(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.params.id,
        req.body,
      );
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Record not found' });
      auditAsync({
        clinicId: r.clinicId, userId: req.user.id, action: 'UPDATE', resource: 'MedicalRecord',
        resourceId: r.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { fields: Object.keys(req.body) },
      });
      return r;
    },
  );

  // ── Timeline ────────────────────────────────────────────────────────────

  const TimelineEventSchema = z.object({
    id: z.string(),
    date: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    score: z.number().optional(),
    area: z.string().optional(),
    tag: z.string().optional(),
  });

  route.get(
    '/:patientId/timeline',
    {
      schema: {
        tags: ['patients'],
        summary: 'Linha do tempo do paciente',
        params: z.object({ patientId: UuidSchema }),
        response: { 200: z.array(TimelineEventSchema), 500: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      try {
        const clinicId = await resolveClinicId(req.user.id);
        return patientsService.getTimeline(clinicId, req.params.patientId);
      } catch {
        logger.error('patients: timeline error');
        return rep.code(500).send({ error: 'InternalError', message: 'Falha ao carregar timeline' });
      }
    },
  );
};

export default patientsRoutes;
