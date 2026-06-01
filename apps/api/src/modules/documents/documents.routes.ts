import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UuidSchema, PaginatedResponseSchema, ErrorResponseSchema } from '@evolua/contracts';
import {
  DocumentSchema,
  CreateDocumentSchema,
  UpdateDocumentSchema,
  ListDocumentsQuerySchema,
} from '@evolua/contracts';
import { documentsService } from './documents.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Document not found' };

const documentsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['documents'],
        querystring: ListDocumentsQuerySchema,
        response: { 200: PaginatedResponseSchema(DocumentSchema) },
      },
    },
    async (req) => documentsService.list(await resolveClinicId(req.user.id), req.query),
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['documents'],
        body: CreateDocumentSchema,
        response: { 201: DocumentSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const d = await documentsService.create(clinicId, req.user.id, req.body);
      return rep.code(201).send(d);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['documents'],
        params: z.object({ id: UuidSchema }),
        body: UpdateDocumentSchema,
        response: { 200: DocumentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const d = await documentsService.update(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      return d ?? rep.code(404).send(notFound);
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['documents'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const d = await documentsService.remove(clinicId, req.params.id);
      if (!d) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );
};

export default documentsRoutes;
