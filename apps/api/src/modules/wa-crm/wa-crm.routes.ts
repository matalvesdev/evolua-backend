import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ErrorResponseSchema,
  UuidSchema,
  WaConversationSchema,
  WaConversationDetailSchema,
  WaMessageSchema,
  WaSendTextSchema,
  WaSendMaterialSchema,
  WaSendPaymentLinkSchema,
  WaSendPaymentLinkResponseSchema,
  WaInboundWebhookSchema,
} from '@evolua/contracts';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { waCrmService, WaCrmError } from './wa-crm.service.js';
import { waCrmMapper } from './wa-crm.mapper.js';
import { env, isProductionLike } from '../../config/env.js';

/**
 * Verifica HMAC-SHA256 da assinatura enviada no header `x-evolution-signature`
 * pelo serviço Go. Formato esperado: `sha256=<hex>`. Comparação em tempo
 * constante para evitar timing attacks.
 *
 * Em desenvolvimento, se EVOLUTION_WEBHOOK_SECRET não estiver definido,
 * a verificação é pulada (apenas o `x-internal-token` é exigido).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  const secret = env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) {
    if (isProductionLike) {
      // Em prod sem secret é falha de configuração — rejeitar.
      return false;
    }
    return true;
  }
  if (!signatureHeader) return false;

  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // timingSafeEqual exige buffers do mesmo tamanho.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
}

function hasValidInternalToken(provided: string | undefined): boolean {
  if (!provided || !env.INTERNAL_SERVICE_TOKEN) return false;
  const actual = Buffer.from(provided);
  const expected = Buffer.from(env.INTERNAL_SERVICE_TOKEN);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const waCrmRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  // O HMAC do gateway Go é calculado sobre bytes. Mantemos o body cru apenas
  // para o webhook e fazemos parse/validação após autenticar a assinatura.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      if (req.url.endsWith('/webhook/inbound')) {
        done(null, body);
        return;
      }
      try {
        const json = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        done(null, JSON.parse(json));
      } catch (error) {
        done(error instanceof Error ? error : new Error('Invalid JSON'));
      }
    },
  );

  // ── Webhook interno chamado pelo Go (ANTES do authenticate) ─────────
  route.post(
    '/webhook/inbound',
    {
      // Rate limit forte — webhooks legítimos vêm do nosso Go com burst controlado.
      config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
      schema: {
        tags: ['wa-crm'],
        headers: z.object({
          'x-internal-token': z.string(),
          'x-evolution-signature': z.string().optional(),
        }),
        response: {
          204: z.null(),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const token = req.headers['x-internal-token'];
      if (!hasValidInternalToken(token)) {
        req.log.warn({ remoteIp: req.ip }, 'wa-crm webhook: invalid internal token');
        return rep.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid internal token',
        });
      }

      const signature = req.headers['x-evolution-signature'] as string | undefined;
      if (typeof req.body !== 'string' && !Buffer.isBuffer(req.body)) {
        return rep.code(400).send({
          error: 'ValidationError',
          message: 'Invalid webhook payload',
        });
      }
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
      if (!verifyWebhookSignature(rawBody, signature)) {
        req.log.warn(
          { remoteIp: req.ip, hasSignature: Boolean(signature) },
          'wa-crm webhook: invalid HMAC signature',
        );
        return rep.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid webhook signature',
        });
      }

      let payload: z.infer<typeof WaInboundWebhookSchema>;
      try {
        payload = WaInboundWebhookSchema.parse(JSON.parse(rawBody));
      } catch {
        return rep.code(400).send({
          error: 'ValidationError',
          message: 'Invalid webhook payload',
        });
      }

      try {
        await waCrmService.handleInbound(payload);
        return rep.code(204).send(null);
      } catch (e) {
        // Erro real de processamento — devolvemos 500 para que o Go
        // (e por consequência o Evolution provider) faça retry.
        req.log.error(
          {
            err: e,
            messageId: payload.messageId,
          },
          'wa-crm: inbound handler failed',
        );
        return rep.code(500).send({
          error: 'InboundProcessingError',
          message: e instanceof Error ? e.message : 'Erro ao processar inbound',
        });
      }
    },
  );

  // ── Rotas autenticadas ───────────────────────────────────────────────
  route.register(async (priv) => {
    const r = priv.withTypeProvider<ZodTypeProvider>();
    r.addHook('onRequest', app.authenticate);

    r.get(
      '/conversations',
      {
        schema: {
          tags: ['wa-crm'],
          response: { 200: z.array(WaConversationSchema) },
        },
      },
      async (req) => {
        const clinicId = await resolveClinicId(req.user.id);
        const list = await waCrmService.listConversations(clinicId);
        return list.map(waCrmMapper.conversation);
      },
    );

    r.get(
      '/conversations/:patientId',
      {
        schema: {
          tags: ['wa-crm'],
          params: z.object({ patientId: UuidSchema }),
          response: {
            200: WaConversationDetailSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      async (req, rep) => {
        const clinicId = await resolveClinicId(req.user.id);
        try {
          const conv = await waCrmService.getConversation(
            clinicId,
            req.params.patientId,
          );
          return waCrmMapper.conversationDetail(conv);
        } catch (e) {
          if (e instanceof WaCrmError) {
            return rep.code(404).send({
              error: 'NotFound',
              message: e.message,
            });
          }
          throw e;
        }
      },
    );

    r.post(
      '/send-text',
      {
        schema: {
          tags: ['wa-crm'],
          body: WaSendTextSchema,
          response: {
            201: WaMessageSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      async (req, rep) => {
        const clinicId = await resolveClinicId(req.user.id);
        try {
          const msg = await waCrmService.sendText(clinicId, req.body);
          return rep.code(201).send(waCrmMapper.message(msg));
        } catch (e) {
          if (e instanceof WaCrmError) {
            if (e.statusCode === 404) {
              return rep.code(404).send({ error: 'NotFound', message: e.message });
            }
            return rep.code(400).send({ error: 'BadRequest', message: e.message });
          }
          throw e;
        }
      },
    );

    r.post(
      '/send-material',
      {
        schema: {
          tags: ['wa-crm'],
          body: WaSendMaterialSchema,
          response: {
            201: WaMessageSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      async (req, rep) => {
        const clinicId = await resolveClinicId(req.user.id);
        try {
          const msg = await waCrmService.sendMaterial(clinicId, req.body);
          return rep.code(201).send(waCrmMapper.message(msg));
        } catch (e) {
          if (e instanceof WaCrmError) {
            if (e.statusCode === 404) {
              return rep.code(404).send({ error: 'NotFound', message: e.message });
            }
            return rep.code(400).send({ error: 'BadRequest', message: e.message });
          }
          throw e;
        }
      },
    );

    r.post(
      '/send-payment-link',
      {
        schema: {
          tags: ['wa-crm'],
          body: WaSendPaymentLinkSchema,
          response: {
            201: WaSendPaymentLinkResponseSchema,
            400: ErrorResponseSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      async (req, rep) => {
        const clinicId = await resolveClinicId(req.user.id);
        try {
          const result = await waCrmService.sendPaymentLink(clinicId, req.body);
          return rep.code(201).send({
            message: waCrmMapper.message(result.message),
            pixPayload: result.pixPayload,
            qrCodeBase64: result.qrCodeBase64,
          });
        } catch (e) {
          if (e instanceof WaCrmError) {
            if (e.statusCode === 404) {
              return rep.code(404).send({ error: 'NotFound', message: e.message });
            }
            return rep.code(400).send({ error: 'BadRequest', message: e.message });
          }
          throw e;
        }
      },
    );
  });
};

export default waCrmRoutes;
