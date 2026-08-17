-- ============================================================================
-- Setup do bucket privado "audio-sessions" no Supabase Storage
--
-- Execute este SQL no SQL Editor do Supabase Dashboard.
--
-- IMPORTANTE: o bucket é PRIVADO. A leitura é feita pelo backend via
-- signed URLs (service_role) — clientes nunca acessam objetos diretamente.
-- O upload é feito por token temporário emitido pelo backend após validar
-- clinic/patient. O frontend não recebe uma policy direta no bucket.
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

-- Não criar policies para `authenticated` neste bucket. URLs de upload
-- assinadas pelo backend não exigem policy de INSERT e downloads usam URLs
-- assinadas de curta duração emitidas pelo backend.
