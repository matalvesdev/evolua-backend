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
} from '@evolua/contracts';
import { patientsService } from './patients.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';

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
      const clinicId = await resolveClinicId(req.user.id);
      const removed = await patientsService.remove(clinicId, req.params.id);
      if (!removed) return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
      auditAsync({
        clinicId, userId: req.user.id, action: 'DELETE', resource: 'Patient',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );
};

export default patientsRoutes;
