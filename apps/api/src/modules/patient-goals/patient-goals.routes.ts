import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  PatientGoalSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  GoalSnapshotSchema,
  RegisterSnapshotSchema,
  GoalMilestoneSchema,
  CreateMilestoneSchema,
  ErrorResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { patientGoalsService } from './patient-goals.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Goal not found' };

const patientGoalsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['patient-goals'],
        querystring: z.object({ patientId: UuidSchema.optional() }),
        response: { 200: z.array(PatientGoalSchema) },
      },
    },
    async (req) =>
      patientGoalsService.list(await resolveClinicId(req.user.id), req.query.patientId),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        response: { 200: PatientGoalSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.findById(
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
        tags: ['patient-goals'],
        body: CreateGoalSchema,
        response: { 201: PatientGoalSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.create(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      );
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        body: UpdateGoalSchema,
        response: { 200: PatientGoalSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.update(
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
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await patientGoalsService.remove(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      if (!ok) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );

  // Snapshots
  route.get(
    '/:id/snapshots',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        response: { 200: z.array(GoalSnapshotSchema), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.listSnapshots(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/snapshots',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        body: RegisterSnapshotSchema,
        response: { 201: GoalSnapshotSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.registerSnapshot(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.user.id,
        req.body,
      );
      if (!r) return rep.code(404).send(notFound);
      return rep.code(201).send(r);
    },
  );

  // Milestones
  route.get(
    '/:id/milestones',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        response: { 200: z.array(GoalMilestoneSchema), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.listMilestones(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/milestones',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ id: UuidSchema }),
        body: CreateMilestoneSchema,
        response: { 201: GoalMilestoneSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.createMilestone(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      if (!r) return rep.code(404).send(notFound);
      return rep.code(201).send(r);
    },
  );

  route.post(
    '/milestones/:milestoneId/toggle',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ milestoneId: UuidSchema }),
        response: { 200: GoalMilestoneSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientGoalsService.toggleMilestone(
        await resolveClinicId(req.user.id),
        req.params.milestoneId,
      );
      return r ?? rep.code(404).send({ error: 'NotFound', message: 'Milestone not found' });
    },
  );

  route.delete(
    '/milestones/:milestoneId',
    {
      schema: {
        tags: ['patient-goals'],
        params: z.object({ milestoneId: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await patientGoalsService.deleteMilestone(
        await resolveClinicId(req.user.id),
        req.params.milestoneId,
      );
      if (!ok) return rep.code(404).send({ error: 'NotFound', message: 'Milestone not found' });
      return rep.code(204).send(null);
    },
  );
};

export default patientGoalsRoutes;
