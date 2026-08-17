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
function verifyWebhookSignature(
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

const waCrmRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  // ── Webhook interno chamado pelo Go (ANTES do authenticate) ─────────
  route.post(
    '/webhook/inbound',
    {
      // Rate limit forte — webhooks legítimos vêm do nosso Go com burst controlado.
      config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
      schema: {
        tags: ['wa-crm'],
        body: WaInboundWebhookSchema,
        headers: z.object({
          'x-internal-token': z.string(),
          'x-evolution-signature': z.string().optional(),
        }),
        response: {
          204: z.null(),
          401: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const token = req.headers['x-internal-token'];
      if (token !== env.INTERNAL_SERVICE_TOKEN) {
        req.log.warn({ remoteIp: req.ip }, 'wa-crm webhook: invalid internal token');
        return rep.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid internal token',
        });
      }

      const signature = req.headers['x-evolution-signature'] as string | undefined;
      const rawBody =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
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

      try {
        await waCrmService.handleInbound(req.body);
        return rep.code(204).send(null);
      } catch (e) {
        // Erro real de processamento — devolvemos 500 para que o Go
        // (e por consequência o Evolution provider) faça retry.
        req.log.error(
          {
            err: e,
            senderPhone: req.body.senderPhone,
            messageId: req.body.messageId,
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
