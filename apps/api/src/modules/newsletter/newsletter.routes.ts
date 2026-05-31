import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { newsletterService } from './newsletter.service.js';

const newsletterRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post('/', {
    schema: {
      tags: ['newsletter'],
      summary: 'Subscribe email to newsletter (public)',
      body: z.object({
        email: z.string().email('Email inválido'),
      }),
      response: {
        200: z.object({ success: z.literal(true) }),
      },
    },
  }, async (req, _rep) => {
    const { email } = req.body;
    req.log.info({ email }, 'newsletter subscription');
    const result = await newsletterService.subscribe(email);
    if (!result.success) {
      req.log.error({ email, error: result.error }, 'newsletter subscribe failed');
    }
    return { success: true as const };
  });
};

export default newsletterRoutes;
