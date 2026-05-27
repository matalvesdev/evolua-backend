"""Bootstrap do serviço AI (FastAPI)."""
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import clinical, library, library_ingest, marketing
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
        "AI service starting (env=%s, chat_model=%s, whisper=%s)",
        settings.environment,
        settings.huggingface_chat_model,
        settings.huggingface_whisper_model,
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://api-inference.huggingface.co/models/{settings.huggingface_chat_model}",
                headers={"Authorization": f"Bearer {settings.huggingface_api_key}"},
                json={"inputs": "warmup", "parameters": {"max_new_tokens": 1}},
            )
            logger.info("HF model warmup: HTTP %s", resp.status_code)
    except Exception as exc:
        logger.warning("HF model warmup failed (non-fatal): %s", exc)
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
    app.include_router(marketing.router)

    @app.get("/healthz", tags=["health"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/readyz", tags=["health"])
    async def readyz() -> dict[str, str]:
        if not _warm:
            return {"status": "warming_up"}
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"https://api-inference.huggingface.co/status/{settings.huggingface_chat_model}",
                    headers={"Authorization": f"Bearer {settings.huggingface_api_key}"},
                )
                if resp.is_error:
                    return {"status": "degraded", "detail": "HF model unreachable"}
        except Exception as exc:
            return {"status": "degraded", "detail": str(exc)}
        return {"status": "ready"}

    return app


app = create_app()
