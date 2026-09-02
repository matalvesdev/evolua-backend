"""Geração clínica: evolução pós-sessão, materiais, transcrição e relatórios."""

from __future__ import annotations

import json
import logging
from typing import Literal
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import get_user_id, verify_internal_token
from ..openrouter_client import OpenRouterError, openrouter_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clinical", tags=["clinical-ai"])


# ── /evolution/generate ────────────────────────────────────────────────


class GenerateEvolutionRequest(BaseModel):
    patient_id: str
    transcript: str | None = None
    therapist_notes: str | None = None
    treatment_plan_summary: str | None = None


class GeneratedEvolution(BaseModel):
    soap: dict[str, str] = Field(description="Subjective, Objective, Assessment, Plan")
    summary: str
    next_session_suggestions: list[str]


SOAP_PROMPT = (
    "Você é um terapeuta clínico experiente. Gere uma evolução estruturada SOAP "
    "(Subjective, Objective, Assessment, Plan) em português do Brasil a partir do "
    "transcript da sessão e das notas do terapeuta. Responda em JSON válido "
    "exatamente neste schema, sem texto adicional:\n"
    '{"soap": {"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."}, '
    '"summary": "resumo executivo de 2-3 frases", '
    '"next_session_suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"]}'
)


@router.post(
    "/evolution/generate",
    response_model=GeneratedEvolution,
    dependencies=[Depends(verify_internal_token)],
)
async def generate_evolution(
    req: GenerateEvolutionRequest,
    user_id: str = Depends(get_user_id),
) -> GeneratedEvolution:
    _ = user_id
    if not (req.transcript or req.therapist_notes):
        raise HTTPException(
            status_code=400,
            detail="É necessário fornecer transcript e/ou therapist_notes",
        )

    user_blocks: list[str] = []
    if req.transcript:
        user_blocks.append(f"TRANSCRIPT:\n{req.transcript}")
    if req.therapist_notes:
        user_blocks.append(f"NOTAS DO TERAPEUTA:\n{req.therapist_notes}")
    if req.treatment_plan_summary:
        user_blocks.append(f"PLANO DE TRATAMENTO:\n{req.treatment_plan_summary}")

    messages = [
        {"role": "system", "content": SOAP_PROMPT},
        {"role": "user", "content": "\n\n".join(user_blocks)},
    ]

    try:
        raw = await openrouter_client.chat(messages, model=openrouter_client.clinical_model, max_tokens=900, temperature=0.2)
    except OpenRouterError as exc:
        logger.warning("Clinical evolution provider unavailable")
        raise HTTPException(
            status_code=502,
            detail="Não foi possível gerar a evolução agora. Tente novamente mais tarde.",
        ) from exc

    parsed = _safe_json(raw)
    if not parsed:
        raise HTTPException(status_code=502, detail="LLM não retornou JSON válido")

    soap_value = parsed.get("soap")
    soap = soap_value if isinstance(soap_value, dict) else {}
    suggestions_value = parsed.get("next_session_suggestions")
    suggestions = suggestions_value if isinstance(suggestions_value, list) else []
    return GeneratedEvolution(
        soap={
            "subjective": str(soap.get("subjective", "")),
            "objective": str(soap.get("objective", "")),
            "assessment": str(soap.get("assessment", "")),
            "plan": str(soap.get("plan", "")),
        },
        summary=str(parsed.get("summary", "")),
        next_session_suggestions=[str(s) for s in suggestions][:5],
    )


# ── /material/generate ─────────────────────────────────────────────────


TherapyArea = Literal[
    "linguagem",
    "fala",
    "fluencia",
    "voz",
    "degluticao",
    "fonologia",
    "mof",
    "tea",
    "caa",
]
MaterialFormat = Literal["atividade", "brincadeira", "jogo", "historia", "exercicio", "roteiro"]
AgeGroup = Literal["bebe", "infantil", "escolar", "adolescente", "adulto"]


