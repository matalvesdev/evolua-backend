from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


class OpenRouterError(RuntimeError):
    pass


class OpenRouterClient:
    def __init__(self) -> None:
        s = get_settings()
        self._api_key = s.openrouter_api_key
        self._base_url = "https://openrouter.ai/api/v1"
        self._default_model = s.openrouter_default_model
        self._site_url = s.openrouter_site_url
        self._site_name = s.openrouter_site_name

    def is_enabled(self) -> bool:
        return bool(self._api_key)

    @property
    def clinical_model(self) -> str:
        return get_settings().openrouter_clinical_model

    @property
    def rag_model(self) -> str:
        return get_settings().openrouter_rag_model

    @property
    def transcription_model(self) -> str:
        return get_settings().openrouter_transcription_model

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        timeout: float = 120.0,
    ) -> str:
        if not self._api_key:
            raise OpenRouterError("OPENROUTER_API_KEY nao configurada")

        url = f"{self._base_url}/chat/completions"
        payload: dict[str, Any] = {
            "model": model or self._default_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if self._site_url:
            headers["HTTP-Referer"] = self._site_url
        if self._site_name:
            headers["X-Title"] = self._site_name

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload, headers=headers)

        if r.status_code >= 400:
            raise OpenRouterError(f"OpenRouter {r.status_code}: {r.text[:300]}")

        data: dict[str, Any] = r.json()
        choices = data.get("choices") or []
        if not choices:
            raise OpenRouterError(f"OpenRouter sem choices: {data}")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not isinstance(content, str):
            raise OpenRouterError(f"OpenRouter sem content: {choices[0]}")
        return content.strip()

    async def transcribe(self, audio_bytes: bytes, *, audio_format: str, language: str) -> str:
        if not self._api_key:
            raise OpenRouterError("OPENROUTER_API_KEY nao configurada")
        payload = {
            "model": get_settings().openrouter_transcription_model,
            "input_audio": {"data": base64.b64encode(audio_bytes).decode("ascii"), "format": audio_format},
            "language": language,
        }
        headers = {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(f"{self._base_url}/audio/transcriptions", json=payload, headers=headers)
        if response.status_code >= 400:
            raise OpenRouterError(f"OpenRouter STT {response.status_code}: {response.text[:300]}")
        data: dict[str, Any] = response.json()
        text = data.get("text")
        if not isinstance(text, str) or not text.strip():
            raise OpenRouterError("OpenRouter STT retornou texto vazio")
        return text.strip()


openrouter_client = OpenRouterClient()
