-- Migration: add_google_calendar_portal_signature
-- Adds:
--   users.google_calendar_tokens       (JSON para tokens OAuth Google Calendar)
--   appointments.google_calendar_event_id  (ID do evento no Google Calendar)
--   appointments.confirmation_token        (Token público para portal do paciente)
--   appointments.confirmation_token_expires_at
--   reports.signature_token            (Token para assinatura digital)
--   reports.signed_at
--   reports.signed_by

-- Users: Google Calendar OAuth tokens
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "google_calendar_tokens" JSONB;

-- Appointments: Google Calendar event ID
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "google_calendar_event_id" TEXT;

-- Appointments: Portal do paciente — confirmation token
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "confirmation_token" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmation_token_expires_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "appointments_confirmation_token_idx"
  ON "appointments" ("confirmation_token")
  WHERE "confirmation_token" IS NOT NULL;

-- Reports: Digital signature
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "signature_token" TEXT,
  ADD COLUMN IF NOT EXISTS "signed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "signed_by" TEXT;

CREATE INDEX IF NOT EXISTS "reports_signature_token_idx"
  ON "reports" ("signature_token")
  WHERE "signature_token" IS NOT NULL;
