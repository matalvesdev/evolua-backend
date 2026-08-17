import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ExerciseTemplateSchema,
  CreateExerciseSchema,
  UpdateExerciseSchema,
  PatientExercisePrescriptionSchema,
  PrescribeExerciseSchema,
  ErrorResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { exercisesService } from './exercises.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Exercise not found' };

const exercisesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['exercises'],
        querystring: z.object({
          area: z.string().optional(),
          subarea: z.string().optional(),
        }),
        response: { 200: z.array(ExerciseTemplateSchema) },
      },
    },
    async (req) =>
      exercisesService.list(
        await resolveClinicId(req.user.id),
        req.query.area,
        req.query.subarea,
      ),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['exercises'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ExerciseTemplateSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await exercisesService.findById(
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
        tags: ['exercises'],
        body: CreateExerciseSchema,
        response: { 201: ExerciseTemplateSchema },
      },
    },
    async (req, rep) => {
      const r = await exercisesService.create(
        await resolveClinicId(req.user.id),
        req.body,
      );
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['exercises'],
        params: z.object({ id: UuidSchema }),
        body: UpdateExerciseSchema,
        response: { 200: ExerciseTemplateSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await exercisesService.update(
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
        tags: ['exercises'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await exercisesService.remove(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      if (!ok) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );

  // Prescriptions
  route.get(
    '/prescriptions',
    {
      schema: {
        tags: ['exercises'],
        querystring: z.object({ patientId: UuidSchema.optional() }),
        response: { 200: z.array(PatientExercisePrescriptionSchema) },
      },
    },
    async (req) =>
      exercisesService.listPrescriptions(
        await resolveClinicId(req.user.id),
        req.query.patientId,
      ),
  );

  route.post(
    '/prescriptions',
    {
      schema: {
        tags: ['exercises'],
        body: PrescribeExerciseSchema,
        response: { 201: PatientExercisePrescriptionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await exercisesService.prescribe(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      );
      if (!r) {
        return rep.code(404).send({
          error: 'NotFound',
          message: 'Patient, exercise or plan not found',
        });
      }
      return rep.code(201).send(r);
    },
  );

  route.post(
    '/prescriptions/:id/cancel',
    {
      schema: {
        tags: ['exercises'],
        params: z.object({ id: UuidSchema }),
        response: { 200: PatientExercisePrescriptionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await exercisesService.cancelPrescription(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send({ error: 'NotFound', message: 'Prescription not found' });
    },
  );
};

export default exercisesRoutes;
