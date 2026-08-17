import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authHooksService } from './auth-hooks.service.js';
import { env } from '../../config/env.js';

const authHooksRoutes: FastifyPluginAsync = async (app) => {
  // A assinatura do Supabase cobre os bytes originais. Este parser é
  // encapsulado neste plugin para não alterar o parsing JSON das demais rotas.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  app.post<{ Body: string }>(
    '/auth-hook',
    async (req, rep) => {
      const rawBody = req.body;

      // HMAC verification
      if (!env.SUPABASE_AUTH_HOOK_SECRET) {
        req.log.error('SUPABASE_AUTH_HOOK_SECRET não configurado — recusando hook');
        return rep.code(500).send({ error: 'Server configuration error' });
      }
      const signatureHeader = req.headers['x-supabase-auth-hook-signature'];
      const sig = typeof signatureHeader === 'string' ? signatureHeader : '';
      if (!authHooksService.verifySignature(rawBody, sig)) {
        return rep.code(401).send({ error: 'Invalid signature' });
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return rep.code(400).send({ error: 'Invalid JSON' });
      }

      // Validação Zod do payload
      const parsed = z
        .object({
          event: z.enum(['user.signup', 'user.password_reset', 'user.login', 'user.token_refreshed']),
          user: z.object({
            id: z.string(),
            email: z.string().email(),
            phone: z.string().optional(),
            user_metadata: z.record(z.unknown()).optional(),
            app_metadata: z.record(z.unknown()).optional(),
          }),
          redirect_to: z.string().url().optional(),
        })
        .safeParse(payload);

      if (!parsed.success) {
        return rep.status(400).send({
          action: 'deny',
          message: `Invalid payload: ${parsed.error.message}`,
        });
      }

      const result = await authHooksService.handleEvent(parsed.data);
      return rep.send(result);
    },
  );
};

export default authHooksRoutes;
