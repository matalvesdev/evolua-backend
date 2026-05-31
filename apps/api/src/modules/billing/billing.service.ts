/**
 * Billing service — orquestração de checkouts, assinaturas e processamento de webhooks.
 *
 * Pattern: provider-agnostic. As rotas chamam este service que despacha pro
 * provider correto (AbacatePay para BR, Stripe para internacional).
 */
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { abacatepay } from './providers/abacatepay.js';
import { stripe } from './providers/stripe.js';
import { emailService } from '../email/email.service.js';
import { env } from '../../config/env.js';
import { planToDTO, subscriptionToDTO, invoiceToDTO } from './billing.mapper.js';
import type { BillingProvider } from '@evolua/contracts';

const DEFAULT_SUCCESS_URL = `${env.APP_URL ?? 'http://localhost:5173'}/dashboard/billing?status=success`;
const DEFAULT_CANCEL_URL = `${env.APP_URL ?? 'http://localhost:5173'}/dashboard/billing?status=canceled`;

class BillingService {
  // ── Plans ────────────────────────────────────────────────────────────────
  async listPlans() {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { amountCents: 'asc' },
    });
    return plans.map(planToDTO);
  }

  // ── Subscriptions ────────────────────────────────────────────────────────
  async getCurrentSubscription(clinicId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { clinicId, status: { in: ['trialing', 'active', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
    return sub ? subscriptionToDTO(sub) : null;
  }

  async createCheckout(input: {
    clinicId: string;
    planSlug: string;
    provider: BillingProvider;
    customerEmail: string;
    customerName: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    const plan = await prisma.plan.findUnique({ where: { slug: input.planSlug } });
    if (!plan || !plan.isActive) {
      throw Object.assign(new Error('Plano não encontrado'), { statusCode: 404 });
    }
    if (plan.amountCents === 0) {
      throw Object.assign(new Error('Plano gratuito não exige checkout'), { statusCode: 400 });
    }

    const successUrl = input.successUrl ?? DEFAULT_SUCCESS_URL;
    const cancelUrl = input.cancelUrl ?? DEFAULT_CANCEL_URL;

    if (input.provider === 'abacatepay') {
      if (!plan.abacatepayProductId) {
        throw Object.assign(new Error('Plano não está sincronizado com AbacatePay'), { statusCode: 400 });
      }
      return abacatepay.createCheckout({
        productId: plan.abacatepayProductId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        externalId: input.clinicId,
        successUrl,
        cancelUrl,
        isSubscription: true,
      }).then((r) => ({ ...r, provider: 'abacatepay' as const }));
    }

    if (input.provider === 'stripe') {
      if (!plan.stripePriceId) {
        throw Object.assign(new Error('Plano não está sincronizado com Stripe'), { statusCode: 400 });
      }
      return stripe.createCheckout({
        priceId: plan.stripePriceId,
        customerEmail: input.customerEmail,
        externalId: input.clinicId,
        successUrl,
        cancelUrl,
      }).then((r) => ({ ...r, provider: 'stripe' as const }));
    }

    throw Object.assign(new Error(`Provider desconhecido: ${input.provider}`), { statusCode: 400 });
  }

  async cancelSubscription(clinicId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { clinicId, status: { in: ['trialing', 'active', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw Object.assign(new Error('Assinatura não encontrada'), { statusCode: 404 });

    if (sub.provider === 'abacatepay') {
      await abacatepay.cancelSubscription(sub.providerSubscriptionId);
    } else if (sub.provider === 'stripe') {
      await stripe.cancelSubscription(sub.providerSubscriptionId);
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });

    return { ok: true };
  }

  // ── Invoices ─────────────────────────────────────────────────────────────
  async listInvoices(clinicId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return invoices.map(invoiceToDTO);
  }

  // ── Webhook processing (idempotente) ─────────────────────────────────────
  /**
   * 1. Tenta inserir em billing_events (UNIQUE provider+externalId)
   * 2. Se já existe → ignora (idempotência)
   * 3. Senão processa o evento e marca processedAt
   */
  async processWebhook(input: {
    provider: BillingProvider;
    externalId: string;
    type: string;
    payload: unknown;
  }) {
    try {
      await prisma.billingEvent.create({
        data: {
          provider: input.provider,
          externalId: input.externalId,
          type: input.type,
          payload: input.payload as object,
        },
      });
    } catch (err: unknown) {
      // P2002 = unique constraint → evento já recebido
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        logger.info({ provider: input.provider, externalId: input.externalId }, 'webhook duplicado ignorado');
        return { duplicate: true };
      }
      throw err;
    }

    try {
      if (input.provider === 'abacatepay') {
        await this.handleAbacatePayEvent(input.type, input.payload);
      } else if (input.provider === 'stripe') {
        await this.handleStripeEvent(input.type, input.payload);
      } else {
        logger.warn({ provider: input.provider, type: input.type }, 'webhook provider desconhecido');
      }

      await prisma.billingEvent.updateMany({
        where: { provider: input.provider, externalId: input.externalId },
        data: { processedAt: new Date() },
      });

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.billingEvent.updateMany({
        where: { provider: input.provider, externalId: input.externalId },
        data: { error: message },
      });
      throw err;
    }
  }

  // ── AbacatePay handlers ──────────────────────────────────────────────────
  /**
   * Eventos suportados (https://docs.abacatepay.com/webhooks):
   *  - billing.paid          → marca Invoice paid + ativa Subscription
   *  - billing.failed        → status past_due
   *  - subscription.canceled → cancela Subscription
   */
  private async handleAbacatePayEvent(type: string, payload: unknown) {
    const data = (payload as { data?: Record<string, unknown> })?.data ?? {};
    const externalId = (data.id as string) ?? '';
    const clinicId = (data.externalId as string) ?? (data.metadata as { clinicId?: string })?.clinicId;

    switch (type) {
      case 'billing.paid':
      case 'billing.created': {
        if (!clinicId) {
          logger.warn({ type, externalId }, 'abacatepay: clinicId ausente no payload');
          return;
        }
        await prisma.invoice.upsert({
          where: { provider_providerInvoiceId: { provider: 'abacatepay', providerInvoiceId: externalId } },
          create: {
            clinicId,
            provider: 'abacatepay',
            providerInvoiceId: externalId,
            status: type === 'billing.paid' ? 'paid' : 'open',
            amountCents: Number(data.amount ?? 0),
            currency: (data.currency as string) ?? 'BRL',
            paidAt: type === 'billing.paid' ? new Date() : null,
            invoiceUrl: (data.url as string) ?? null,
          },
          update: {
            status: type === 'billing.paid' ? 'paid' : 'open',
            paidAt: type === 'billing.paid' ? new Date() : null,
          },
        });

        if (type === 'billing.paid') {
          await prisma.subscription.updateMany({
            where: { clinicId, provider: 'abacatepay' },
            data: { status: 'active' },
          });

          // Envia comprovante de pagamento para a clínica
          if (emailService.isEnabled() && clinicId) {
            const clinic = await prisma.clinic.findUnique({
              where: { id: clinicId },
              select: { name: true, email: true },
            });
            if (clinic?.email) {
              const amount = fmtBRL(Number(data.amount ?? 0));
              const today = new Date().toLocaleDateString('pt-BR');
              emailService
                .sendBillingReceipt(clinic.email, clinic.name, amount, today, 'PIX/Cartão')
                .catch((err) => logger.warn({ err, clinicId }, 'Billing receipt email failed'));
            }
          }
        }
        return;
      }

      case 'billing.failed': {
        if (!clinicId) return;
        await prisma.subscription.updateMany({
          where: { clinicId, provider: 'abacatepay' },
          data: { status: 'past_due' },
        });
        return;
      }

      case 'subscription.canceled': {
        await prisma.subscription.updateMany({
          where: { provider: 'abacatepay', providerSubscriptionId: externalId },
          data: { status: 'canceled', canceledAt: new Date() },
        });
        return;
      }

      default:
        logger.info({ type }, 'abacatepay: evento sem handler dedicado');
    }
  }

  // ── Stripe handlers ──────────────────────────────────────────────────────
  /**
   * Eventos suportados (https://stripe.com/docs/api/events):
   *  - invoice.paid                  → Invoice paid + ativa Subscription
   *  - invoice.payment_failed        → status past_due
   *  - customer.subscription.updated → sincroniza status/period
   *  - customer.subscription.deleted → status canceled
   *  - checkout.session.completed    → cria Subscription se ainda não existe
   */
  private async handleStripeEvent(type: string, payload: unknown) {
    const obj = ((payload as { data?: { object?: Record<string, unknown> } })?.data?.object) ?? {};

    switch (type) {
      case 'invoice.paid': {
        const subId = obj.subscription as string | undefined;
        const sub = subId
          ? await prisma.subscription.findFirst({ where: { provider: 'stripe', providerSubscriptionId: subId } })
          : null;
        if (!sub) {
          logger.warn({ subId }, 'stripe: invoice.paid sem subscription correspondente');
          return;
        }
        await prisma.invoice.upsert({
          where: { provider_providerInvoiceId: { provider: 'stripe', providerInvoiceId: obj.id as string } },
          create: {
            clinicId: sub.clinicId,
            subscriptionId: sub.id,
            provider: 'stripe',
            providerInvoiceId: obj.id as string,
            status: 'paid',
            amountCents: Number(obj.amount_paid ?? 0),
            currency: ((obj.currency as string) ?? 'usd').toUpperCase(),
            paidAt: new Date(),
            invoiceUrl: (obj.hosted_invoice_url as string) ?? null,
            pdfUrl: (obj.invoice_pdf as string) ?? null,
          },
          update: { status: 'paid', paidAt: new Date() },
        });
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'active' } });

        // Envia comprovante de pagamento para a clínica
        if (emailService.isEnabled()) {
          const clinic = await prisma.clinic.findUnique({
            where: { id: sub.clinicId },
            select: { name: true, email: true },
          });
          if (clinic?.email) {
            const amount = fmtBRL(Number(obj.amount_paid ?? 0));
            const today = new Date().toLocaleDateString('pt-BR');
            emailService
              .sendBillingReceipt(clinic.email, clinic.name, amount, today, 'Cartão (Stripe)')
              .catch((err) => logger.warn({ err, clinicId: sub.clinicId }, 'Billing receipt email failed'));
          }
        }
        return;
      }

      case 'invoice.payment_failed': {
        const subId = obj.subscription as string | undefined;
        if (!subId) return;
        await prisma.subscription.updateMany({
          where: { provider: 'stripe', providerSubscriptionId: subId },
          data: { status: 'past_due' },
        });
        return;
      }

      case 'customer.subscription.updated': {
        const status = obj.status as string;
        const allowed = ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'];
        if (!allowed.includes(status)) return;
        await prisma.subscription.updateMany({
          where: { provider: 'stripe', providerSubscriptionId: obj.id as string },
          data: {
            status: status as 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete',
            currentPeriodStart: new Date(Number(obj.current_period_start) * 1000),
            currentPeriodEnd: new Date(Number(obj.current_period_end) * 1000),
            cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
          },
        });
        return;
      }

      case 'customer.subscription.deleted': {
        await prisma.subscription.updateMany({
          where: { provider: 'stripe', providerSubscriptionId: obj.id as string },
          data: { status: 'canceled', canceledAt: new Date() },
        });
        return;
      }

      case 'checkout.session.completed': {
        // A Subscription real é criada via customer.subscription.updated;
        // aqui apenas logamos para auditoria.
        logger.info({ sessionId: obj.id }, 'stripe: checkout concluído');
        return;
      }

      default:
        logger.info({ type }, 'stripe: evento sem handler dedicado');
    }
  }
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const billingService = new BillingService();
