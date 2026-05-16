/**
 * AbacatePay provider — assinaturas BRL via PIX/Cartão/Boleto.
 *
 * Docs: https://docs.abacatepay.com
 * API base: https://api.abacatepay.com/v1
 *
 * Eventos relevantes (webhook):
 *   billing.paid, billing.failed, subscription.activated,
 *   subscription.canceled, subscription.renewed
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../../config/env.js';

const BASE_URL = 'https://api.abacatepay.com/v1';

interface AbacatePayCheckoutResponse {
  data: {
    id: string;
    url: string;
  };
}

interface CreateCheckoutInput {
  productId: string;        // ID do produto AbacatePay (vem do Plan.abacatepayProductId)
  customerEmail: string;
  customerName: string;
  externalId: string;       // nosso clinicId, pra correlacionar via webhook
  successUrl: string;
  cancelUrl: string;
  isSubscription: boolean;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.ABACATEPAY_API_KEY) {
    throw new Error('ABACATEPAY_API_KEY não configurada');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.ABACATEPAY_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AbacatePay ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const abacatepay = {
  async createCheckout(input: CreateCheckoutInput) {
    const endpoint = input.isSubscription ? '/subscription' : '/billing';
    const body = {
      frequency: input.isSubscription ? 'ONE_TIME' : 'ONE_TIME',
      methods: ['PIX', 'CREDIT_CARD'],
      products: [{ externalId: input.productId, name: 'Plano', quantity: 1, price: 0 }],
      returnUrl: input.cancelUrl,
      completionUrl: input.successUrl,
      customer: {
        email: input.customerEmail,
        name: input.customerName,
      },
      externalId: input.externalId,
    };

    const result = await request<AbacatePayCheckoutResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      providerSessionId: result.data.id,
      url: result.data.url,
    };
  },

  async cancelSubscription(providerSubscriptionId: string) {
    return request(`/subscription/${providerSubscriptionId}/cancel`, { method: 'POST' });
  },

  /**
   * Valida assinatura HMAC-SHA256 do webhook AbacatePay.
   * Header: x-abacate-signature: sha256=<hex>
   */
  verifyWebhook(rawBody: string, signature: string | undefined): boolean {
    if (!env.ABACATEPAY_WEBHOOK_SECRET || !signature) return false;

    const expected = createHmac('sha256', env.ABACATEPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const provided = signature.replace(/^sha256=/, '');

    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
    } catch {
      return false;
    }
  },
};
