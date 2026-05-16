-- ============================================================================
-- Migration: 20260422000000_add_exercise_library
-- Cobre:
--   1. exercise_templates  — banco de exercícios terapêuticos fonoaudiológicos
--   2. patient_exercise_prescriptions — prescrições de exercícios por paciente
-- ============================================================================

-- 1. exercise_templates
CREATE TABLE IF NOT EXISTS exercise_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  area         TEXT        NOT NULL, -- "voz" | "disfagia" | "linguagem" | "motricidade_orofacial" | "fluencia" | "audicao"
  subarea      TEXT,
  description  TEXT        NOT NULL,
  instructions TEXT        NOT NULL,
  duration     INT,
  frequency    TEXT,
  repetitions  TEXT,
  video_url    TEXT,
  image_url    TEXT,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  difficulty   TEXT        NOT NULL DEFAULT 'medium',
  age_group    TEXT        NOT NULL DEFAULT 'all',
  is_system    BOOLEAN     NOT NULL DEFAULT TRUE,
  clinic_id    UUID        REFERENCES clinics(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_area_subarea
  ON exercise_templates (area, subarea);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_clinic_id
  ON exercise_templates (clinic_id);

-- 2. patient_exercise_prescriptions
CREATE TABLE IF NOT EXISTS patient_exercise_prescriptions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id           UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id          UUID        NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,
  treatment_plan_id    UUID        REFERENCES treatment_plans(id) ON DELETE SET NULL,
  custom_instructions  TEXT,
  frequency            TEXT        NOT NULL,
  repetitions          TEXT,
  duration_days        INT,
  start_date           DATE        NOT NULL,
  end_date             DATE,
  status               TEXT        NOT NULL DEFAULT 'active',
  sent_at              TIMESTAMPTZ,
  sent_via             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_clinic_patient_status
  ON patient_exercise_prescriptions (clinic_id, patient_id, status);

CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_patient_start_date
  ON patient_exercise_prescriptions (patient_id, start_date);
