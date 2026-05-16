import { z } from 'zod';
import { UuidSchema } from './common.js';

// ============================================================================
// Billing / SaaS subscription contracts (Evolua → cobranças do CLIENTE da clínica)
// ============================================================================
// NÃO confundir com finance.ts — aquele é o financeiro INTERNO da clínica
// (contas a pagar/receber por paciente). Este aqui é a cobrança que a Evolua
// faz da clínica pelo uso da plataforma SaaS.
// ============================================================================

export const BillingProviderEnum = z.enum(['abacatepay', 'stripe']);
export type BillingProvider = z.infer<typeof BillingProviderEnum>;

export const PlanIntervalEnum = z.enum(['monthly', 'yearly']);
export type PlanInterval = z.infer<typeof PlanIntervalEnum>;

export const SubscriptionStatusEnum = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export const InvoiceStatusEnum = z.enum([
  'open',
  'paid',
  'void',
  'uncollectible',
  'refunded',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

// ── Plans ──────────────────────────────────────────────────────────────────

export const PlanSchema = z.object({
  id: UuidSchema,
  slug: z.string(),                 // 'free', 'starter', 'pro', 'business'
  name: z.string(),
  description: z.string().nullable(),
  amountCents: z.number().int().min(0),
  currency: z.string().length(3),   // 'BRL' | 'USD'
  interval: PlanIntervalEnum,
  maxUsers: z.number().int().nullable(),
  maxPatients: z.number().int().nullable(),
  features: z.array(z.string()),
  isActive: z.boolean(),
  // External provider IDs (preenchidos ao sincronizar com Stripe/AbacatePay)
  stripeProductId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  abacatepayProductId: z.string().nullable(),
});
export type Plan = z.infer<typeof PlanSchema>;

// ── Subscriptions ──────────────────────────────────────────────────────────

export const SubscriptionSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  planId: UuidSchema,
  provider: BillingProviderEnum,
  providerSubscriptionId: z.string(),
  status: SubscriptionStatusEnum,
  trialEndsAt: z.string().datetime().nullable(),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreateCheckoutSchema = z.object({
  planSlug: z.string(),
  provider: BillingProviderEnum.default('abacatepay'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CreateCheckout = z.infer<typeof CreateCheckoutSchema>;

export const CheckoutSessionSchema = z.object({
  url: z.string().url(),
  provider: BillingProviderEnum,
  providerSessionId: z.string(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

// ── Invoices ───────────────────────────────────────────────────────────────

export const InvoiceSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  subscriptionId: UuidSchema.nullable(),
  provider: BillingProviderEnum,
  providerInvoiceId: z.string(),
  status: InvoiceStatusEnum,
  amountCents: z.number().int(),
  currency: z.string().length(3),
  paidAt: z.string().datetime().nullable(),
  invoiceUrl: z.string().url().nullable(),
  pdfUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// ── Webhook events (raw, antes de processar) ───────────────────────────────

export const WebhookEventSchema = z.object({
  provider: BillingProviderEnum,
  externalId: z.string(),           // ID do evento no provider (idempotência)
  type: z.string(),                 // ex: 'invoice.paid', 'subscription.canceled'
  payload: z.unknown(),
  receivedAt: z.string().datetime(),
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
