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
from ..hf_client import HuggingFaceError, HuggingFaceModelLoading, hf_client

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
        raw = await hf_client.chat(messages, max_tokens=900, temperature=0.2)
    except HuggingFaceModelLoading as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except HuggingFaceError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    parsed = _safe_json(raw)
    if not parsed:
        raise HTTPException(status_code=502, detail="LLM não retornou JSON válido")

    soap = parsed.get("soap") or {}
    return GeneratedEvolution(
        soap={
            "subjective": str(soap.get("subjective", "")),
            "objective": str(soap.get("objective", "")),
            "assessment": str(soap.get("assessment", "")),
            "plan": str(soap.get("plan", "")),
        },
        summary=str(parsed.get("summary", "")),
        next_session_suggestions=[str(s) for s in (parsed.get("next_session_suggestions") or [])][:5],
    )


# ── /material/generate ─────────────────────────────────────────────────


TherapyArea = Literal[
    "linguagem", "fala", "fluencia", "voz",
    "degluticao", "fonologia", "mof", "tea", "caa",
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
        if value is None or value == "":
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
        raw = await hf_client.chat(messages, max_tokens=1100, temperature=0.5)
    except HuggingFaceModelLoading as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except HuggingFaceError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    parsed = _safe_json(raw) or {}
    title = str(parsed.get("title") or "").strip() or (
        f"{FORMAT_LABELS.get(req.format, req.format)} de "
        f"{AREA_LABELS.get(req.area, req.area)}"
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
        "Você é um terapeuta clínico redigindo um relatório formal em português do Brasil, "
        "baseado exclusivamente na transcrição fornecida. Use linguagem profissional, "
        "objetiva e respeitosa. NÃO invente informações ausentes do transcript — quando "
        f"faltar dado, escreva 'Não informado'. Responda em JSON com as chaves: {schema_keys}. "
        "Cada valor deve ser um parágrafo de texto claro, sem markdown."
    )
    user = (
        f"Paciente: {req.patient_name or 'Não informado'}\n"
        f"Modelo de relatório: {req.template}\n\n"
        f"TRANSCRIÇÃO:\n{req.transcription}"
    )

    try:
        raw = await hf_client.chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=1400,
            temperature=0.2,
        )
    except HuggingFaceModelLoading as e:
        return GenerateReportResponse(success=False, error=str(e))
    except HuggingFaceError as e:
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


def _is_allowed_audio_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            return False
        return any(parsed.hostname.endswith(h) for h in _ALLOWED_AUDIO_HOSTS)
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

    # 1. Baixa o áudio (Supabase Storage público).
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            audio_resp = await client.get(req.audio_url)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Falha baixando áudio: {e}") from e

    if audio_resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Falha baixando áudio: HTTP {audio_resp.status_code}",
        )

    audio_bytes = audio_resp.content
    content_type = audio_resp.headers.get("content-type", "audio/webm")
    logger.info("Transcribing %d bytes (%s) for session %s", len(audio_bytes), content_type, req.audio_session_id)

    # 2. Envia ao Whisper.
    try:
        text = await hf_client.transcribe(audio_bytes, content_type=content_type)
    except HuggingFaceModelLoading as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except HuggingFaceError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return TranscribeResponse(transcription=text)


# ── helpers ────────────────────────────────────────────────────────────


def _safe_json(raw: str) -> dict | None:
    """Tenta decodificar JSON, lidando com possíveis cercas markdown do LLM."""
    candidate = raw.strip()
    if candidate.startswith("```"):
        # Remove cerca: ```json\n...\n``` ou ```\n...\n```
        candidate = candidate.split("```", 2)[1]
        if candidate.startswith("json"):
            candidate = candidate[4:]
        candidate = candidate.strip("`\n ")
    # Localiza primeira chave '{' e última '}' caso o LLM tenha adicionado prólogo.
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start >= 0 and end > start:
        candidate = candidate[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed: %s | raw=%s", e, raw[:200])
        return None
