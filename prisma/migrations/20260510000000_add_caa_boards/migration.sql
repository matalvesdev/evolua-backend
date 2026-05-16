-- ============================================================================
-- CAA Boards — Pranchas de Comunicação Aumentativa e Alternativa
-- ============================================================================

CREATE TABLE "caa_boards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "patient_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rows" INTEGER NOT NULL DEFAULT 3,
    "cols" INTEGER NOT NULL DEFAULT 5,
    "cells" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'Personalizado',
    "therapeutic_objective" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "caa_boards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "caa_boards_clinic_id_therapist_id_idx" ON "caa_boards"("clinic_id", "therapist_id");
CREATE INDEX "caa_boards_clinic_id_patient_id_idx" ON "caa_boards"("clinic_id", "patient_id");
CREATE INDEX "caa_boards_clinic_id_category_idx" ON "caa_boards"("clinic_id", "category");

ALTER TABLE "caa_boards" ADD CONSTRAINT "caa_boards_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "caa_boards" ADD CONSTRAINT "caa_boards_therapist_id_fkey"
    FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "caa_boards" ADD CONSTRAINT "caa_boards_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security — backend usa service_role (bypass); authenticated/anon submetidos
ALTER TABLE "caa_boards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY caa_boards_tenant_all ON "caa_boards"
    FOR ALL TO authenticated
    USING (clinic_id = public.current_clinic_id())
    WITH CHECK (clinic_id = public.current_clinic_id());