AREA_LABELS: dict[str, str] = {
    "linguagem": "Linguagem",
    "fala": "Fala",
    "fluencia": "Fluência",
    "voz": "Voz",
    "degluticao": "Deglutição",
    "fonologia": "Fonologia",
    "mof": "Motricidade Orofacial",
    "tea": "TEA (Transtorno do Espectro Autista)",
    "caa": "Comunicação Aumentativa e Alternativa",
}
FORMAT_LABELS: dict[str, str] = {
    "atividade": "Atividade dirigida",
    "brincadeira": "Brincadeira lúdica",
    "jogo": "Jogo terapêutico",
    "historia": "História/Narrativa",
    "exercicio": "Exercício específico",
    "roteiro": "Roteiro de sessão",
}
AGE_LABELS: dict[str, str] = {
    "bebe": "Bebês (0–2 anos)",
    "infantil": "Pré-escolares (3–6 anos)",
    "escolar": "Escolares (7–12 anos)",
    "adolescente": "Adolescentes (13–17 anos)",
    "adulto": "Adultos",
}


class GenerateMaterialRequest(BaseModel):
    area: TherapyArea
    format: MaterialFormat
    age: AgeGroup
    context: str | None = Field(default=None, max_length=1500)
    # campos legacy opcionais (não usados pelo frontend novo)
    objective: str | None = None


class GeneratedMaterial(BaseModel):
    title: str
    content: str
    objectives: list[str] = Field(default_factory=list)
    materials_needed: list[str] = Field(default_factory=list)
    duration_minutes: int | None = None
    instructions: str = ""


MATERIAL_PROMPT = (
    "Você é um terapeuta clínico especialista que cria materiais terapêuticos baseados em "
    "evidências, claros, lúdicos e adequados à faixa etária. Use linguagem profissional em "
    "português do Brasil. Responda APENAS em JSON válido, sem texto adicional, no schema:\n"
    '{"title": "título curto e específico", '
    '"objectives": ["objetivo 1", "objetivo 2", "objetivo 3"], '
    '"materials_needed": ["item 1", "item 2"], '
    '"duration_minutes": 20, '
    '"content": "descrição completa do material em parágrafos, passos numerados quando aplicável, '
    'sem markdown", '
    '"instructions": "orientações práticas para o terapeuta aplicar (1 parágrafo curto)"}'
)


def _coerce_str_list(value: object, limit: int = 8) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()][:limit]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _coerce_int(value: object) -> int | None:
    try:
        if value is None or value == "" or not isinstance(value, (str, int, float)):
            return None
        n = int(float(value))  # tolera "20" ou 20.0
        return max(1, min(180, n))
    except (TypeError, ValueError):
        return None


@router.post(
    "/material/generate",
    response_model=GeneratedMaterial,
    dependencies=[Depends(verify_internal_token)],
)
async def generate_material(
    req: GenerateMaterialRequest,
    user_id: str = Depends(get_user_id),
) -> GeneratedMaterial:
    _ = user_id
    user_msg = (
        f"Área clínica: {AREA_LABELS.get(req.area, req.area)}\n"
        f"Formato: {FORMAT_LABELS.get(req.format, req.format)}\n"
        f"Faixa etária: {AGE_LABELS.get(req.age, req.age)}\n"
        f"Contexto adicional: {req.context.strip() if req.context else 'nenhum'}"
    )
    messages = [
        {"role": "system", "content": MATERIAL_PROMPT},
        {"role": "user", "content": user_msg},
    ]

    try:
        raw = await openrouter_client.chat(messages, model=openrouter_client.clinical_model, max_tokens=1100, temperature=0.5)
    except OpenRouterError as exc:
        logger.warning("Clinical material provider unavailable")
        raise HTTPException(
            status_code=502,
            detail="Não foi possível gerar o material agora. Tente novamente mais tarde.",
        ) from exc

    parsed = _safe_json(raw) or {}
    title = str(parsed.get("title") or "").strip() or (
        f"{FORMAT_LABELS.get(req.format, req.format)} de {AREA_LABELS.get(req.area, req.area)}"
    )
    return GeneratedMaterial(
        title=title[:120],
        content=str(parsed.get("content") or raw).strip(),
        objectives=_coerce_str_list(parsed.get("objectives")),
        materials_needed=_coerce_str_list(parsed.get("materials_needed")),
        duration_minutes=_coerce_int(parsed.get("duration_minutes")),
        instructions=str(parsed.get("instructions") or "").strip()[:1000],
    )


# ── /report/generate (relatórios estruturados) ─────────────────────────

