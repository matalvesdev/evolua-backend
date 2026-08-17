import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { leadsService } from './leads.service.js';

const bodySchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  cidade: z.string().optional(),
  pacientesMes: z.string().optional(),
  comoConheceu: z.string().optional(),
  magnetId: z.string().optional(),
});

const leadsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['leads'],
        summary: 'Capturar lead da landing page',
        body: bodySchema,
        response: {
          201: z.object({ success: z.boolean() }),
          500: z.object({ success: z.boolean() }),
        },
      },
    },
    async (req, rep) => {
      const body = bodySchema.parse(req.body);
      const result = await leadsService.capture(body);
      if (!result.success) {
        return rep.status(500).send({ success: false });
      }
      return rep.status(201).send({ success: true });
    },
  );
};

export default leadsRoutes;
