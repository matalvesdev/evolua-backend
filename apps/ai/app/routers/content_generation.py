from __future__ import annotations

import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import verify_internal_token
from ..openrouter_client import openrouter_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["content-generation"])

ContentFormat = Literal["ebook", "infografico"]

SYSTEM_PROMPTS: dict[ContentFormat, str] = {
    "ebook": """Voce e um redator especializado em conteudo para fonoaudiologia.
Gere o conteudo de um ebook em formato JSON seguindo EXATAMENTE esta estrutura:
{
  "title": "Titulo do Ebook",
  "subtitle": "Subtitulo",
  "badge": "GRATIS",
  "toc": ["Item 1", "Item 2", ...],
  "chapters": [
    {
      "number": "01",
      "title": "Titulo do Capitulo",
      "subtitle": "Subtitulo do capitulo",
      "pages": [
        [
          {"type": "text", "value": "Paragrafo de texto com informacoes uteis e dados", "sz": 9.5},
          {"type": "gap"},
          {"type": "chart", "data": [{"label": "Categoria", "val": 30}, ...], "h": 80, "caption": "Legenda do grafico"},
          {"type": "text", "value": "Continuacao do conteudo", "sz": 9.5}
        ],
        [
          {"type": "text", "value": "Texto do bloco", "sz": 9.5},
          {"type": "bullet", "value": "Item de lista"},
          {"type": "bullet", "value": "Outro item"},
          {"type": "gap"},
          {"type": "callout", "value": "Dica importante em destaque"}
        ]
      ],
      "takeaway": ["Ponto chave 1", "Ponto chave 2", "Ponto chave 3", "Ponto chave 4"]
    }
  ]
}

REGRAS:
- Conteudo em portugues brasileiro, tom especialista que fala COM a fonoaudiologa
- Use dados reais, estatisticas e estudos citados
- Cada capitulo deve ter 2-4 paginas de conteudo
- Textos concisos e diretos, sem enrolacao
- Inclua dados para graficos (chart) nos primeiros blocos de cada capitulo
- bullets para listas, callout para dicas, stat para numeros grandes
- takeaway com 4 pontos-chave ao final de cada capitulo
- Nao use caracteres especiais como → —, apenas hifens e caracteres ASCII
- Os valores dos graficos devem ser realistas e baseados em dados reais""",
    "infografico": """Voce e um designer de infograficos especializado em saude.
Gere o conteudo de um infografico em formato JSON seguindo EXATAMENTE esta estrutura:
{
  "title": "Titulo do Infografico",
  "subtitle": "Subtitulo",
  "source": "Fonte dos dados",
  "chart": {"data": [{"label": "Item", "val": 30}, ...], "caption": "Legenda"},
  "blocks": [
    {
      "title": "Nome do bloco",
      "items": [
        {"label": "Item", "description": "Descricao curta"},
        ...
      ]
    }
  ],
  "alert": "Mensagem de alerta importante"
}

REGRAS:
- Conteudo em portugues brasileiro
- Visual, conciso, com dados numericos
- Maximo 8 itens por bloco
- Descricoes de ate 60 caracteres
- Nao use caracteres especiais como → —""",
}


class ContentRequest(BaseModel):
    format: ContentFormat
    topic: str = Field(..., min_length=5, max_length=200)
    keywords: list[str] = Field(default_factory=list, max_length=10)
    tone: str = "especialista"
    target_audience: str = "fonoaudiologas brasileiras"


class ContentResponse(BaseModel):
    format: ContentFormat
    topic: str
    content: dict[str, Any]
    model: str
    generated_tokens: int


@router.post("/generate", response_model=ContentResponse)
async def generate_content(
    req: ContentRequest,
    _=Depends(verify_internal_token),
):
    if not openrouter_client.is_enabled():
        raise HTTPException(400, "OpenRouter nao configurado. Defina OPENROUTER_API_KEY.")

    system = SYSTEM_PROMPTS[req.format]
    user_prompt = f"""Gere um {req.format} sobre: {req.topic}

Publico-alvo: {req.target_audience}
Tom: {req.tone}
Palavras-chave: {", ".join(req.keywords) if req.keywords else "nenhuma"}

Responda APENAS com o JSON, sem markdown, sem comentarios."""

    try:
        raw = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=8192,
            temperature=0.7,
        )
    except Exception as exc:
        logger.warning("Content generation provider unavailable")
        raise HTTPException(
            502,
            "Não foi possível gerar o conteúdo agora. Tente novamente mais tarde.",
        ) from exc

    raw_clean = raw.strip()
    if raw_clean.startswith("```"):
        raw_clean = raw_clean.split("\n", 1)[-1]
        if "```" in raw_clean:
            raw_clean = raw_clean.rsplit("```", 1)[0]
    raw_clean = raw_clean.strip()

    try:
        content = json.loads(raw_clean)
    except json.JSONDecodeError as exc:
        logger.warning("Content generation returned invalid JSON")
        raise HTTPException(
            502,
            "O serviço de IA retornou um formato inválido. Tente novamente mais tarde.",
        ) from exc

    return ContentResponse(
        format=req.format,
        topic=req.topic,
        content=content,
        model=openrouter_client._default_model,
        generated_tokens=len(raw_clean.split()),
    )