ReportTemplate = Literal["resumo", "evolucao-mensal", "encaminhamento", "avaliacao-inicial", "alta"]


class GenerateReportRequest(BaseModel):
    transcription: str = Field(min_length=10, max_length=50_000)
    template: ReportTemplate
    patient_name: str | None = None


class ReportSection(BaseModel):
    id: str
    label: str
    content: str
    isAIGenerated: bool = True
    hasHighlights: bool = False


class GenerateReportResponse(BaseModel):
    success: bool
    sections: list[ReportSection] | None = None
    error: str | None = None


REPORT_TEMPLATES: dict[str, list[tuple[str, str]]] = {
    "resumo": [
        ("contexto", "Contexto"),
        ("principais_pontos", "Principais Pontos"),
        ("conclusao", "Conclusão"),
    ],
    "evolucao-mensal": [
        ("periodo_avaliado", "Período Avaliado"),
        ("evolucao_clinica", "Evolução Clínica"),
        ("habilidades_desenvolvidas", "Habilidades Desenvolvidas"),
        ("dificuldades", "Dificuldades Observadas"),
        ("plano_proximo_mes", "Plano para o Próximo Mês"),
    ],
    "encaminhamento": [
        ("identificacao", "Identificação"),
        ("motivo_encaminhamento", "Motivo do Encaminhamento"),
        ("achados_clinicos", "Achados Clínicos"),
        ("hipotese_diagnostica", "Hipótese Diagnóstica"),
        ("conduta_sugerida", "Conduta Sugerida"),
    ],
    "avaliacao-inicial": [
        ("queixa_principal", "Queixa Principal"),
        ("historia_clinica", "História Clínica"),
        ("avaliacao", "Avaliação"),
        ("diagnostico_funcional", "Diagnóstico Funcional"),
        ("plano_terapeutico", "Plano Terapêutico"),
    ],
    "alta": [
        ("resumo_tratamento", "Resumo do Tratamento"),
        ("evolucao_global", "Evolução Global"),
        ("objetivos_alcancados", "Objetivos Alcançados"),
        ("orientacoes_pos_alta", "Orientações Pós-Alta"),
    ],
}


@router.post(
    "/report/generate",
    response_model=GenerateReportResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def generate_report(
    req: GenerateReportRequest,
    user_id: str = Depends(get_user_id),
) -> GenerateReportResponse:
    _ = user_id
    sections_def = REPORT_TEMPLATES.get(req.template)
    if not sections_def:
        return GenerateReportResponse(success=False, error="Template inválido")

    schema_keys = ", ".join(f'"{sid}"' for sid, _ in sections_def)
    system = (
        "Você é um fonoaudiólogo experiente redigindo um relatório clínico formal em português do Brasil. "
        "Baseie-se EXCLUSIVAMENTE na transcrição fornecida. Use linguagem profissional, objetiva e "
        "respeitosa. NUNCA invente informações ausentes — quando faltar dado, escreva 'Não informado'. "
        f"O relatório deve seguir o modelo '{req.template}' com as seções especificadas. "
        f"Cada seção deve ser um parágrafo claro e bem estruturado, com minimum 2 frases. "
        f"Responda APENAS em JSON válido com as chaves especificadas: {schema_keys}. "
        "Responda APENAS em JSON válido com as chaves especificadas, sem texto adicional."
    )
    user = (
        f"Paciente: {req.patient_name or 'Não informado'}\n"
        f"Modelo de relatório: {req.template}\n\n"
        f"TRANSCRIÇÃO:\n{req.transcription}"
    )

    logger.info(
        "Generating report: template=%s, patient=%s, transcription_len=%d",
        req.template,
        req.patient_name or "unknown",
        len(req.transcription),
    )

    try:
        raw = await openrouter_client.chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            model=openrouter_client.clinical_model,
            max_tokens=2000,
            temperature=0.2,
        )
    except OpenRouterError as e:
        return GenerateReportResponse(success=False, error=str(e))

    parsed = _safe_json(raw) or {}
    sections = [
        ReportSection(
            id=sid,
            label=label,
            content=str(parsed.get(sid, "Não informado")).strip() or "Não informado",
            isAIGenerated=True,
        )
        for sid, label in sections_def
    ]
    logger.info("Report generated: sections=%d, success=%s", len(sections), True)
    return GenerateReportResponse(success=True, sections=sections)


