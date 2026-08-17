-- Expand-only migration: historical rows represent deliveries already recorded
-- by the legacy model, so their default remains `sent`.
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "delivery_status" TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delivery_error" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_attempted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "messages_clinic_idempotency_key_unique"
  ON "messages" ("clinic_id", "idempotency_key");
