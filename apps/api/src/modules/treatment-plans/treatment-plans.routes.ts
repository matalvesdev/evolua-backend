import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  TreatmentPlanSchema,
  CreateTreatmentPlanSchema,
  UpdateTreatmentPlanSchema,
  TreatmentSessionSchema,
  RegisterSessionSchema,
  ErrorResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { treatmentPlansService } from './treatment-plans.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Treatment plan not found' };

const treatmentPlansRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['treatment-plans'],
        querystring: z.object({ patientId: UuidSchema.optional() }),
        response: { 200: z.array(TreatmentPlanSchema) },
      },
    },
    async (req) =>
      treatmentPlansService.list(await resolveClinicId(req.user.id), req.query.patientId),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['treatment-plans'],
        params: z.object({ id: UuidSchema }),
        response: { 200: TreatmentPlanSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await treatmentPlansService.findById(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['treatment-plans'],
        body: CreateTreatmentPlanSchema,
        response: { 201: TreatmentPlanSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await treatmentPlansService.create(
        await resolveClinicId(req.user.id),
        req.body,
      );
      if (!r) {
        return rep.code(404).send({
          error: 'NotFound',
          message: 'Patient or therapist not found in this clinic',
        });
      }
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['treatment-plans'],
        params: z.object({ id: UuidSchema }),
        body: UpdateTreatmentPlanSchema,
        response: { 200: TreatmentPlanSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await treatmentPlansService.update(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['treatment-plans'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await treatmentPlansService.remove(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      if (!ok) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );

  route.get(
    '/:id/sessions',
    {
      schema: {
        tags: ['treatment-plans'],
        params: z.object({ id: UuidSchema }),
        response: { 200: z.array(TreatmentSessionSchema), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await treatmentPlansService.listSessions(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/sessions',
    {
      schema: {
        tags: ['treatment-plans'],
        params: z.object({ id: UuidSchema }),
        body: RegisterSessionSchema,
        response: { 201: TreatmentSessionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await treatmentPlansService.registerSession(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      if (!r) return rep.code(404).send(notFound);
      return rep.code(201).send(r);
    },
  );
};

export default treatmentPlansRoutes;
