import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  TaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  ListTasksQuerySchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { tasksService } from './tasks.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Task not found' };

const tasksRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['tasks'],
        querystring: ListTasksQuerySchema,
        response: { 200: PaginatedResponseSchema(TaskSchema) },
      },
    },
    async (req) => tasksService.list(await resolveClinicId(req.user.id), req.query),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['tasks'],
        params: z.object({ id: UuidSchema }),
        response: { 200: TaskSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await tasksService.findById(await resolveClinicId(req.user.id), req.params.id);
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['tasks'],
        body: CreateTaskSchema,
        response: { 201: TaskSchema },
      },
    },
    async (req, rep) => {
      const r = await tasksService.create(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      );
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['tasks'],
        params: z.object({ id: UuidSchema }),
        body: UpdateTaskSchema,
        response: { 200: TaskSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await tasksService.update(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/:id/complete',
    {
      schema: {
        tags: ['tasks'],
        params: z.object({ id: UuidSchema }),
        response: { 200: TaskSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await tasksService.complete(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['tasks'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await tasksService.remove(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      if (!ok) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );
};

export default tasksRoutes;
