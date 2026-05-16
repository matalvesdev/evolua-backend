"""Ingestão de documentos para a biblioteca clínica (RAG).

Fluxo:
1. Cliente faz upload de PDF/TXT/MD via multipart OU envia URL pública
   (Supabase Storage signed URL etc.).
2. Extraímos texto, dividimos em chunks (~800 tokens c/ overlap) e geramos
   embeddings via HuggingFace (`intfloat/multilingual-e5-small`, dim=384).
3. Inserimos `library_documents` + `library_chunks` em transação.

A migration `20260508000000_add_library_chunks` precisa estar aplicada.
Quando a tabela não existe, retornamos 503 com instrução clara.
"""
from __future__ import annotations

import io
import logging
import re
import time
from typing import Any
from uuid import UUID

import httpx
import psycopg
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
)
from pydantic import BaseModel, Field

from ..config import get_settings
from ..deps import get_user_id, verify_internal_token
from ..hf_client import HuggingFaceError, HuggingFaceModelLoading, hf_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/library", tags=["library-ingest"])


# ── Contracts ─────────────────────────────────────────────────────────────


class IngestResponse(BaseModel):
    document_id: str
    chunks: int
    latency_ms: int


class LibraryDocument(BaseModel):
    id: str
    title: str
    source: str
    source_url: str | None = None
    author: str | None = None
    specialty: str | None = None
    language: str
    chunk_count: int
    created_at: str


class DocumentListResponse(BaseModel):
    items: list[LibraryDocument]
    total: int


# ── Helpers: extração de texto ────────────────────────────────────────────


def _extract_text_from_pdf(blob: bytes) -> list[tuple[int, str]]:
    """Retorna lista [(page_number_1based, text)]."""
    try:
        from pypdf import PdfReader
    except ImportError as e:  # pragma: no cover
        raise HTTPException(500, "pypdf não instalado no ambiente AI") from e

    reader = PdfReader(io.BytesIO(blob))
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages, 1):
        try:
            text = page.extract_text() or ""
        except Exception as e:  # noqa: BLE001
            logger.warning("PDF page %d extract failed: %s", i, e)
            text = ""
        pages.append((i, text))
    return pages


def _extract_text_plain(blob: bytes) -> list[tuple[int, str]]:
    text = blob.decode("utf-8", errors="replace")
    return [(1, text)]


# Aproximação simples: 1 token ≈ 4 chars em PT-BR. Janela ~800 tokens = 3200 chars.
CHUNK_SIZE = 3200
CHUNK_OVERLAP = 400


