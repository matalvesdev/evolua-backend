-- ============================================================================
-- Migration: 20260421000000_security_fixes_and_new_features
-- Cobre:
--   1. signatureTokenExpiresAt no reports
--   2. reminder24hSentAt / reminder1hSentAt no appointments (MED-08)
--   3. TreatmentPlan + TreatmentSession
--   4. ClinicalProtocolTemplate + ClinicalProtocolEntry
--   5. WaConversation + WaMessage
--   6. TherapeuticMaterial
-- ============================================================================

-- 1. Reports: expiração do token de assinatura
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS signature_token_expires_at TIMESTAMPTZ;

-- 2. Appointments: deduplicação de lembretes (MED-08)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_24h
  ON appointments (date_time, status, deleted_at)
  WHERE reminder_24h_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_1h
  ON appointments (date_time, status, deleted_at)
  WHERE reminder_1h_sent_at IS NULL;

-- 3. TreatmentPlan
CREATE TABLE IF NOT EXISTS treatment_plans (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id            UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                 TEXT        NOT NULL,
  diagnosis             TEXT,
  objectives            TEXT[]      NOT NULL DEFAULT '{}',
  total_sessions        INT         NOT NULL,
  used_sessions         INT         NOT NULL DEFAULT 0,
  status                TEXT        NOT NULL DEFAULT 'active',
  insurance_name        TEXT,
  authorization_code    TEXT,
  authorization_expiry  DATE,
  start_date            DATE        NOT NULL,
  expected_end_date     DATE,
  completed_at          TIMESTAMPTZ,
  notes                 TEXT,
  reminder_3_sent       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic_status   ON treatment_plans(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_status  ON treatment_plans(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_therapist       ON treatment_plans(therapist_id);

-- 4. TreatmentSession
CREATE TABLE IF NOT EXISTS treatment_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID        NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  appointment_id    UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  session_number    INT         NOT NULL,
  conducted_at      TIMESTAMPTZ NOT NULL,
  evolution         TEXT,
  goal_progress     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_sessions_plan ON treatment_sessions(treatment_plan_id, session_number);

-- 5. ClinicalProtocolTemplate
CREATE TABLE IF NOT EXISTS clinical_protocol_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  area        TEXT        NOT NULL,
  description TEXT,
  version     TEXT        NOT NULL DEFAULT '1.0',
  fields      JSONB       NOT NULL DEFAULT '[]',
  is_system   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_protocol_templates_area ON clinical_protocol_templates(area);

-- 6. ClinicalProtocolEntry
CREATE TABLE IF NOT EXISTS clinical_protocol_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id        UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  treatment_plan_id UUID        REFERENCES treatment_plans(id) ON DELETE SET NULL,
  appointment_id    UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  template_id       UUID        NOT NULL REFERENCES clinical_protocol_templates(id) ON DELETE CASCADE,
  values            JSONB       NOT NULL DEFAULT '{}',
  total_score       FLOAT,
  interpretation    TEXT,
  conducted_at      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpe_clinic_patient    ON clinical_protocol_entries(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_cpe_patient_template  ON clinical_protocol_entries(patient_id, template_id, conducted_at);

-- 7. WaConversation
CREATE TABLE IF NOT EXISTS wa_conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  phone      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_clinic ON wa_conversations(clinic_id, updated_at);

-- 8. WaMessage
CREATE TABLE IF NOT EXISTS wa_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  direction       TEXT        NOT NULL DEFAULT 'outbound',
  type            TEXT        NOT NULL DEFAULT 'text',
  content         TEXT        NOT NULL,
  media_url       TEXT,
  payment_link    TEXT,
  payment_amount  DECIMAL,
  status          TEXT        NOT NULL DEFAULT 'sent',
  evolution_id    TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON wa_messages(conversation_id, sent_at);

-- 9. TherapeuticMaterial
CREATE TABLE IF NOT EXISTS therapeutic_materials (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  therapist_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  area         TEXT        NOT NULL,
  type         TEXT        NOT NULL,
  file_url     TEXT,
  content      TEXT,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  is_public    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_therapeutic_materials_clinic ON therapeutic_materials(clinic_id, area, type);

-- ============================================================================
-- Seed: Protocolos clínicos nativos do Evolua
-- ============================================================================

INSERT INTO clinical_protocol_templates (id, name, area, description, version, fields, is_system) VALUES

-- MBGR — Miofuncional Orofacial (Fonoaudiologia)
(gen_random_uuid(), 'MBGR', 'fonoaudiologia',
 'Protocolo de Avaliação Miofuncional Orofacial com Escores — Marchesan, Berretin-Felix, Genaro e Rehder',
 '2.0',
 '[
   {"key":"face","label":"Morfologia da face","type":"select","options":["Normal","Alterada"]},
   {"key":"nariz","label":"Morfologia do nariz","type":"select","options":["Normal","Alterada"]},
   {"key":"labios_repouso","label":"Lábios em repouso","type":"select","options":["Fechados","Entrabertos","Abertos"]},
   {"key":"tonus_labial","label":"Tônus labial","type":"select","options":["Normal","Reduzido","Aumentado"]},
   {"key":"lingua_repouso","label":"Língua em repouso","type":"select","options":["Normal — assoalho","Baixa","Interposta","Posteriorizada"]},
   {"key":"palato_duro","label":"Palato duro","type":"select","options":["Normal","Alto e estreito","Ogival"]},
   {"key":"mordida","label":"Oclusão / Mordida","type":"select","options":["Normal","Mordida aberta anterior","Mordida cruzada","Sobressaliência aumentada","Sobremordida aumentada"]},
   {"key":"respiracao","label":"Modo respiratório","type":"select","options":["Nasal","Oral","Oronasal"]},
   {"key":"mastigacao","label":"Mastigação","type":"select","options":["Normal bilateral","Unilateral preferencial","Unilateral exclusiva","Anterior","Ruidosa"]},
   {"key":"deglutição","label":"Deglutição","type":"select","options":["Adequada","Com pressão de língua anteriorizada","Com interposição lingual","Com contração da musculatura perioral","Com ruído"]},
   {"key":"fala_articulacao","label":"Articulação na fala","type":"select","options":["Normal","Distorção de sibilantes","Ceceio anterior","Ceceio lateral","Trocas","Omissões"]},
   {"key":"voz","label":"Qualidade vocal","type":"select","options":["Normal","Rouca","Soprosa","Tensa","Nasalizada"]},
   {"key":"score_total","label":"Escore total MBGR","type":"number","min":0,"max":200},
   {"key":"observacoes","label":"Observações","type":"textarea"}
 ]'::jsonb,
 true),

-- VHI-10 — Voice Handicap Index (Fonoaudiologia)
(gen_random_uuid(), 'VHI-10', 'fonoaudiologia',
 'Voice Handicap Index — versão reduzida (10 itens). Avalia o impacto do problema vocal na qualidade de vida.',
 '1.0',
 '[
   {"key":"q1","label":"Minha voz faz com que seja difícil para as pessoas me ouvirem","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q2","label":"Fico sem ar quando falo","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q3","label":"As pessoas tem dificuldade em me entender em ambientes ruidosos","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q4","label":"O problema com minha voz parece variar ao longo do dia","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q5","label":"Minha família tem dificuldade em me ouvir quando os chamo","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q6","label":"Eu uso o telefone menos do que eu gostaria por causa da minha voz","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q7","label":"Estou tenso quando falo com outras pessoas por causa da minha voz","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q8","label":"Percebo que as pessoas evitam conversar comigo por causa da minha voz","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q9","label":"Minha voz me incomoda","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]},
   {"key":"q10","label":"As pessoas me pedem para repetir o que eu falo","type":"scale","min":0,"max":4,"labels":["Nunca","Quase nunca","Às vezes","Quase sempre","Sempre"]}
 ]'::jsonb,
 true),

-- FOIS — Functional Oral Intake Scale (Fonoaudiologia — Disfagia)
(gen_random_uuid(), 'FOIS', 'fonoaudiologia',
 'Functional Oral Intake Scale — avalia a ingestão oral funcional em pacientes com disfagia.',
 '1.0',
 '[
   {"key":"nivel","label":"Nível FOIS","type":"select","options":[
     "1 — Nada por via oral",
     "2 — Dependente de via alternativa com mínima via oral",
     "3 — Dependente de via alternativa com consistente via oral",
     "4 — Via oral total de uma única consistência",
     "5 — Via oral total com múltiplas consistências, porém com necessidade de preparo especial",
     "6 — Via oral total com múltiplas consistências sem necessidade de preparo especial, porém com restrições alimentares",
     "7 — Via oral total sem restrições"
   ]},
   {"key":"data_avaliacao","label":"Data da avaliação","type":"date"},
   {"key":"observacoes","label":"Observações clínicas","type":"textarea"}
 ]'::jsonb,
 true),

-- FIM — Functional Independence Measure (Fisioterapia / TO)
(gen_random_uuid(), 'FIM', 'fisioterapia',
 'Medida de Independência Funcional — 18 itens avaliando autocuidado, controle esfincteriano, transferências, locomoção, comunicação e cognição social.',
 '1.0',
 '[
   {"key":"alimentacao","label":"Alimentação","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"higiene","label":"Higiene pessoal","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"banho","label":"Banho (lavar o corpo)","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"vestir_mmss","label":"Vestuário — metade superior","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"vestir_mmii","label":"Vestuário — metade inferior","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"uso_sanitario","label":"Uso do sanitário","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"controle_bexiga","label":"Controle da bexiga","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"controle_intestino","label":"Controle do intestino","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"transf_cama","label":"Transferência: cama/cadeira/cadeira de rodas","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"transf_sanitario","label":"Transferência: sanitário","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"transf_banheiro","label":"Transferência: banheiro","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"marcha","label":"Marcha/Cadeira de rodas","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"escadas","label":"Escadas","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"compreensao","label":"Compreensão","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"expressao","label":"Expressão","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"interacao_social","label":"Interação social","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"resolucao_problemas","label":"Resolução de problemas","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]},
   {"key":"memoria","label":"Memória","type":"scale","min":1,"max":7,"labels":["1-Dep total","2","3","4-Dep mínima","5","6","7-Independ total"]}
 ]'::jsonb,
 true),

-- Barthel — Índice de Barthel (Fisioterapia / TO)
(gen_random_uuid(), 'Índice de Barthel', 'fisioterapia',
 'Índice de Barthel — avalia o nível de independência do paciente para realização de 10 atividades básicas de vida diária.',
 '1.0',
 '[
   {"key":"alimentacao","label":"Alimentação","type":"select","options":["0-Dependente","5-Ajuda","10-Independente"]},
   {"key":"banho","label":"Banho","type":"select","options":["0-Dependente","5-Independente"]},
   {"key":"higiene_pessoal","label":"Higiene pessoal","type":"select","options":["0-Dependente","5-Independente"]},
   {"key":"vestir","label":"Vestir","type":"select","options":["0-Dependente","5-Necessita ajuda","10-Independente"]},
   {"key":"controle_intestinal","label":"Controle intestinal","type":"select","options":["0-Incontinente","5-Acidente ocasional","10-Continente"]},
   {"key":"controle_vesical","label":"Controle vesical","type":"select","options":["0-Incontinente","5-Acidente ocasional","10-Continente"]},
   {"key":"uso_sanitario","label":"Uso do sanitário","type":"select","options":["0-Dependente","5-Necessita ajuda","10-Independente"]},
   {"key":"transferencia","label":"Transferência cadeira/cama","type":"select","options":["0-Dependente","5-Grande ajuda","10-Pequena ajuda","15-Independente"]},
   {"key":"marcha","label":"Marcha","type":"select","options":["0-Imóvel","5-Cadeira de rodas independente","10-Caminha com ajuda","15-Independente"]},
   {"key":"escadas","label":"Subir escadas","type":"select","options":["0-Dependente","5-Necessita ajuda","10-Independente"]},
   {"key":"score_total","label":"Escore total Barthel (0-100)","type":"number","min":0,"max":100}
 ]'::jsonb,
 true),

-- GRBAS — Avaliação Vocal (Fonoaudiologia)
(gen_random_uuid(), 'GRBAS', 'fonoaudiologia',
 'Escala GRBAS de avaliação perceptivo-auditiva da voz — Grade, Roughness, Breathiness, Asthenia, Strain.',
 '1.0',
 '[
   {"key":"G","label":"G — Grau geral de disfonia","type":"scale","min":0,"max":3,"labels":["0-Normal","1-Disfonia leve","2-Disfonia moderada","3-Disfonia intensa"]},
   {"key":"R","label":"R — Rugosidade (Roughness)","type":"scale","min":0,"max":3,"labels":["0-Ausente","1-Leve","2-Moderada","3-Intensa"]},
   {"key":"B","label":"B — Soprosidade (Breathiness)","type":"scale","min":0,"max":3,"labels":["0-Ausente","1-Leve","2-Moderada","3-Intensa"]},
   {"key":"A","label":"A — Astenia","type":"scale","min":0,"max":3,"labels":["0-Ausente","1-Leve","2-Moderada","3-Intensa"]},
   {"key":"S","label":"S — Tensão (Strain)","type":"scale","min":0,"max":3,"labels":["0-Ausente","1-Leve","2-Moderada","3-Intensa"]},
   {"key":"f0_habitual","label":"Frequência fundamental habitual (Hz)","type":"number","min":50,"max":500,"unit":"Hz"},
   {"key":"observacoes","label":"Observações","type":"textarea"}
 ]'::jsonb,
 true),

-- VMPAC — Vocabulário Expressivo (Fonoaudiologia infantil)
(gen_random_uuid(), 'VMPAC', 'fonoaudiologia',
 'Verificação de Vocabulário por Meio de Prova de Associação Categórica — avalia linguagem expressiva em crianças.',
 '1.0',
 '[
   {"key":"idade_cronologica","label":"Idade cronológica","type":"text","placeholder":"ex: 4a 3m"},
   {"key":"animais","label":"Animais (nomeados em 1 min)","type":"number","min":0,"max":50},
   {"key":"frutas","label":"Frutas (nomeadas em 1 min)","type":"number","min":0,"max":50},
   {"key":"veiculos","label":"Veículos (nomeados em 1 min)","type":"number","min":0,"max":50},
   {"key":"total_palavras","label":"Total de palavras","type":"number","min":0},
   {"key":"percentil","label":"Percentil para a idade","type":"select","options":["<10","10-25","25-50","50-75","75-90",">90"]},
   {"key":"classificacao","label":"Classificação","type":"select","options":["Abaixo do esperado","Limítrofe","Adequado para a idade","Acima do esperado"]},
   {"key":"observacoes","label":"Observações","type":"textarea"}
 ]'::jsonb,
 true),

-- Denver II — Triagem do Desenvolvimento (Fonoaudiologia / TO infantil)
(gen_random_uuid(), 'Denver II', 'fonoaudiologia',
 'Teste de Triagem do Desenvolvimento de Denver II — avalia 4 áreas do desenvolvimento infantil.',
 '2.0',
 '[
   {"key":"idade_cronologica","label":"Idade cronológica","type":"text"},
   {"key":"pessoal_social","label":"Pessoal-Social","type":"select","options":["Normal","Suspeito","Não testável"]},
   {"key":"motor_fino","label":"Motor Fino-Adaptativo","type":"select","options":["Normal","Suspeito","Não testável"]},
   {"key":"linguagem","label":"Linguagem","type":"select","options":["Normal","Suspeito","Não testável"]},
   {"key":"motor_grosso","label":"Motor Grosso","type":"select","options":["Normal","Suspeito","Não testável"]},
   {"key":"resultado_geral","label":"Resultado Geral","type":"select","options":["Normal","Suspeito","Não testável","Anormal"]},
   {"key":"observacoes","label":"Observações","type":"textarea"}
 ]'::jsonb,
 true)

ON CONFLICT DO NOTHING;
