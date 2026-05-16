"""Cliente HuggingFace Inference API.

Cobre três usos:
1. Chat completion (RAG biblioteca + geração clínica) via /v1/chat/completions
   com providers (hf-inference por padrão).
2. Embeddings via feature-extraction pipeline.
3. ASR (Whisper) via inference clássica.

Documentação: https://huggingface.co/docs/inference-providers/index
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


class HuggingFaceError(RuntimeError):
    """Erro inesperado da HuggingFace Inference API."""


class HuggingFaceModelLoading(HuggingFaceError):
    """503 — modelo aquecendo. Caller deve tentar novamente."""


class HuggingFaceClient:
    """Cliente HTTP fino — sem SDKs externos, usa httpx."""

    def __init__(self) -> None:
        s = get_settings()
        self._api_key = s.huggingface_api_key
        self._base_url = s.huggingface_base_url.rstrip("/")
        self._chat_model = s.huggingface_chat_model
        self._chat_provider = s.huggingface_chat_provider
        self._embedding_model = s.huggingface_embedding_model
        self._whisper_model = s.huggingface_whisper_model

    @property
    def chat_model(self) -> str:
        return self._chat_model

    def is_enabled(self) -> bool:
        return bool(self._api_key)

    # ── Chat completion ────────────────────────────────────────────────

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 800,
        temperature: float = 0.2,
        timeout: float = 60.0,
    ) -> str:
        """Chama /v1/chat/completions no provider configurado.

        Retorna apenas o texto da primeira escolha. Levanta HuggingFaceError
        em falha. Compatível com modelos de chat instruct (Llama 3.x, Qwen, etc.).
        """
        if not self._api_key:
            raise HuggingFaceError("HUGGINGFACE_API_KEY não configurada")

        url = f"{self._base_url}/{self._chat_provider}/v1/chat/completions"
        payload = {
            "model": self._chat_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload, headers=headers)

        if r.status_code == 503:
            raise HuggingFaceModelLoading(f"Modelo carregando: {r.text[:200]}")
        if r.status_code >= 400:
            raise HuggingFaceError(f"HF chat {r.status_code}: {r.text[:300]}")

        data: dict[str, Any] = r.json()
        choices = data.get("choices") or []
        if not choices:
            raise HuggingFaceError(f"HF chat retornou sem choices: {data}")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not isinstance(content, str):
            raise HuggingFaceError(f"HF chat sem content: {choices[0]}")
        return content.strip()

    # ── Embeddings ─────────────────────────────────────────────────────

    async def embed(self, texts: list[str], *, timeout: float = 30.0) -> list[list[float]]:
        """Gera embeddings densos via feature-extraction.

        Retorna vetor por texto. Para e5-* recomenda-se prefixar 'passage: '
        ou 'query: ' — feito pelo caller.
        """
        if not self._api_key:
            raise HuggingFaceError("HUGGINGFACE_API_KEY não configurada")

        url = f"{self._base_url}/hf-inference/models/{self._embedding_model}/pipeline/feature-extraction"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {"inputs": texts, "options": {"wait_for_model": True}}

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload, headers=headers)

        if r.status_code == 503:
            raise HuggingFaceModelLoading(f"Embedding model carregando: {r.text[:200]}")
        if r.status_code >= 400:
            raise HuggingFaceError(f"HF embed {r.status_code}: {r.text[:300]}")

        out = r.json()
        # Para single-text alguns modelos retornam vetor 1D; normalizamos.
        if isinstance(out, list) and out and isinstance(out[0], (int, float)):
            return [out]  # type: ignore[list-item]
        # Sentence-level: list[list[float]]
        if isinstance(out, list) and out and isinstance(out[0], list) and out[0] and isinstance(out[0][0], (int, float)):
            return out  # type: ignore[return-value]
        # Token-level: list[list[list[float]]] — média manual.
        if isinstance(out, list) and out and isinstance(out[0], list) and out[0] and isinstance(out[0][0], list):
            return [_mean_pool(seq) for seq in out]  # type: ignore[arg-type]
        raise HuggingFaceError(f"Formato de embedding inesperado: {type(out)}")

    # ── Whisper / ASR ──────────────────────────────────────────────────

    async def transcribe(
        self,
        audio_bytes: bytes,
        *,
        content_type: str = "audio/webm",
        timeout: float = 180.0,
    ) -> str:
        """Envia áudio para Whisper na HF Inference API e retorna texto."""
        if not self._api_key:
            raise HuggingFaceError("HUGGINGFACE_API_KEY não configurada")

        url = f"{self._base_url}/hf-inference/models/{self._whisper_model}"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": content_type,
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, headers=headers, content=audio_bytes)

        if r.status_code == 503:
            raise HuggingFaceModelLoading(
                "Modelo de transcrição está carregando. Tente novamente em alguns segundos."
            )
        if r.status_code >= 400:
            raise HuggingFaceError(f"HF whisper {r.status_code}: {r.text[:300]}")

        data = r.json()
        if isinstance(data, dict) and "text" in data:
            return str(data["text"])
        raise HuggingFaceError(f"Whisper retornou formato inesperado: {data!r:.200}")


def _mean_pool(token_vectors: list[list[float]]) -> list[float]:
    if not token_vectors:
        return []
    dim = len(token_vectors[0])
    acc = [0.0] * dim
    for v in token_vectors:
        for i, x in enumerate(v):
            acc[i] += x
    n = len(token_vectors)
    return [x / n for x in acc]


hf_client = HuggingFaceClient()
