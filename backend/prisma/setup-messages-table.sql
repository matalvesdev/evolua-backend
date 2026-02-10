-- ============================================================================
-- MESSAGES TABLE
-- Cria a tabela de mensagens se não existir
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  template_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their clinic messages" ON public.messages;
CREATE POLICY "Users can view their clinic messages"
  ON public.messages FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics WHERE id IN (
        SELECT clinic_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert messages for their clinic" ON public.messages;
CREATE POLICY "Users can insert messages for their clinic"
  ON public.messages FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics WHERE id IN (
        SELECT clinic_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their clinic messages" ON public.messages;
CREATE POLICY "Users can delete their clinic messages"
  ON public.messages FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics WHERE id IN (
        SELECT clinic_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_clinic_id ON public.messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON public.messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_therapist_id ON public.messages(therapist_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);
