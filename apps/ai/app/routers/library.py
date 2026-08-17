"""RAG sobre a biblioteca clínica.

Estratégia atual:
1. Se houver tabela `library_chunks` com coluna pgvector `embedding`, faz
   retrieval top-k por cosine similarity. A tabela é criada via migration
   futura quando ingestão for implementada.
2. Caso a tabela não exista (estado atual do banco), o retrieval é pulado e
   a resposta é gerada apenas com o histórico + pergunta — com aviso na
   resposta de que a biblioteca ainda está vazia.

A geração usa HuggingFace chat completion (provider hf-inference) com prompt
de sistema fortemente instrucional para citar fontes quando houver.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
import psycopg
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ..config import get_settings
from ..deps import get_clinic_id, get_user_id, verify_internal_token
from ..hf_client import HuggingFaceError, HuggingFaceModelLoadingError, hf_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/library", tags=["library-rag"])


# ── Contracts ──────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)
    specialty: str | None = None


class ChatCitation(BaseModel):
    source: str
    title: str | None = None
    source_url: str | None = None
    page: int | None = None
    snippet: str | None = None
    similarity: float | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[ChatCitation] = Field(default_factory=list)
    latency_ms: int | None = None
    model: str | None = None


SYSTEM_PROMPT = (
    "Você é um assistente clínico para terapeutas (fonoaudiologia, psicologia, "
    "terapia ocupacional, fisioterapia infantil). Responda em português do Brasil, "
    "com linguagem técnica acessível, baseando-se SEMPRE nos trechos da biblioteca "
    "fornecidos quando disponíveis. Quando não houver trechos relevantes, deixe "
    "claro que a resposta é baseada em conhecimento geral e recomende consulta a "
    "fontes primárias. Nunca invente referências. Cite as fontes ao final usando "
    "[n] correspondendo aos trechos fornecidos."
)


# ── Retrieval ──────────────────────────────────────────────────────────


async def _retrieve(query: str, clinic_id: str, *, top_k: int = 4) -> list[dict[str, Any]]:
    """Top-k chunks via pgvector. Retorna lista vazia se a tabela não existir."""
    settings = get_settings()
    try:
        embeddings = await hf_client.embed([f"query: {query}"])
    except (HuggingFaceError, httpx.HTTPError):
        logger.warning("RAG retrieval skipped because embedding is unavailable")
        return []

    if not embeddings or not embeddings[0]:
        return []
    vec = embeddings[0]
    vec_literal = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"

    # psycopg é síncrono/bloqueante: executa em threadpool para não travar o
    # event loop async do FastAPI.
    return await run_in_threadpool(
        _retrieve_sync, settings.database_url, vec_literal, clinic_id, top_k
    )


def _retrieve_sync(
    database_url: str, vec_literal: str, clinic_id: str, top_k: int
) -> list[dict[str, Any]]:
    """Query pgvector síncrona (rodar via run_in_threadpool)."""
    sql = """
        SELECT id, source, title, source_url, page, snippet,
               1 - (embedding <=> %s::vector) AS similarity
        FROM library_chunks
        WHERE clinic_id = %s
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """

    try:
        with psycopg.connect(database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (vec_literal, clinic_id, vec_literal, top_k))
                cols = [c.name for c in cur.description or []]
                return [dict(zip(cols, row, strict=False)) for row in cur.fetchall()]
    except psycopg.errors.UndefinedTable:
        logger.info("library_chunks table not yet created — retrieval skipped")
        return []
    except psycopg.Error:
        logger.warning("Library retrieval failed")
        return []


def _format_context(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return ""
    parts: list[str] = ["TRECHOS RELEVANTES DA BIBLIOTECA:"]
    for i, c in enumerate(chunks, 1):
        title = c.get("title") or c.get("source") or "documento"
        page = f" (p. {c['page']})" if c.get("page") else ""
        snippet = (c.get("snippet") or "").strip()
        parts.append(f"[{i}] {title}{page}\n{snippet}")
    return "\n\n".join(parts)


# ── Endpoint ───────────────────────────────────────────────────────────


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def chat_with_library(
    req: ChatRequest,
    user_id: str = Depends(get_user_id),
    clinic_id: str = Depends(get_clinic_id),
) -> ChatResponse:
    _ = user_id  # reservado para audit por terapeuta

    started = time.perf_counter()
    chunks = await _retrieve(req.question, clinic_id)
    context = _format_context(chunks)

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if req.specialty:
        messages.append(
            {"role": "system", "content": f"Especialidade do terapeuta: {req.specialty}."}
        )
    if context:
        messages.append({"role": "system", "content": context})
    else:
        messages.append(
            {
                "role": "system",
                "content": (
                    "A biblioteca da clínica ainda não tem documentos indexados. "
                    "Responda baseando-se em conhecimento geral e avise o usuário."
                ),
            }
        )
    for h in req.history[-8:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": req.question})

    try:
        answer = await hf_client.chat(messages, max_tokens=900, temperature=0.2)
    except HuggingFaceModelLoadingError as exc:
        raise HTTPException(status_code=503, detail="Modelo de IA indisponível") from exc
    except HuggingFaceError as exc:
        logger.error("HF chat failed")
        raise HTTPException(status_code=502, detail="Falha no provedor de IA") from exc

    citations = [
        ChatCitation(
            source=str(c.get("source") or c.get("id") or ""),
            title=c.get("title"),
            source_url=c.get("source_url"),
            page=c.get("page"),
            snippet=(c.get("snippet") or "")[:400],
            similarity=float(c["similarity"]) if c.get("similarity") is not None else None,
        )
        for c in chunks
    ]

    return ChatResponse(
        answer=answer,
        citations=citations,
        latency_ms=int((time.perf_counter() - started) * 1000),
        model=hf_client.chat_model,
    )
