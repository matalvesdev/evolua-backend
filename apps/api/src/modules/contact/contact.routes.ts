import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { contactService } from './contact.service.js';

const contactRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post('/notify', {
    schema: {
      tags: ['contact'],
      summary: 'Notify admin about a new contact form submission (public)',
      body: z.object({
        nome: z.string().min(2).max(120),
        email: z.string().email(),
        whatsapp: z.string().max(40).nullable().optional(),
        assunto: z.string(),
        mensagem: z.string().min(10).max(4000),
      }),
      response: {
        200: z.object({ success: z.literal(true) }),
      },
    },
  }, async (req, _rep) => {
    const result = await contactService.notifyAdmin(req.body);
    if (!result.success) {
      req.log.error({ error: result.error }, 'contact notify failed');
    }
    return { success: true as const };
  });
};

export default contactRoutes;