# ── /transcribe (Whisper) ──────────────────────────────────────────────


class TranscribeRequest(BaseModel):
    audio_session_id: str
    audio_url: str
    language: str = "pt"


class TranscribeResponse(BaseModel):
    transcription: str
    duration_ms: int | None = None


_ALLOWED_AUDIO_HOSTS = ("supabase.co", "amazonaws.com")
_ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/wav",
    "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac",
}
_MAX_AUDIO_BYTES = 50 * 1024 * 1024


def _is_allowed_audio_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            return False
        hostname = parsed.hostname.lower()
        return any(hostname == host or hostname.endswith(f".{host}") for host in _ALLOWED_AUDIO_HOSTS)
    except ValueError:
        return False


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def transcribe_audio(
    req: TranscribeRequest,
    user_id: str = Depends(get_user_id),
) -> TranscribeResponse:
    _ = user_id, req.language  # language hint não usado pelo Whisper-large-v3 (multilíngue auto)

    if not _is_allowed_audio_url(req.audio_url):
        raise HTTPException(status_code=400, detail="audio_url não permitida")

    # 1. Baixa o áudio por URL temporária assinada gerada pelo serviço API.
    try:
        timeout = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            async with client.stream("GET", req.audio_url) as audio_resp:
                if audio_resp.status_code >= 400:
                    raise HTTPException(status_code=502, detail="Falha baixando áudio")

                content_length = audio_resp.headers.get("content-length")
                if content_length:
                    try:
                        declared_size = int(content_length)
                    except ValueError as exc:
                        raise HTTPException(status_code=502, detail="Resposta de áudio inválida") from exc
                    if declared_size > _MAX_AUDIO_BYTES:
                        raise HTTPException(status_code=413, detail="Áudio excede o limite permitido")

                content_type = audio_resp.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type not in _ALLOWED_AUDIO_CONTENT_TYPES:
                    raise HTTPException(status_code=415, detail="Formato de áudio não suportado")

                chunks: list[bytes] = []
                size = 0
                async for chunk in audio_resp.aiter_bytes():
                    size += len(chunk)
                    if size > _MAX_AUDIO_BYTES:
                        raise HTTPException(status_code=413, detail="Áudio excede o limite permitido")
                    chunks.append(chunk)
                audio_bytes = b"".join(chunks)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Falha baixando áudio") from exc
    logger.info("Transcribing audio (%d bytes)", len(audio_bytes))

    # 2. Envia ao endpoint STT do OpenRouter.
    try:
        audio_format = content_type.rsplit("/", 1)[-1].replace("x-m4a", "m4a")
        text = await openrouter_client.transcribe(audio_bytes, audio_format=audio_format, language=req.language)
    except OpenRouterError as exc:
        logger.warning(
            "STT provider failure model=%s format=%s error=%s",
            openrouter_client.transcription_model,
            audio_format,
            str(exc)[:300],
        )
        raise HTTPException(status_code=502, detail="Falha no provedor de transcrição") from exc

    return TranscribeResponse(transcription=text)


# ── helpers ────────────────────────────────────────────────────────────


def _decode_json_object(candidate: str) -> dict[str, object] | None:
    try:
        value: object = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    if not isinstance(value, dict):
        return None
    return {str(key): item for key, item in value.items()}


def _safe_json(raw: str) -> dict[str, object] | None:
    """Tenta decodificar JSON, lidando com possíveis cercas markdown do LLM."""
    if not raw or not raw.strip():
        return None

    candidate = raw.strip()

    # Remove cerca markdown
    if candidate.startswith("```"):
        lines = candidate.split("\n")
        # Remove first and last lines (``` markers)
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        candidate = "\n".join(lines).strip()

    # Localiza primeira chave '{' e última '}'
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start >= 0 and end > start:
        candidate = candidate[start : end + 1]

    decoded = _decode_json_object(candidate)
    if decoded is not None:
        return decoded

    # Fallback: tenta limpar caracteres problemáticos
    import re

    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", " ", candidate)
    decoded = _decode_json_object(cleaned)
    if decoded is None:
        logger.warning("JSON parse failed after cleanup")
    return decoded
