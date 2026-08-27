-- Expand: Brasil-first fallback para evitar que o timezone do host determine
-- agenda, lembretes e analytics. O default preenche linhas existentes sem
-- depender de backfill manual; cada clínica poderá ser configurada depois.
ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "time_zone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clinics_time_zone_non_empty'
      AND conrelid = 'clinics'::regclass
  ) THEN
    ALTER TABLE "clinics"
      ADD CONSTRAINT "clinics_time_zone_non_empty"
      CHECK (char_length(btrim("time_zone")) > 0);
  END IF;
END
$$;
