-- ============================================================================
-- Migration: 20260509000000_enable_row_level_security
-- ----------------------------------------------------------------------------
-- Defesa em profundidade: RLS em TODAS as tabelas multi-tenant.
--
-- Modelo de acesso:
--   • Backend Fastify usa service_role → bypass RLS (comportamento padrão).
--   • Qualquer cliente com chave anon ou JWT de usuário fica SUBMETIDO às políticas.
--   • Política base: row.clinic_id = clinic_id do usuário autenticado.
--   • AuditLog/ConsentRecord são append-only para usuários (UPDATE/DELETE bloqueado).
--
-- IMPORTANTE: o Supabase service_role JWT contém a claim "role":"service_role" e
-- por padrão `BYPASSRLS` está ON para esse role; portanto, o backend continua
-- funcionando sem mudanças.
-- ============================================================================

-- ── Helper: clinic_id do usuário autenticado ────────────────────────────────
-- SECURITY DEFINER + STABLE para permitir uso em USING/WITH CHECK sem recursão.
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT clinic_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_clinic_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_clinic_id() TO authenticated, anon;

-- ── Helper: role do usuário autenticado (THERAPIST / ADMIN / SECRETARY) ─────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role::text
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;

-- ── Macro: liga RLS + cria política tenant_isolation em uma tabela ──────────
-- Política: SELECT/INSERT/UPDATE/DELETE permitido sse clinic_id = current_clinic_id()
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clinics',
    'users',
    'patients',
    'appointments',
    'reports',
    'audio_sessions',
    'tasks',
    'transactions',
    'transaction_categories',
    'messages',
    'patient_goals',
    'goal_progress_snapshots',
    'goal_milestones',
    'notification_preferences',
    'notifications',
    'push_subscriptions',
    'treatment_plans',
    'treatment_sessions',
    'clinical_protocol_templates',
    'clinical_protocol_entries',
    'wa_conversations',
    'wa_messages',
    'therapeutic_materials',
    'exercise_templates',
    'patient_exercise_prescriptions',
    'caa_boards'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Tabela pode não existir ainda em ambientes antigos
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ── Tabela `clinics`: usuário só vê a própria clínica ───────────────────────
DROP POLICY IF EXISTS clinics_tenant_select ON public.clinics;
CREATE POLICY clinics_tenant_select ON public.clinics
  FOR SELECT TO authenticated
  USING (id = public.current_clinic_id());

DROP POLICY IF EXISTS clinics_tenant_update ON public.clinics;
CREATE POLICY clinics_tenant_update ON public.clinics
  FOR UPDATE TO authenticated
  USING (id = public.current_clinic_id() AND public.current_user_role() = 'ADMIN')
  WITH CHECK (id = public.current_clinic_id());

-- ── Tabela `users`: usuário vê membros da própria clínica ───────────────────
DROP POLICY IF EXISTS users_tenant_select ON public.users;
CREATE POLICY users_tenant_select ON public.users
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR id = auth.uid());

DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND clinic_id = public.current_clinic_id());

-- ── Política genérica tenant_isolation para tabelas com clinic_id ───────────
-- Aplicada a tabelas onde o filtro é puramente clinic_id.
-- NOTA: clinical_protocol_templates, treatment_sessions, wa_messages,
-- goal_progress_snapshots e goal_milestones ficam fora porque NÃO possuem
-- coluna clinic_id (templates globais ou filtro via tabela pai).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'patients',
    'appointments',
    'reports',
    'audio_sessions',
    'tasks',
    'transactions',
    'transaction_categories',
    'messages',
    'patient_goals',
    'notification_preferences',
    'notifications',
    'push_subscriptions',
    'treatment_plans',
    'clinical_protocol_entries',
    'wa_conversations',
    'therapeutic_materials',
    'patient_exercise_prescriptions',
    'caa_boards'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name=t) THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_tenant_all ON public.%I FOR ALL TO authenticated USING (clinic_id = public.current_clinic_id()) WITH CHECK (clinic_id = public.current_clinic_id())',
      t, t
    );
  END LOOP;
END $$;

