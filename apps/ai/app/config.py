"""Configuração do serviço AI."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "staging", "production", "test"] = "development"
    port: int = 8001
    log_level: str = "info"

    internal_service_token: str

    # HuggingFace Inference API (https://huggingface.co/docs/api-inference)
    # Hugging Face permanece exclusivo para embeddings do RAG interno.
    huggingface_api_key: str = ""
    huggingface_base_url: str = "https://router.huggingface.co"
    # Embeddings para RAG (multilíngue, leve).
    huggingface_embedding_model: str = "intfloat/multilingual-e5-small"
    huggingface_embedding_dim: int = 384

    database_url: str

    # URLs remotas para ingestão RAG só são aceitas em staging/produção quando
    # o host está explicitamente autorizado. Separar por vírgulas; use nomes
    # exatos ou sufixos iniciados por ponto (ex.: ".supabase.co").
    library_ingest_allowed_hosts: str = ""

    # OpenRouter é o provider operacional para geração e transcrição.
    openrouter_api_key: str = ""
    openrouter_default_model: str = "google/gemini-2.5-flash-lite"
    openrouter_clinical_model: str = "google/gemini-2.5-flash-lite"
    openrouter_rag_model: str = "google/gemini-2.5-flash-lite"
    openrouter_transcription_model: str = "qwen/qwen3-asr-0.6b"
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
