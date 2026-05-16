/**
 * Stripe provider — assinaturas internacionais (USD/EUR), fallback para BRL cartão.
 *
 * Docs: https://stripe.com/docs/api
 *
 * Eventos relevantes (webhook):
 *   checkout.session.completed, invoice.paid, invoice.payment_failed,
 *   customer.subscription.updated, customer.subscription.deleted
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../../config/env.js';

const BASE_URL = 'https://api.stripe.com/v1';

interface CreateCheckoutInput {
  priceId: string;          // Stripe Price ID (vem do Plan.stripePriceId)
  customerEmail: string;
  externalId: string;       // nosso clinicId
  successUrl: string;
  cancelUrl: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY não configurada');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function urlencode(obj: Record<string, string>): string {
  return new URLSearchParams(obj).toString();
}

export const stripe = {
  async createCheckout(input: CreateCheckoutInput) {
    const body = urlencode({
      mode: 'subscription',
      'line_items[0][price]': input.priceId,
      'line_items[0][quantity]': '1',
      customer_email: input.customerEmail,
      client_reference_id: input.externalId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    const result = await request<{ id: string; url: string }>('/checkout/sessions', {
      method: 'POST',
      body,
    });

    return {
      providerSessionId: result.id,
      url: result.url,
    };
  },

  async cancelSubscription(providerSubscriptionId: string) {
    return request(`/subscriptions/${providerSubscriptionId}`, { method: 'DELETE' });
  },

  /**
   * Valida assinatura do webhook Stripe.
   * Header: stripe-signature: t=<timestamp>,v1=<sig>
   *
   * NOTA: Stripe usa formato próprio (timestamp + payload assinado).
   * Esta é uma implementação simplificada; em produção, considere usar
   * o SDK oficial 'stripe' para `stripe.webhooks.constructEvent()`.
   */
  verifyWebhook(rawBody: string, signature: string | undefined): boolean {
    if (!env.STRIPE_WEBHOOK_SECRET || !signature) return false;

    // Parse "t=123,v1=abc,v1=def"
    const parts = signature.split(',').reduce<Record<string, string[]>>((acc, p) => {
      const [k, v] = p.split('=');
      if (!k || !v) return acc;
      (acc[k] ??= []).push(v);
      return acc;
    }, {});

    const timestamp = parts.t?.[0];
    const sigs = parts.v1 ?? [];
    if (!timestamp || sigs.length === 0) return false;

    // Tolerância de 5min contra replay
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (age > 300) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    return sigs.some((s) => {
      try {
        return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(s, 'hex'));
      } catch {
        return false;
      }
    });
  },
};
