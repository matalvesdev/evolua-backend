import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.routers.clinical import GenerateReportRequest, _is_allowed_audio_url, _safe_json
from app.routers.library_ingest import _validate_source_url


def test_report_contract_rejects_short_or_unknown_template() -> None:
    with pytest.raises(ValidationError):
        GenerateReportRequest(transcription="curta", template="resumo")
    with pytest.raises(ValidationError):
        GenerateReportRequest(transcription="transcrição clínica válida", template="inventado")


def test_safe_json_accepts_fenced_llm_output() -> None:
    assert _safe_json('```json\n{"summary":"ok"}\n```') == {"summary": "ok"}
    assert _safe_json("não é json") is None


@pytest.mark.parametrize(
    ("url", "allowed"),
    [
        ("https://tenant.supabase.co/audio.webm", True),
        ("https://bucket.s3.amazonaws.com/audio.webm", True),
        ("https://evil-supabase.co/audio.webm", False),
        ("http://tenant.supabase.co/audio.webm", False),
        ("https://127.0.0.1/audio.webm", False),
    ],
)
def test_audio_url_allowlist_has_domain_boundaries(url: str, allowed: bool) -> None:
    assert _is_allowed_audio_url(url) is allowed


@pytest.mark.parametrize("url", ["http://example.com/doc.pdf", "https://127.0.0.1/doc.pdf", "https://169.254.169.254/latest"])
def test_library_ingest_rejects_unsafe_sources(url: str) -> None:
    with pytest.raises(HTTPException):
        _validate_source_url(url)
