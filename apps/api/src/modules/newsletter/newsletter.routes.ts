import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { newsletterService } from './newsletter.service.js';

const newsletterRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post('/', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
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
  }, async (req, _rep): Promise<{ success: true }> => {
    const { email } = req.body;
    req.log.info('newsletter subscription');
    const result = await newsletterService.subscribe(email);
    if (!result.success) {
      req.log.error({ error: result.error }, 'newsletter subscribe failed');
    }
    return { success: true };
  });

  route.post('/unsubscribe', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['newsletter'],
      summary: 'Unsubscribe from newsletter using an opaque token (public)',
      body: z.object({
        token: z.string().uuid('Token inválido'),
      }),
      response: {
        200: z.object({ success: z.literal(true) }),
      },
    },
  }, async (req, _rep): Promise<{ success: true }> => {
    const result = await newsletterService.unsubscribe(req.body.token);
    if (!result.success) {
      req.log.error({ error: result.error }, 'newsletter unsubscribe failed');
      throw app.httpErrors.serviceUnavailable('Não foi possível cancelar a inscrição agora');
    }
    return { success: true };
  });
};

export default newsletterRoutes;
