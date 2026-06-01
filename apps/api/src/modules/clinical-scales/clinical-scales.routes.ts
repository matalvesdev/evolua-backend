import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ClinicalScaleSchema,
  ClinicalScaleResultSchema,
  RecordScaleResultSchema,
  ErrorResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { clinicalScalesService } from './clinical-scales.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Scale or result not found' };

const clinicalScalesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['clinical-scales'],
        response: { 200: z.array(ClinicalScaleSchema) },
      },
    },
    async () => clinicalScalesService.listScales(),
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['clinical-scales'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ClinicalScaleSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await clinicalScalesService.findScaleById(req.params.id);
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.get(
    '/results',
    {
      schema: {
        tags: ['clinical-scales'],
        querystring: z.object({
          patientId: UuidSchema,
          scaleId: UuidSchema.optional(),
        }),
        response: { 200: z.array(ClinicalScaleResultSchema) },
      },
    },
    async (req) => clinicalScalesService.listResults(req.query.patientId, req.query.scaleId),
  );

  route.post(
    '/results',
    {
      schema: {
        tags: ['clinical-scales'],
        body: RecordScaleResultSchema,
        response: { 201: ClinicalScaleResultSchema },
      },
    },
    async (req, rep) => {
      const r = await clinicalScalesService.recordResult(req.user.id, req.body);
      return rep.code(201).send(r);
    },
  );

  route.delete(
    '/results/:id',
    {
      schema: {
        tags: ['clinical-scales'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await clinicalScalesService.removeResult(req.params.id);
      if (!r) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );
};

export default clinicalScalesRoutes;
