"""Bootstrap do serviço AI (FastAPI)."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import clinical, content_generation, library, library_ingest
from .runtime_info import get_runtime_info
from .sentry_init import init_sentry

# Sentry deve ser inicializado o mais cedo possível, antes do FastAPI.
init_sentry()

logger = logging.getLogger(__name__)

_warm = False


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global _warm
    settings = get_settings()
    logger.info(
        "AI service starting (env=%s, clinical_model=%s, stt_model=%s)",
        settings.environment,
        settings.openrouter_clinical_model,
        settings.openrouter_transcription_model,
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                json={
                    "model": settings.openrouter_clinical_model,
                    "messages": [{"role": "user", "content": "warmup"}],
                    "max_tokens": 1,
                },
            )
            logger.info("OpenRouter model warmup: HTTP %s", resp.status_code)
    except Exception as exc:
        logger.warning("OpenRouter model warmup failed (non-fatal): %s", exc)
    _warm = True
    yield
    _warm = False
    logger.info("AI service shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Evolua AI Service",
        description="RAG biblioteca + geração clínica (evolução, materiais)",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS limitado — em produção apenas o gateway Fastify chama este serviço.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.environment == "development" else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(library.router)
    app.include_router(library_ingest.router)
    app.include_router(clinical.router)
    app.include_router(content_generation.router)

    @app.get("/healthz", tags=["health"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/version", tags=["health"])
    async def runtime_version() -> dict[str, str]:
        return get_runtime_info(settings.environment)

    @app.get("/readyz", tags=["health"])
    async def readyz() -> dict[str, str]:
        if not _warm:
            return {"status": "warming_up"}
        # Readiness = o provedor operacional de inferência (OpenRouter) é
        # alcançável. Qualquer resposta HTTP comprova conectividade DNS/TLS;
        # apenas falhas de rede indicam degradação.
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.get("https://openrouter.ai")
        except Exception as exc:
            return {"status": "degraded", "detail": str(exc)}
        return {"status": "ready"}

    return app


app = create_app()
