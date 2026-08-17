/**
 * Billing routes — gerencia planos, checkouts e assinaturas SaaS.
 *
 * Prefix: /api/billing
 *
 * Webhooks ficam em /webhooks/billing/<provider> (sem prefix /api,
 * sem auth) para evitar overhead e permitir validação por HMAC apenas.
 */
import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  CreateCheckoutSchema,
  CheckoutSessionSchema,
  PlanSchema,
  SubscriptionSchema,
  InvoiceSchema,
  ErrorResponseSchema,
} from '@evolua/contracts';
import { billingService } from './billing.service.js';
import { abacatepay } from './providers/abacatepay.js';
import { stripe } from './providers/stripe.js';
import { requireClinicAdministration, resolveClinicId } from '../auth/auth.helpers.js';

// Zod schemas for webhook payload validation
const AbacatePayWebhookSchema = z.object({
  id: z.string(),
  event: z.string(),
  type: z.string().optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

const StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

// ============================================================================
// Rotas autenticadas — /api/billing/*
// ============================================================================
export const billingRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  // Listar planos disponíveis
  route.get('/plans', {
    schema: {
      tags: ['billing'],
      response: { 200: z.array(PlanSchema.partial()) },
    },
  }, async () => billingService.listPlans());

  // Assinatura corrente
  route.get('/subscription', {
    schema: {
      tags: ['billing'],
      response: {
        200: SubscriptionSchema.partial().nullable(),
        401: ErrorResponseSchema,
      },
    },
  }, async (req) => {
    const clinicId = await resolveClinicId(req.user.id);
    return billingService.getCurrentSubscription(clinicId);
  });

  // Criar checkout (retorna URL para redirecionar o usuário)
  route.post('/checkout', {
    schema: {
      tags: ['billing'],
      body: CreateCheckoutSchema,
      response: {
        200: CheckoutSessionSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
  }, async (req) => {
    const clinicId = await requireClinicAdministration(req.user.id);
    return billingService.createCheckout({
      clinicId,
      planSlug: req.body.planSlug,
      provider: req.body.provider,
      customerEmail: req.user.email ?? '',
      customerName: req.user.email ?? 'Cliente',
      successUrl: req.body.successUrl,
      cancelUrl: req.body.cancelUrl,
    });
  });

  // Cancelar assinatura (downgrade ao final do período corrente)
  route.post('/subscription/cancel', {
    schema: {
      tags: ['billing'],
      response: { 200: z.object({ ok: z.boolean() }), 404: ErrorResponseSchema },
    },
  }, async (req) => {
    const clinicId = await requireClinicAdministration(req.user.id);
    return billingService.cancelSubscription(clinicId);
  });

  // Histórico de faturas
  route.get('/invoices', {
    schema: {
      tags: ['billing'],
      response: { 200: z.array(InvoiceSchema.partial()) },
    },
  }, async (req) => {
    const clinicId = await resolveClinicId(req.user.id);
    return billingService.listInvoices(clinicId);
  });
};

// ============================================================================
// Webhooks — /webhooks/billing/* (sem auth, valida HMAC)
// ============================================================================
export const billingWebhookRoutes: FastifyPluginAsync = async (app) => {
  // IMPORTANTE: precisa do raw body para validar HMAC.
  // Configure em app.ts: app.addContentTypeParser('application/json', { parseAs: 'string' }, ...)

  // ── AbacatePay ──────────────────────────────────────────────────────────
  app.post('/billing/abacatepay', {
    schema: { tags: ['webhooks'], hide: true },
  }, async (req, reply) => {
    const signature = req.headers['x-abacate-signature'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!abacatepay.verifyWebhook(rawBody, signature)) {
      req.log.warn({ signature }, 'webhook abacatepay assinatura inválida');
      return reply.code(401).send({ error: 'invalid signature' });
    }

    let evt: Record<string, unknown>;
    try {
      evt = AbacatePayWebhookSchema.parse(JSON.parse(rawBody));
    } catch (parseErr) {
      req.log.warn({ err: parseErr }, 'webhook abacatepay payload inválido');
      return reply.code(400).send({ error: 'invalid payload' });
    }
    const nestedEvent = typeof evt.event === 'object' && evt.event !== null
      ? evt.event as Record<string, unknown>
      : undefined;
    const externalId = typeof evt.id === 'string'
      ? evt.id
      : typeof nestedEvent?.id === 'string' ? nestedEvent.id : undefined;
    const eventType = typeof evt.event === 'string'
      ? evt.event
      : typeof evt.type === 'string' ? evt.type : undefined;
    if (!externalId || !eventType) {
      req.log.warn('webhook abacatepay sem id ou tipo');
      return reply.code(400).send({ error: 'invalid payload' });
    }
    return billingService.processWebhook({
      provider: 'abacatepay',
      externalId,
      type: eventType,
      payload: evt,
    });
  });

  // ── Stripe ───────────────────────────────────────────────────────────────
  app.post('/billing/stripe', {
    schema: { tags: ['webhooks'], hide: true },
  }, async (req, reply) => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!stripe.verifyWebhook(rawBody, signature)) {
      req.log.warn({ signature }, 'webhook stripe assinatura inválida');
      return reply.code(401).send({ error: 'invalid signature' });
    }

    let evt: Record<string, unknown>;
    try {
      evt = StripeWebhookSchema.parse(JSON.parse(rawBody));
    } catch (parseErr) {
      req.log.warn({ err: parseErr }, 'webhook stripe payload inválido');
      return reply.code(400).send({ error: 'invalid payload' });
    }
    return billingService.processWebhook({
      provider: 'stripe',
      externalId: evt.id as string,
      type: evt.type as string,
      payload: evt,
    });
  });
};

export default billingRoutes;
