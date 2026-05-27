"""Geração de conteúdo de marketing para redes sociais."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import get_user_id, verify_internal_token
from ..hf_client import HuggingFaceError, HuggingFaceModelLoading, hf_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/marketing", tags=["marketing-ai"])


class MarketingGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    platform: str = Field(default="instagram", description="instagram, facebook, linkedin, tiktok")
    format: str = Field(default="feed", description="feed, stories, reels, carrossel")


class MarketingGenerateResponse(BaseModel):
    content: str


MARKETING_PROMPT = (
    "Você é um especialista em marketing digital para fonoaudiólogos. "
    "Crie conteúdo para redes sociais no tom do Evolua: profissional, acolhedor, sem jargão técnico. "
    "Use linguagem clara em português do Brasil, com emojis quando apropriado. "
    "Inclua uma chamada para ação (CTA) relevante e 5 hashtags no final. "
    "Responda APENAS em JSON válido, sem texto adicional, no schema:\n"
    '{"content": "legenda completa com emojis, quebra de linhas, CTA e 5 hashtags"}'
)

PLATFORM_LABELS: dict[str, str] = {
    "instagram": "Instagram",
    "facebook": "Facebook",
    "linkedin": "LinkedIn",
    "tiktok": "TikTok",
}

FORMAT_LABELS: dict[str, str] = {
    "feed": "Post de feed",
    "stories": "Stories",
    "reels": "Reels / Vídeo curto",
    "carrossel": "Carrossel de slides",
}

TOPIC_HINTS: dict[str, str] = {
    "gagueira": "foco em acolhimento e informação sobre gagueira para famílias",
    "tea": "dicas de comunicação para crianças no espectro autista",
    "voz": "cuidados com a voz para professores e profissionais da voz",
    "disfagia": "sinais de alerta de disfagia em idosos",
    "linguagem": "marcos do desenvolvimento da linguagem infantil",
    "leitura": "como estimular a leitura em crianças com dificuldades",
    "fonoaudiologia": "o que faz um fonoaudiólogo e quando procurar",
}


@router.post(
    "/generate",
    response_model=MarketingGenerateResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def generate_marketing_content(
    req: MarketingGenerateRequest,
    user_id: str = Depends(get_user_id),
) -> MarketingGenerateResponse:
    _ = user_id

    topic_hint = ""
    for keyword, hint in TOPIC_HINTS.items():
        if keyword in req.topic.lower():
            topic_hint = f"\n\nTom sugerido: {hint}"
            break

    platform_label = PLATFORM_LABELS.get(req.platform, req.platform)
    format_label = FORMAT_LABELS.get(req.format, req.format)

    user_msg = (
        f"Plataforma: {platform_label}\n"
        f"Formato: {format_label}\n"
        f"Tema: {req.topic.strip()}"
        f"{topic_hint}"
    )

    messages = [
        {"role": "system", "content": MARKETING_PROMPT},
        {"role": "user", "content": user_msg},
    ]

    try:
        raw = await hf_client.chat(messages, max_tokens=600, temperature=0.7)
    except HuggingFaceModelLoading as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except HuggingFaceError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    parsed = _safe_json(raw)
    if not parsed:
        raise HTTPException(status_code=502, detail="LLM não retornou JSON válido")

    return MarketingGenerateResponse(
        content=str(parsed.get("content") or raw).strip(),
    )


def _safe_json(raw: str) -> dict | None:
    candidate = raw.strip()
    if candidate.startswith("```"):
        candidate = candidate.split("```", 2)[1]
        if candidate.startswith("json"):
            candidate = candidate[4:]
        candidate = candidate.strip("`\n ")
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start >= 0 and end > start:
        candidate = candidate[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed: %s | raw=%s", e, raw[:200])
        return None
