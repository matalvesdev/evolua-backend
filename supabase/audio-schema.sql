-- ============================================================================
-- Audio Sessions and Transcriptions
-- ============================================================================

-- Audio sessions table
CREATE TABLE IF NOT EXISTS public.audio_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  therapist_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  audio_duration INTEGER, -- in seconds
  file_size INTEGER, -- in bytes
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_error TEXT,
  transcribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audio sessions
CREATE INDEX IF NOT EXISTS idx_audio_sessions_clinic_id ON public.audio_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_patient_id ON public.audio_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_appointment_id ON public.audio_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_therapist_id ON public.audio_sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_status ON public.audio_sessions(transcription_status);

-- RLS for audio sessions
ALTER TABLE public.audio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audio sessions from their clinic"
  ON public.audio_sessions FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert audio sessions to their clinic"
  ON public.audio_sessions FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update audio sessions from their clinic"
  ON public.audio_sessions FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete audio sessions from their clinic"
  ON public.audio_sessions FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- Storage Buckets
-- ============================================================================

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-sessions', 'audio-sessions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio files
CREATE POLICY "Users can upload audio files to their clinic"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-sessions' AND
    auth.uid() IN (SELECT id FROM public.users)
  );

CREATE POLICY "Users can view audio files from their clinic"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-sessions');

CREATE POLICY "Users can delete audio files from their clinic"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audio-sessions' AND auth.uid() IN (SELECT id FROM public.users));
