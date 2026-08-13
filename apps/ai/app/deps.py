"""Dependências FastAPI: autenticação interna entre serviços."""

from fastapi import Header, HTTPException, status

from .config import get_settings


async def verify_internal_token(x_internal_token: str = Header(...)) -> None:
    """Valida que a chamada veio do Fastify (gateway) ou outro serviço interno."""
    settings = get_settings()
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service token",
        )


async def get_user_id(x_user_id: str = Header(...)) -> str:
    """Recebe user.id já validado pelo Fastify."""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing x-user-id header",
        )
    return x_user_id
