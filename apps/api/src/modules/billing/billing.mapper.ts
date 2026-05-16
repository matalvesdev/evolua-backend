/**
 * Mappers Prisma → DTO (contracts).
 *
 * Necessário porque o Prisma usa `string` para campos enum (provider, status,
 * interval) enquanto o Zod nos contracts usa enum literal.
 */
import type {
  Plan as PrismaPlan,
  Subscription as PrismaSubscription,
  Invoice as PrismaInvoice,
} from '@prisma/client';
import type {
  Plan,
  Subscription,
  Invoice,
  BillingProvider,
  PlanInterval,
  SubscriptionStatus,
  InvoiceStatus,
} from '@evolua/contracts';

export function planToDTO(p: PrismaPlan): Plan {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    amountCents: p.amountCents,
    currency: p.currency,
    interval: p.interval as PlanInterval,
    maxUsers: p.maxUsers,
    maxPatients: p.maxPatients,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    isActive: p.isActive,
    stripeProductId: p.stripeProductId,
    stripePriceId: p.stripePriceId,
    abacatepayProductId: p.abacatepayProductId,
  };
}

export function subscriptionToDTO(s: PrismaSubscription): Subscription {
  return {
    id: s.id,
    clinicId: s.clinicId,
    planId: s.planId,
    provider: s.provider as BillingProvider,
    providerSubscriptionId: s.providerSubscriptionId,
    status: s.status as SubscriptionStatus,
    trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: s.currentPeriodStart.toISOString(),
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: s.canceledAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function invoiceToDTO(i: PrismaInvoice): Invoice {
  return {
    id: i.id,
    clinicId: i.clinicId,
    subscriptionId: i.subscriptionId,
    provider: i.provider as BillingProvider,
    providerInvoiceId: i.providerInvoiceId,
    status: i.status as InvoiceStatus,
    amountCents: i.amountCents,
    currency: i.currency,
    paidAt: i.paidAt?.toISOString() ?? null,
    invoiceUrl: i.invoiceUrl,
    pdfUrl: i.pdfUrl,
    createdAt: i.createdAt.toISOString(),
  };
}
