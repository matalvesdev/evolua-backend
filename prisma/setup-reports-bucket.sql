-- ============================================================================
-- Setup do bucket "reports" no Supabase Storage
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ============================================================================

-- 1. Criar o bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Política de INSERT: usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "Authenticated users can upload reports" ON storage.objects;
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- 3. Política de SELECT: qualquer pessoa pode ler (bucket público)
DROP POLICY IF EXISTS "Public read access for reports" ON storage.objects;
CREATE POLICY "Public read access for reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reports');

-- 4. Política de DELETE: usuários autenticados podem deletar
DROP POLICY IF EXISTS "Authenticated users can delete reports" ON storage.objects;
CREATE POLICY "Authenticated users can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reports');
