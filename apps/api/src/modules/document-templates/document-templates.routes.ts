import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  DocumentTemplateSchema,
  CreateDocumentTemplateSchema,
  UpdateDocumentTemplateSchema,
  ListDocumentTemplatesQuerySchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { documentTemplatesService } from './document-templates.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Document template not found' };

const documentTemplatesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['document-templates'],
        querystring: ListDocumentTemplatesQuerySchema,
        response: { 200: PaginatedResponseSchema(DocumentTemplateSchema) },
      },
    },
    async (req) => documentTemplatesService.list(await resolveClinicId(req.user.id), req.query),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['document-templates'],
        params: z.object({ id: UuidSchema }),
        response: { 200: DocumentTemplateSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await documentTemplatesService.findById(await resolveClinicId(req.user.id), req.params.id);
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['document-templates'],
        body: CreateDocumentTemplateSchema,
        response: { 201: DocumentTemplateSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await documentTemplatesService.create(clinicId, req.body);
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['document-templates'],
        params: z.object({ id: UuidSchema }),
        body: UpdateDocumentTemplateSchema,
        response: { 200: DocumentTemplateSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await documentTemplatesService.update(
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
        tags: ['document-templates'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await documentTemplatesService.remove(clinicId, req.params.id);
      if (!r) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );
};

export default documentTemplatesRoutes;
