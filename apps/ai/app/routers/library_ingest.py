"""Ingestão de documentos para a biblioteca clínica (RAG).

Fluxo:
1. Cliente faz upload de PDF/TXT/MD via multipart OU envia URL pública
   (Supabase Storage signed URL etc.).
2. Extraímos texto, dividimos em chunks (~800 tokens c/ overlap) e geramos
   embeddings via HuggingFace (`intfloat/multilingual-e5-small`, dim=384).
3. Inserimos `library_documents` + `library_chunks` em transação.

A migration `20260601000001_add_library_rag_tables` precisa estar aplicada.
Quando a tabela não existe, retornamos 503 com instrução clara.
"""

from __future__ import annotations

import io
import ipaddress
import logging
import re
import socket
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
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from ..config import get_settings
from ..deps import get_user_id, verify_internal_token
from ..hf_client import HuggingFaceError, HuggingFaceModelLoadingError, hf_client

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
        except Exception:  # noqa: BLE001
            logger.warning("PDF page %d extraction failed", i)
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

                for idx, ((page, snippet), emb) in enumerate(zip(chunks, embeddings, strict=True)):
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
            "Aplique a migration 20260601000001_add_library_rag_tables.",
        ) from e


# ── Security helpers ───────────────────────────────────────────────────────


def _resolve_public_addresses(hostname: str) -> set[str]:
    """Resolve hostname e rejeita destinos que não sejam IPs públicos."""
    try:
        addresses = {
            str(item[4][0])
            for item in socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
        }
    except socket.gaierror as exc:
        raise HTTPException(400, "source_url não pôde ser resolvida") from exc

    if not addresses:
        raise HTTPException(400, "source_url não pôde ser resolvida")
    if any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise HTTPException(400, "source_url não permitida (rede não pública)")
    return addresses


def _validate_source_url(url: str) -> None:
    """Valida URL de fonte para evitar SSRF.

    Restringe a hosts conhecidos e seguros. Bloqueia IPs de metadata
    de cloud providers e redes internas.
    """
    from urllib.parse import urlparse

    parsed = urlparse(url)
    if parsed.scheme not in ("https",):
        raise HTTPException(400, "source_url deve usar HTTPS")

    hostname = (parsed.hostname or "").lower()

    # Bloqueia IPs de metadata de cloud providers
    blocked_hosts = (
        "169.254.169.254",
        "metadata.google.internal",
        "metadata.instance.google.internal",
        "100.100.100.200",
        "fd00:ec2::254",
    )
    if hostname in blocked_hosts:
        raise HTTPException(400, "source_url não permitida (host bloqueado)")

    # Bloqueia endereços privados (localhost, LAN) e redes não roteáveis.
    try:
        ip = ipaddress.ip_address(hostname)
        if not ip.is_global:
            raise HTTPException(400, "source_url não permitida (rede não pública)")
    except ValueError:
        _resolve_public_addresses(hostname)


def _parse_allowed_hosts(raw_hosts: str) -> tuple[str, ...]:
    return tuple(host.strip().lower() for host in raw_hosts.split(",") if host.strip())


def _is_allowed_remote_host(hostname: str, allowed_hosts: tuple[str, ...]) -> bool:
    """Aceita somente host exato ou um subdomínio de sufixo explicitamente confiado."""
    for allowed_host in allowed_hosts:
        if allowed_host.startswith("."):
            suffix = allowed_host[1:]
            if hostname == suffix or hostname.endswith(allowed_host):
                return True
        elif hostname == allowed_host:
            return True
    return False


def _require_trusted_remote_host(url: str) -> None:
    """Em ambientes não locais, URL remota requer domínio confiável configurado.

    A resolução DNS feita como defesa contra SSRF não consegue garantir que uma
    segunda resolução pelo cliente HTTP apontará para o mesmo IP. Em produção,
    restringimos a origem a domínios sob controle conhecido e falhamos fechados
    até que a operação configure a allowlist.
    """
    settings = get_settings()
    if settings.environment in {"development", "test"}:
        return

    from urllib.parse import urlparse

    hostname = (urlparse(url).hostname or "").lower()
    allowed_hosts = _parse_allowed_hosts(settings.library_ingest_allowed_hosts)
    if not allowed_hosts or not _is_allowed_remote_host(hostname, allowed_hosts):
        raise HTTPException(
            403,
            "source_url não está em um host confiável para este ambiente",
        )


async def _download_remote_document(source_url: str) -> tuple[bytes, str]:
    """Baixa documento remoto em streaming, impondo o limite antes de alocar.

    Redirects são desabilitados e a origem já passou por validação de HTTPS,
    rede pública e allowlist de produção.
    """
    timeout = httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=5.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        async with client.stream("GET", source_url) as response:
            if response.status_code >= 400:
                raise HTTPException(400, f"Falha ao baixar source_url: {response.status_code}")

            blob = await _read_limited_response(response)
            return blob, (response.headers.get("content-type") or "").lower()


async def _read_limited_response(response: httpx.Response) -> bytes:
    """Consome uma resposta HTTP sem permitir que ela exceda o limite aceito."""
    raw_content_length = response.headers.get("content-length")
    if raw_content_length:
        try:
            content_length = int(raw_content_length)
        except ValueError:
            content_length = None
        if content_length is not None and content_length > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Documento remoto excede 25MB")

    chunks: list[bytes] = []
    total = 0
    async for chunk in response.aiter_bytes():
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Documento remoto excede 25MB")
        chunks.append(chunk)

    return b"".join(chunks)


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
        _validate_source_url(source_url)
        _require_trusted_remote_host(source_url)
        blob, content_type = await _download_remote_document(source_url)
        filename = source_url.rsplit("/", 1)[-1].split("?", 1)[0] or "remote"
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
    except HuggingFaceModelLoadingError as exc:
        raise HTTPException(503, "Modelo de IA indisponível") from exc
    except HuggingFaceError as exc:
        logger.error("HF embed failed")
        raise HTTPException(502, "Falha no provedor de IA") from exc

    if len(embeddings) != len(chunks):
        raise HTTPException(500, "Mismatch entre embeddings e chunks")

    # 4. Insere (psycopg bloqueante → threadpool)
    doc_id = await run_in_threadpool(
        _insert_document_and_chunks,
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


async def _embed_in_batches(texts: list[str], *, batch: int = 16) -> list[list[float]]:
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
        WHERE {" AND ".join(where)}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    sql_count = f"SELECT COUNT(*) FROM library_documents WHERE {' AND '.join(where)}"

    def _query() -> tuple[list[dict[str, Any]], int]:
        with psycopg.connect(settings.database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (*args, limit, offset))
                cols = [c.name for c in cur.description or []]
                rows = [dict(zip(cols, row, strict=False)) for row in cur.fetchall()]
                cur.execute(sql_count, args)
                total_row = cur.fetchone()
                total = int(total_row[0]) if total_row else 0
        return rows, total

    try:
        rows, total = await run_in_threadpool(_query)
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

    def _delete() -> Any:
        with psycopg.connect(settings.database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (document_id, x_clinic_id))
                row = cur.fetchone()
                if not row:
                    return None
                cur.execute(sql_chunks, (document_id,))
            conn.commit()
        return row

    try:
        row = await run_in_threadpool(_delete)
    except psycopg.errors.UndefinedTable as e:
        raise HTTPException(503, "Tabela library_documents inexistente") from e

    if not row:
        raise HTTPException(404, "Documento não encontrado")

    return {"ok": True}
