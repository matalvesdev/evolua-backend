"""Bootstrap do serviço AI (FastAPI)."""
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import clinical, library, library_ingest
from .sentry_init import init_sentry

# Sentry deve ser inicializado o mais cedo possível, antes do FastAPI.
init_sentry()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger.info(
        "AI service starting (env=%s, chat_model=%s, whisper=%s)",
        settings.environment,
        settings.huggingface_chat_model,
        settings.huggingface_whisper_model,
    )
    # TODO: warmup vector store / LLM client
    yield
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

    @app.get("/healthz", tags=["health"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/readyz", tags=["health"])
    async def readyz() -> dict[str, str]:
        # TODO: ping ao DB / vector store
        return {"status": "ready"}

    return app


app = create_app()
