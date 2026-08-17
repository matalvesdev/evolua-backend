"""Sentry — captura de exceções estruturadas para o serviço AI.

No-op se SENTRY_DSN não estiver configurado (dev local).
Em produção, o operador deve garantir o DSN no env.
"""

from __future__ import annotations

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from .config import get_settings

_initialized = False


def init_sentry() -> None:
    """Inicializa Sentry uma única vez. Seguro para chamar múltiplas vezes."""
    global _initialized
    if _initialized:
        return
    settings = get_settings()
    if not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment or settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        # PII desabilitado por padrão — clínicas lidam com dados sensíveis (LGPD).
        send_default_pii=False,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
            HttpxIntegration(),
        ],
    )
    _initialized = True
