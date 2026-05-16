-- ============================================================================
-- Setup do bucket privado "audio-sessions" no Supabase Storage
--
-- Execute este SQL no SQL Editor do Supabase Dashboard.
--
-- IMPORTANTE: o bucket é PRIVADO. A leitura é feita pelo backend via
-- signed URLs (service_role) — clientes nunca acessam objetos diretamente.
-- O upload é feito pelo frontend autenticado (policy INSERT abaixo).
-- ============================================================================

-- 1. Criar o bucket (se não existir) — privado, 50MB, mime audio/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-sessions',
  'audio-sessions',
  false,
  52428800, -- 50MB (limite default do plano Free)
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];

-- 2. Policy INSERT: terapeutas autenticados podem fazer upload em qualquer path do bucket.
--    Defesa em profundidade: o backend valida que audioPath começa com `<patientId>/`
--    e que o paciente pertence à clínica do usuário antes de criar a AudioSession.
DROP POLICY IF EXISTS "audio-sessions insert authenticated" ON storage.objects;
CREATE POLICY "audio-sessions insert authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-sessions');

-- 3. Policy SELECT: NÃO existe policy pública. Apenas service_role lê objetos
--    (via signed URL temporária emitida pelo backend). Esta policy permite
--    que o próprio uploader liste/verifique seus próprios uploads — opcional.
DROP POLICY IF EXISTS "audio-sessions select owner" ON storage.objects;
CREATE POLICY "audio-sessions select owner"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-sessions'
  AND auth.uid()::text = (storage.foldername(name))[1] -- compara primeira pasta com user id
);
-- Nota: como armazenamos sob `<patientId>/...` (não `<userId>/...`), a policy acima
-- raramente "match"-ará no frontend; está aqui só como defesa de listagem. O backend
-- nunca depende dela — usa service_role que bypassa RLS.

-- 4. Policy DELETE: autenticados podem deletar (controlado pelo backend que valida ownership).
DROP POLICY IF EXISTS "audio-sessions delete authenticated" ON storage.objects;
CREATE POLICY "audio-sessions delete authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-sessions');
