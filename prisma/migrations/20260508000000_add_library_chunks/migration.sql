-- ============================================================================
-- Migration: 20260508000000_add_library_chunks
-- Cobre RAG da biblioteca clínica:
--   1. extension pgvector
--   2. library_documents — metadados do PDF/artigo ingerido
--   3. library_chunks    — trechos com embedding (intfloat/multilingual-e5-small = 384d)
--
-- A coluna `embedding vector(384)` precisa coincidir com
-- `huggingface_embedding_dim` no apps/ai/app/config.py.
-- Se trocar de modelo, drop+recreate a coluna ou migrate dados.
-- ============================================================================

-- 0. Extension (idempotente; superuser/Supabase já tem disponível)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. library_documents
CREATE TABLE IF NOT EXISTS library_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL,
  title       TEXT        NOT NULL,
  source      TEXT        NOT NULL,                 -- ex: "manual_apraxia.pdf"
  source_url  TEXT,                                 -- URL pública opcional
  author      TEXT,
  specialty   TEXT,                                 -- "fonoaudiologia" | etc.
  language    TEXT        NOT NULL DEFAULT 'pt-BR',
  chunk_count INTEGER     NOT NULL DEFAULT 0,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,

  CONSTRAINT library_documents_clinic_fk
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_library_documents_clinic
  ON library_documents (clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_documents_specialty
  ON library_documents (specialty) WHERE deleted_at IS NULL;

-- 2. library_chunks
CREATE TABLE IF NOT EXISTS library_chunks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID        NOT NULL,
  clinic_id     UUID        NOT NULL,                  -- denormalizado p/ filtro rápido
  chunk_index   INTEGER     NOT NULL,
  source        TEXT        NOT NULL,                  -- mesmo da library_documents.source
  title         TEXT,
  source_url    TEXT,
  page          INTEGER,
  snippet       TEXT        NOT NULL,
  embedding     vector(384) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT library_chunks_document_fk
    FOREIGN KEY (document_id) REFERENCES library_documents(id) ON DELETE CASCADE,
  CONSTRAINT library_chunks_unique_chunk UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_library_chunks_clinic
  ON library_chunks (clinic_id);
CREATE INDEX IF NOT EXISTS idx_library_chunks_document
  ON library_chunks (document_id);

-- ANN index — IVFFlat com 100 listas é suficiente até ~100k chunks.
-- Se a tabela ficar muito grande, troque para HNSW (Postgres 16+ + pgvector 0.7+).
CREATE INDEX IF NOT EXISTS idx_library_chunks_embedding
  ON library_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
