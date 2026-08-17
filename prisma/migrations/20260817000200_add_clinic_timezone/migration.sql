-- Expand: Brasil-first fallback para evitar que o timezone do host determine
-- agenda, lembretes e analytics. O default preenche linhas existentes sem
-- depender de backfill manual; cada clínica poderá ser configurada depois.
ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "time_zone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE "clinics"
  ADD CONSTRAINT "clinics_time_zone_non_empty"
  CHECK (char_length(btrim("time_zone")) > 0);