def _chunk_text(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Divide preservando o número da página de origem do início do chunk."""
    chunks: list[tuple[int, str]] = []
    for page_num, text in pages:
        clean = re.sub(r"\s+", " ", text).strip()
        if not clean:
            continue
        if len(clean) <= CHUNK_SIZE:
            chunks.append((page_num, clean))
            continue
        start = 0
        while start < len(clean):
            end = min(start + CHUNK_SIZE, len(clean))
            chunks.append((page_num, clean[start:end]))
            if end == len(clean):
                break
            start = end - CHUNK_OVERLAP
    return chunks


def _vec_literal(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


# ── Persistência ──────────────────────────────────────────────────────────


def _insert_document_and_chunks(
    *,
    clinic_id: str,
    user_id: str | None,
    title: str,
    source: str,
    source_url: str | None,
    author: str | None,
    specialty: str | None,
    language: str,
    chunks: list[tuple[int, str]],
    embeddings: list[list[float]],
) -> str:
    settings = get_settings()
    sql_doc = """
        INSERT INTO library_documents
          (clinic_id, title, source, source_url, author, specialty, language, chunk_count, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    sql_chunk = """
        INSERT INTO library_chunks
          (document_id, clinic_id, chunk_index, source, title, source_url, page, snippet, embedding)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
    """

    try:
        with psycopg.connect(settings.database_url, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql_doc,
                    (
                        clinic_id,
                        title,
                        source,
                        source_url,
                        author,
                        specialty,
                        language,
                        len(chunks),
                        user_id,
                    ),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(500, "Falha ao inserir library_document")
                doc_id = str(row[0])

                for idx, ((page, snippet), emb) in enumerate(
                    zip(chunks, embeddings, strict=True)
                ):
                    cur.execute(
                        sql_chunk,
                        (
                            doc_id,
                            clinic_id,
                            idx,
                            source,
                            title,
                            source_url,
                            page,
                            snippet,
                            _vec_literal(emb),
                        ),
                    )
            conn.commit()
            return doc_id
    except psycopg.errors.UndefinedTable as e:
        raise HTTPException(
            503,
            "Tabelas library_documents/library_chunks não encontradas. "
            "Aplique a migration 20260508000000_add_library_chunks.",
        ) from e


# ── Endpoints ─────────────────────────────────────────────────────────────


MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post(
    "/ingest",
    response_model=IngestResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def ingest_document(
    file: UploadFile | None = File(default=None),
    source_url: str | None = Form(default=None),
    title: str = Form(...),
    author: str | None = Form(default=None),
    specialty: str | None = Form(default=None),
    language: str = Form(default="pt-BR"),
    x_clinic_id: str = Header(...),
    user_id: str = Depends(get_user_id),
) -> IngestResponse:
    """Ingere um documento na biblioteca da clínica.

    Aceita upload (`file`) OU `source_url`. Formatos: pdf, txt, md.
    """
    started = time.perf_counter()
    try:
        UUID(x_clinic_id)
    except ValueError as e:
        raise HTTPException(400, "x-clinic-id inválido") from e

    # 1. Obtém bytes + metadata
    if file is not None:
        blob = await file.read()
        if len(blob) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, f"Arquivo excede {MAX_UPLOAD_BYTES} bytes")
        filename = file.filename or "document"
        content_type = (file.content_type or "").lower()
        source = filename
    elif source_url:
        if not source_url.startswith("https://"):
            raise HTTPException(400, "source_url deve ser https")
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            r = await client.get(source_url)
        if r.status_code >= 400:
            raise HTTPException(400, f"Falha ao baixar source_url: {r.status_code}")
        blob = r.content
        if len(blob) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Documento remoto excede 25MB")
        filename = source_url.rsplit("/", 1)[-1].split("?", 1)[0] or "remote"
        content_type = r.headers.get("content-type", "").lower()
        source = filename
    else:
        raise HTTPException(400, "Envie 'file' (multipart) ou 'source_url' (form)")

    # 2. Extrai texto
    is_pdf = "pdf" in content_type or filename.lower().endswith(".pdf")
    pages = _extract_text_from_pdf(blob) if is_pdf else _extract_text_plain(blob)

    chunks = _chunk_text(pages)
    if not chunks:
        raise HTTPException(422, "Nenhum texto extraído do documento")

    # 3. Embeddings (e5 exige prefixo "passage: ")
    if not hf_client.is_enabled():
        raise HTTPException(503, "HUGGINGFACE_API_KEY não configurada")

    snippets = [c[1] for c in chunks]
    try:
        embeddings = await _embed_in_batches(snippets, batch=16)
    except HuggingFaceModelLoading as e:
        raise HTTPException(503, str(e)) from e
    except HuggingFaceError as e:
        logger.error("HF embed failed: %s", e)
        raise HTTPException(502, f"AI provider error: {e}") from e

    if len(embeddings) != len(chunks):
        raise HTTPException(500, "Mismatch entre embeddings e chunks")

    # 4. Insere
    doc_id = _insert_document_and_chunks(
        clinic_id=x_clinic_id,
        user_id=user_id,
        title=title,
        source=source,
        source_url=source_url,
        author=author,
        specialty=specialty,
        language=language,
        chunks=chunks,
        embeddings=embeddings,
    )

    return IngestResponse(
        document_id=doc_id,
        chunks=len(chunks),
        latency_ms=int((time.perf_counter() - started) * 1000),
    )


async def _embed_in_batches(
    texts: list[str], *, batch: int = 16
) -> list[list[float]]:
    out: list[list[float]] = []
    for i in range(0, len(texts), batch):
        sub = [f"passage: {t}" for t in texts[i : i + batch]]
        vecs = await hf_client.embed(sub)
        out.extend(vecs)
    return out


@router.get(
    "/documents",
    response_model=DocumentListResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def list_documents(
    x_clinic_id: str = Header(...),
    specialty: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> DocumentListResponse:
    settings = get_settings()
    try:
        UUID(x_clinic_id)
    except ValueError as e:
        raise HTTPException(400, "x-clinic-id inválido") from e
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    where = ["clinic_id = %s", "deleted_at IS NULL"]
    args: list[Any] = [x_clinic_id]
    if specialty:
        where.append("specialty = %s")
        args.append(specialty)

    sql = f"""
        SELECT id, title, source, source_url, author, specialty, language,
               chunk_count, created_at
        FROM library_documents
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    sql_count = f"SELECT COUNT(*) FROM library_documents WHERE {' AND '.join(where)}"

    try:
        with psycopg.connect(settings.database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (*args, limit, offset))
                cols = [c.name for c in cur.description or []]
                rows = [dict(zip(cols, row, strict=False)) for row in cur.fetchall()]
                cur.execute(sql_count, args)
                total_row = cur.fetchone()
                total = int(total_row[0]) if total_row else 0
    except psycopg.errors.UndefinedTable:
        return DocumentListResponse(items=[], total=0)

    items = [
        LibraryDocument(
            id=str(r["id"]),
            title=r["title"],
            source=r["source"],
            source_url=r.get("source_url"),
            author=r.get("author"),
            specialty=r.get("specialty"),
            language=r["language"],
            chunk_count=r["chunk_count"],
            created_at=r["created_at"].isoformat(),
        )
        for r in rows
    ]
    return DocumentListResponse(items=items, total=total)


@router.delete(
    "/documents/{document_id}",
    dependencies=[Depends(verify_internal_token)],
)
async def delete_document(
    document_id: str,
    x_clinic_id: str = Header(...),
) -> dict[str, bool]:
    settings = get_settings()
    try:
        UUID(document_id)
        UUID(x_clinic_id)
    except ValueError as e:
        raise HTTPException(400, "ID inválido") from e

    sql = """
        UPDATE library_documents
        SET deleted_at = NOW()
        WHERE id = %s AND clinic_id = %s AND deleted_at IS NULL
        RETURNING id
    """
    sql_chunks = "DELETE FROM library_chunks WHERE document_id = %s"

    try:
        with psycopg.connect(settings.database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (document_id, x_clinic_id))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(404, "Documento não encontrado")
                cur.execute(sql_chunks, (document_id,))
            conn.commit()
    except psycopg.errors.UndefinedTable as e:
        raise HTTPException(503, "Tabela library_documents inexistente") from e

    return {"ok": True}
