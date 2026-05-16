-- ============================================================================
-- Billing module — SaaS subscriptions (Evolua cobra das clínicas)
-- ============================================================================
-- Cria: plans, subscriptions, invoices, billing_events
-- NÃO confunde com transactions (financeiro interno da clínica).
-- ============================================================================

-- ── Plans ──────────────────────────────────────────────────────────────────
CREATE TABLE "plans" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"                  text NOT NULL UNIQUE,
  "name"                  text NOT NULL,
  "description"           text,
  "amount_cents"          integer NOT NULL CHECK (amount_cents >= 0),
  "currency"              char(3) NOT NULL DEFAULT 'BRL',
  "interval"              text NOT NULL CHECK (interval IN ('monthly', 'yearly')),
  "max_users"             integer,
  "max_patients"          integer,
  "features"              jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_active"             boolean NOT NULL DEFAULT true,
  "stripe_product_id"     text,
  "stripe_price_id"       text,
  "abacatepay_product_id" text,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "plans_slug_idx" ON "plans" ("slug");
CREATE INDEX "plans_is_active_idx" ON "plans" ("is_active");

-- Seeds iniciais
INSERT INTO "plans" (slug, name, amount_cents, currency, interval, max_users, max_patients, features) VALUES
  ('free',     'Grátis',     0,      'BRL', 'monthly',  1,  10,  '["1 usuário", "10 pacientes", "WhatsApp básico"]'::jsonb),
  ('starter',  'Starter',    9900,   'BRL', 'monthly',  3,  100, '["3 usuários", "100 pacientes", "WhatsApp", "Automações"]'::jsonb),
  ('pro',      'Pro',        24900,  'BRL', 'monthly',  10, 500, '["10 usuários", "500 pacientes", "Todas features", "Suporte prioritário"]'::jsonb),
  ('business', 'Business',   59900,  'BRL', 'monthly',  NULL, NULL, '["Usuários ilimitados", "Pacientes ilimitados", "SLA", "Onboarding dedicado"]'::jsonb);

-- ── Subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE "subscriptions" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id"                uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "plan_id"                  uuid NOT NULL REFERENCES "plans"("id") ON DELETE RESTRICT,
  "provider"                 text NOT NULL CHECK (provider IN ('abacatepay', 'stripe')),
  "provider_subscription_id" text NOT NULL,
  "status"                   text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','unpaid','incomplete')),
  "trial_ends_at"            timestamptz,
  "current_period_start"     timestamptz NOT NULL,
  "current_period_end"       timestamptz NOT NULL,
  "cancel_at_period_end"     boolean NOT NULL DEFAULT false,
  "canceled_at"              timestamptz,
  "created_at"               timestamptz NOT NULL DEFAULT now(),
  "updated_at"               timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("provider", "provider_subscription_id")
);

CREATE INDEX "subscriptions_clinic_id_idx" ON "subscriptions" ("clinic_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" ("status");

-- ── Invoices ───────────────────────────────────────────────────────────────
CREATE TABLE "invoices" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id"           uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "subscription_id"     uuid REFERENCES "subscriptions"("id") ON DELETE SET NULL,
  "provider"            text NOT NULL CHECK (provider IN ('abacatepay', 'stripe')),
  "provider_invoice_id" text NOT NULL,
  "status"              text NOT NULL CHECK (status IN ('open','paid','void','uncollectible','refunded')),
  "amount_cents"        integer NOT NULL,
  "currency"            char(3) NOT NULL,
  "paid_at"             timestamptz,
  "invoice_url"         text,
  "pdf_url"             text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("provider", "provider_invoice_id")
);

CREATE INDEX "invoices_clinic_id_idx" ON "invoices" ("clinic_id");
CREATE INDEX "invoices_subscription_id_idx" ON "invoices" ("subscription_id");
CREATE INDEX "invoices_status_idx" ON "invoices" ("status");

-- ── Billing events (idempotência de webhooks) ──────────────────────────────
-- Toda vez que um webhook chega, registramos aqui ANTES de processar.
-- Se o mesmo (provider, external_id) chegar de novo, ignoramos.
CREATE TABLE "billing_events" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"    text NOT NULL CHECK (provider IN ('abacatepay', 'stripe')),
  "external_id" text NOT NULL,
  "type"        text NOT NULL,
  "payload"     jsonb NOT NULL,
  "processed_at" timestamptz,
  "error"       text,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("provider", "external_id")
);

CREATE INDEX "billing_events_received_at_idx" ON "billing_events" ("received_at" DESC);
CREATE INDEX "billing_events_unprocessed_idx" ON "billing_events" ("received_at") WHERE processed_at IS NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Plans são públicos para leitura, billing_events são internos (apenas service_role).
-- Subscriptions e invoices: tenant-scoped via clinic_id.

ALTER TABLE "plans"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_events"  ENABLE ROW LEVEL SECURITY;

-- Plans: qualquer authenticated pode listar planos ativos
CREATE POLICY "plans_read_active" ON "plans"
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Subscriptions: tenant lê só as próprias
CREATE POLICY "subscriptions_tenant_read" ON "subscriptions"
  FOR SELECT TO authenticated
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Invoices: tenant lê só as próprias
CREATE POLICY "invoices_tenant_read" ON "invoices"
  FOR SELECT TO authenticated
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- billing_events: NUNCA via PostgREST. Apenas via service_role (backend API).
-- (sem policies; com RLS habilitado e sem policy, ninguém lê)

-- ── Triggers para updated_at ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_updated_at ON plans;
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
