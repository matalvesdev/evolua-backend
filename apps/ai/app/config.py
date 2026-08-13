"""Configuração do serviço AI."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "production", "test"] = "development"
    port: int = 8001
    log_level: str = "info"

    internal_service_token: str

    # HuggingFace Inference API (https://huggingface.co/docs/api-inference)
    huggingface_api_key: str
    huggingface_base_url: str = "https://router.huggingface.co"
    # Modelo de chat/instrução para RAG e geração clínica.
    # Usa Zephyr-7B (suportado no free tier do HF Inference) para evitar erros 400.
    huggingface_chat_model: str = "HuggingFaceH4/zephyr-7b-beta"
    huggingface_chat_provider: str = "hf-inference"
    # Embeddings para RAG (multilíngue, leve).
    huggingface_embedding_model: str = "intfloat/multilingual-e5-small"
    huggingface_embedding_dim: int = 384
    # ASR para sessões clínicas. Mantém Whisper-large-v3 do legacy.
    huggingface_whisper_model: str = "openai/whisper-large-v3"

    database_url: str

    # OpenRouter (AI content generation — ebooks, infográficos, materiais)
    openrouter_api_key: str = ""
    openrouter_default_model: str = "openai/gpt-4o"
    openrouter_site_url: str = "https://useevolua.com.br"
    openrouter_site_name: str = "Evolua"

    otel_enabled: bool = False

    # Sentry (opcional). Em produção é recomendado para captura de exceções.
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1
    sentry_environment: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
