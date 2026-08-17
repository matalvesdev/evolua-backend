import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ClinicalProtocolTemplateSchema,
  ClinicalProtocolEntrySchema,
  CreateProtocolEntrySchema,
  ErrorResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { clinicalProtocolsService } from './clinical-protocols.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const clinicalProtocolsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/templates',
    {
      schema: {
        tags: ['clinical-protocols'],
        querystring: z.object({ area: z.string().optional() }),
        response: { 200: z.array(ClinicalProtocolTemplateSchema) },
      },
    },
    async (req) => clinicalProtocolsService.listTemplates(req.query.area),
  );

  route.get(
    '/templates/:id',
    {
      schema: {
        tags: ['clinical-protocols'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ClinicalProtocolTemplateSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await clinicalProtocolsService.findTemplate(req.params.id);
      return r ?? rep.code(404).send({ error: 'NotFound', message: 'Template not found' });
    },
  );

  route.get(
    '/entries',
    {
      schema: {
        tags: ['clinical-protocols'],
        querystring: z.object({
          patientId: UuidSchema.optional(),
          templateId: UuidSchema.optional(),
        }),
        response: { 200: z.array(ClinicalProtocolEntrySchema) },
      },
    },
    async (req) =>
      clinicalProtocolsService.listEntries(
        await resolveClinicId(req.user.id),
        req.query.patientId,
        req.query.templateId,
      ),
  );

  route.post(
    '/entries',
    {
      schema: {
        tags: ['clinical-protocols'],
        body: CreateProtocolEntrySchema,
        response: { 201: ClinicalProtocolEntrySchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await clinicalProtocolsService.createEntry(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      );
      return r
        ? rep.code(201).send(r)
        : rep.code(404).send({ error: 'NotFound', message: 'Patient, template, plan or appointment not found' });
    },
  );

  route.delete(
    '/entries/:id',
    {
      schema: {
        tags: ['clinical-protocols'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await clinicalProtocolsService.deleteEntry(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.params.id,
      );
      if (!ok) return rep.code(404).send({ error: 'NotFound', message: 'Entry not found' });
      return rep.code(204).send(null);
    },
  );
};

export default clinicalProtocolsRoutes;
