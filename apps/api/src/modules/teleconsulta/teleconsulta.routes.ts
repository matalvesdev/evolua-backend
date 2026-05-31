import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
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
          200: z.array(z.object({
            id: z.string().uuid(),
            patient: z.string(),
            patientId: z.string().uuid(),
            date: z.string(),
            time: z.string(),
            link: z.string(),
            status: z.enum(['scheduled', 'active', 'ended']),
            sentViaWhatsApp: z.boolean(),
            clinicId: z.string().uuid(),
            createdAt: z.string(),
          })),
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
        body: z.object({
          patientId: z.string().uuid(),
          patient: z.string().min(1),
          date: z.string(),
          time: z.string(),
          sendWA: z.boolean().default(false),
        }),
        response: { 201: z.any() },
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
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          status: z.enum(['scheduled', 'active', 'ended']).optional(),
          sentViaWhatsApp: z.boolean().optional(),
        }),
        response: { 200: z.any(), 404: z.any() },
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