-- ── treatment_sessions: filtro via treatment_plans (sem coluna clinic_id) ──
DROP POLICY IF EXISTS treatment_sessions_tenant ON public.treatment_sessions;
CREATE POLICY treatment_sessions_tenant ON public.treatment_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans p
      WHERE p.id = treatment_sessions.treatment_plan_id
        AND p.clinic_id = public.current_clinic_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.treatment_plans p
      WHERE p.id = treatment_sessions.treatment_plan_id
        AND p.clinic_id = public.current_clinic_id()
    )
  );

-- ── wa_messages: filtro via wa_conversations (sem coluna clinic_id) ───────
DROP POLICY IF EXISTS wa_messages_tenant ON public.wa_messages;
CREATE POLICY wa_messages_tenant ON public.wa_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wa_conversations c
      WHERE c.id = wa_messages.conversation_id
        AND c.clinic_id = public.current_clinic_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wa_conversations c
      WHERE c.id = wa_messages.conversation_id
        AND c.clinic_id = public.current_clinic_id()
    )
  );

-- ── ExerciseTemplate: clinic_id NULL = template nativo (todos veem) ─────────
DROP POLICY IF EXISTS exercise_templates_select ON public.exercise_templates;
CREATE POLICY exercise_templates_select ON public.exercise_templates
  FOR SELECT TO authenticated
  USING (clinic_id IS NULL OR clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS exercise_templates_modify ON public.exercise_templates;
CREATE POLICY exercise_templates_modify ON public.exercise_templates
  FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ── clinical_protocol_templates: tabela global (templates do sistema) ──────
-- Leitura livre para autenticados; escrita apenas via service_role (backend).
DROP POLICY IF EXISTS clinical_protocol_templates_read ON public.clinical_protocol_templates;
CREATE POLICY clinical_protocol_templates_read ON public.clinical_protocol_templates
  FOR SELECT TO authenticated
  USING (true);

-- ── goal_progress_snapshots / goal_milestones: filtro via patient_goals ─────
DROP POLICY IF EXISTS goal_snapshots_tenant ON public.goal_progress_snapshots;
CREATE POLICY goal_snapshots_tenant ON public.goal_progress_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_goals g
      WHERE g.id = goal_progress_snapshots.goal_id
        AND g.clinic_id = public.current_clinic_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_goals g
      WHERE g.id = goal_progress_snapshots.goal_id
        AND g.clinic_id = public.current_clinic_id()
    )
  );

DROP POLICY IF EXISTS goal_milestones_tenant ON public.goal_milestones;
CREATE POLICY goal_milestones_tenant ON public.goal_milestones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_goals g
      WHERE g.id = goal_milestones.goal_id
        AND g.clinic_id = public.current_clinic_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_goals g
      WHERE g.id = goal_milestones.goal_id
        AND g.clinic_id = public.current_clinic_id()
    )
  );

-- ── audit_logs: append-only, leitura apenas para ADMIN da clínica ───────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    clinic_id = public.current_clinic_id()
    AND public.current_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

-- (UPDATE/DELETE não têm política → bloqueado por padrão com RLS habilitado)

-- ── consent_records: append-only ─────────────────────────────────────────────
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_records_select ON public.consent_records;
CREATE POLICY consent_records_select ON public.consent_records
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS consent_records_insert ON public.consent_records;
CREATE POLICY consent_records_insert ON public.consent_records
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

-- (Sem políticas UPDATE/DELETE: registros de consentimento são imutáveis.)

-- ── library_chunks (RAG): leitura pública (artigos clínicos públicos) ───────
-- Tabela criada na migration 20260508000000_add_library_chunks.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='library_chunks') THEN
    EXECUTE 'ALTER TABLE public.library_chunks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS library_chunks_read ON public.library_chunks';
    EXECUTE 'CREATE POLICY library_chunks_read ON public.library_chunks
             FOR SELECT TO authenticated, anon
             USING (true)';
  END IF;
END $$;

-- ============================================================================
-- FIM. Para rollback manual:
--   ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;
--   DROP POLICY <p> ON <t>;
-- ============================================================================
