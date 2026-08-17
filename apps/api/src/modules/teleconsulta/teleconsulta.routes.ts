import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UuidSchema, ErrorResponseSchema } from '@evolua/contracts';
import { TeleSessionSchema, CreateTeleSessionSchema, UpdateTeleSessionSchema } from '@evolua/contracts';
import { teleconsultaService } from './teleconsulta.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const teleconsultaRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.addHook('onRequest', app.authenticate);

  route.get(
    '/sessions',
    {
      schema: {
        tags: ['teleconsulta'],
        summary: 'Lista sessões de teleconsulta',
        response: {
          200: z.array(TeleSessionSchema),
        },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return teleconsultaService.list(clinicId);
    },
  );

  route.post(
    '/sessions',
    {
      schema: {
        tags: ['teleconsulta'],
        summary: 'Cria sessão de teleconsulta',
        body: CreateTeleSessionSchema,
        response: { 201: TeleSessionSchema, 404: ErrorResponseSchema, 409: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const created = await teleconsultaService.create(clinicId, req.body);
      return rep.code(201).send(created);
    },
  );

  route.patch(
    '/sessions/:id',
    {
      schema: {
        tags: ['teleconsulta'],
        summary: 'Atualiza sessão de teleconsulta',
        params: z.object({ id: UuidSchema }),
        body: UpdateTeleSessionSchema,
        response: { 200: TeleSessionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const updated = await teleconsultaService.update(clinicId, req.params.id, req.body);
      if (!updated) return rep.code(404).send({ error: 'NotFound', message: 'Session not found' });
      return updated;
    },
  );
};

export default teleconsultaRoutes;
