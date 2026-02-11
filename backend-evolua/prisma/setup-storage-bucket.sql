-- ============================================================================
-- Setup do bucket "audio-sessions" no Supabase Storage
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ============================================================================

-- 1. Criar o bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-sessions',
  'audio-sessions',
  true,
  104857600, -- 100MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];

-- 2. Política de INSERT: usuários autenticados podem fazer upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-sessions');

-- 3. Política de SELECT: qualquer pessoa pode ler (bucket público)
CREATE POLICY IF NOT EXISTS "Public read access for audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-sessions');

-- 4. Política de DELETE: usuários autenticados podem deletar seus arquivos
CREATE POLICY IF NOT EXISTS "Authenticated users can delete audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-sessions');
