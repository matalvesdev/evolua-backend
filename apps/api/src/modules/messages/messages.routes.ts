import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateMessageSchema,
  ListMessagesQuerySchema,
  MessageSchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
} from '@evolua/contracts';
import { messagesService } from './messages.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { messageMapper } from './messages.mapper.js';

const messagesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.post(
    '/',
    {
      schema: {
        tags: ['messages'],
        body: CreateMessageSchema,
        response: { 201: MessageSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const m = await messagesService.create(clinicId, req.user.id, req.body);
      return rep.code(201).send(messageMapper.toDto(m));
    },
  );

  route.get(
    '/',
    {
      schema: {
        tags: ['messages'],
        querystring: ListMessagesQuerySchema,
        response: { 200: PaginatedResponseSchema(MessageSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await messagesService.list(clinicId, req.query);
      return { data: r.data.map(messageMapper.toDto), pagination: r.pagination };
    },
  );
};

export default messagesRoutes;
