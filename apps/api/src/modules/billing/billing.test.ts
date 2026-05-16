/**
 * Testes do módulo billing — cobrem:
 *  - HMAC AbacatePay (sha256=<hex>)
 *  - HMAC Stripe (t=...,v1=...) com tolerância de replay
 *  - Mappers Prisma → DTO (datas ISO, enums, nulls)
 *
 * Nota: env vars são definidas via `vi.stubEnv` para evitar dependência
 * do .env real. Os módulos providers leem de `env.*` (config validado),
 * que é carregado uma vez — então re-importamos via `vi.resetModules`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const ABA_SECRET = 'test-abacatepay-secret';
const STR_SECRET = 'whsec_test_stripe';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('ABACATEPAY_API_KEY', 'aba_test_key');
  vi.stubEnv('ABACATEPAY_WEBHOOK_SECRET', ABA_SECRET);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', STR_SECRET);
  // Defaults exigidos pelo env validator
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  vi.stubEnv('SUPABASE_JWT_SECRET', 'supabase-jwt-secret-min-32-chars-aaaaa');
  vi.stubEnv('INTERNAL_SERVICE_TOKEN', 'internal-token-dev');
});

describe('AbacatePay verifyWebhook', () => {
  it('aceita assinatura HMAC-SHA256 válida com prefixo sha256=', async () => {
    const { abacatepay } = await import('./providers/abacatepay.js');
    const body = '{"event":"billing.paid","data":{"id":"bil_1"}}';
    const sig = createHmac('sha256', ABA_SECRET).update(body).digest('hex');

    expect(abacatepay.verifyWebhook(body, `sha256=${sig}`)).toBe(true);
    expect(abacatepay.verifyWebhook(body, sig)).toBe(true); // sem prefixo também aceita
  });

  it('rejeita assinatura inválida', async () => {
    const { abacatepay } = await import('./providers/abacatepay.js');
    expect(abacatepay.verifyWebhook('{"x":1}', 'sha256=deadbeef')).toBe(false);
  });

  it('rejeita quando signature ausente', async () => {
    const { abacatepay } = await import('./providers/abacatepay.js');
    expect(abacatepay.verifyWebhook('{"x":1}', undefined)).toBe(false);
  });

  it('rejeita quando body adulterado', async () => {
    const { abacatepay } = await import('./providers/abacatepay.js');
    const original = '{"amount":100}';
    const sig = createHmac('sha256', ABA_SECRET).update(original).digest('hex');
    const tampered = '{"amount":9999}';
    expect(abacatepay.verifyWebhook(tampered, `sha256=${sig}`)).toBe(false);
  });
});

describe('Stripe verifyWebhook', () => {
  function buildStripeSig(body: string, secret = STR_SECRET, ts = Math.floor(Date.now() / 1000)) {
    const signed = `${ts}.${body}`;
    const sig = createHmac('sha256', secret).update(signed).digest('hex');
    return `t=${ts},v1=${sig}`;
  }

  it('aceita assinatura válida dentro da janela de 5min', async () => {
    const { stripe } = await import('./providers/stripe.js');
    const body = '{"id":"evt_1","type":"invoice.paid"}';
    expect(stripe.verifyWebhook(body, buildStripeSig(body))).toBe(true);
  });

  it('rejeita timestamp fora da janela (replay > 5min)', async () => {
    const { stripe } = await import('./providers/stripe.js');
    const body = '{"id":"evt_1"}';
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10min atrás
    expect(stripe.verifyWebhook(body, buildStripeSig(body, STR_SECRET, oldTs))).toBe(false);
  });

  it('rejeita assinatura forjada (segredo errado)', async () => {
    const { stripe } = await import('./providers/stripe.js');
    const body = '{"id":"evt_1"}';
    expect(stripe.verifyWebhook(body, buildStripeSig(body, 'wrong-secret'))).toBe(false);
  });

  it('rejeita header malformado', async () => {
    const { stripe } = await import('./providers/stripe.js');
    expect(stripe.verifyWebhook('{}', 'not-a-stripe-sig')).toBe(false);
    expect(stripe.verifyWebhook('{}', undefined)).toBe(false);
  });

  it('aceita múltiplos v1 (rotação de segredo)', async () => {
    const { stripe } = await import('./providers/stripe.js');
    const body = '{"id":"evt_1"}';
    const ts = Math.floor(Date.now() / 1000);
    const validSig = createHmac('sha256', STR_SECRET).update(`${ts}.${body}`).digest('hex');
    const header = `t=${ts},v1=deadbeef,v1=${validSig}`;
    expect(stripe.verifyWebhook(body, header)).toBe(true);
  });
});

describe('billing.mapper', () => {
  const fixedDate = new Date('2026-05-12T10:00:00.000Z');

  it('planToDTO normaliza features de Json para string[]', async () => {
    const { planToDTO } = await import('./billing.mapper.js');
    const row = {
      id: 'p1', slug: 'pro', name: 'Pro', description: 'Plano Pro',
      amountCents: 9900, currency: 'BRL', interval: 'monthly',
      maxUsers: 5, maxPatients: 200,
      features: ['ai', 'wa-crm'], isActive: true,
      stripeProductId: 'prod_x', stripePriceId: 'price_x',
      abacatepayProductId: 'aba_x',
      createdAt: fixedDate, updatedAt: fixedDate,
    } as unknown as Parameters<typeof planToDTO>[0];

    const dto = planToDTO(row);
    expect(dto.features).toEqual(['ai', 'wa-crm']);
    expect(dto.interval).toBe('monthly');
    expect(dto.amountCents).toBe(9900);
  });

  it('planToDTO devolve [] quando features não é array', async () => {
    const { planToDTO } = await import('./billing.mapper.js');
    const row = {
      id: 'p1', slug: 'free', name: 'Free', description: null,
      amountCents: 0, currency: 'BRL', interval: 'monthly',
      maxUsers: 1, maxPatients: 10,
      features: null, isActive: true,
      stripeProductId: null, stripePriceId: null, abacatepayProductId: null,
      createdAt: fixedDate, updatedAt: fixedDate,
    } as unknown as Parameters<typeof planToDTO>[0];
    expect(planToDTO(row).features).toEqual([]);
  });

  it('subscriptionToDTO converte Date → ISO e preserva nulls', async () => {
    const { subscriptionToDTO } = await import('./billing.mapper.js');
    const row = {
      id: 's1', clinicId: 'c1', planId: 'p1', provider: 'abacatepay',
      providerSubscriptionId: 'sub_aba_1', status: 'active',
      trialEndsAt: null,
      currentPeriodStart: fixedDate, currentPeriodEnd: fixedDate,
      cancelAtPeriodEnd: false, canceledAt: null,
      createdAt: fixedDate, updatedAt: fixedDate,
    } as unknown as Parameters<typeof subscriptionToDTO>[0];

    const dto = subscriptionToDTO(row);
    expect(dto.trialEndsAt).toBeNull();
    expect(dto.canceledAt).toBeNull();
    expect(dto.currentPeriodStart).toBe('2026-05-12T10:00:00.000Z');
    expect(dto.provider).toBe('abacatepay');
    expect(dto.status).toBe('active');
  });

  it('invoiceToDTO mapeia paidAt opcional', async () => {
    const { invoiceToDTO } = await import('./billing.mapper.js');
    const baseRow = {
      id: 'i1', clinicId: 'c1', subscriptionId: 's1',
      provider: 'stripe', providerInvoiceId: 'in_1', status: 'open',
      amountCents: 9900, currency: 'USD',
      paidAt: null, invoiceUrl: null, pdfUrl: null,
      createdAt: fixedDate,
    } as unknown as Parameters<typeof invoiceToDTO>[0];

    expect(invoiceToDTO(baseRow).paidAt).toBeNull();
    const paidRow = { ...baseRow, status: 'paid', paidAt: fixedDate };
    expect(invoiceToDTO(paidRow).paidAt).toBe('2026-05-12T10:00:00.000Z');
  });
});
