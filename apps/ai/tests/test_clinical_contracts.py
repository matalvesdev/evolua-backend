import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.routers import library, library_ingest
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


def test_library_ingest_rejects_hostname_resolving_to_private_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        library_ingest.socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: [(2, 1, 6, "", ("10.0.0.8", 443))],
    )

    with pytest.raises(HTTPException, match="rede não pública"):
        _validate_source_url("https://documents.example.com/source.pdf")


def test_library_retrieval_filters_by_clinic_before_vector_ranking(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, tuple[object, ...]]] = []

    class FakeCursor:
        description: list[object] = []

        def __enter__(self) -> "FakeCursor":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def execute(self, sql: str, args: tuple[object, ...]) -> None:
            calls.append((sql, args))

        def fetchall(self) -> list[tuple[object, ...]]:
            return []

    class FakeConnection:
        def __enter__(self) -> "FakeConnection":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def cursor(self) -> FakeCursor:
            return FakeCursor()

    monkeypatch.setattr(library.psycopg, "connect", lambda *_args, **_kwargs: FakeConnection())

    library._retrieve_sync("postgresql://example", "[0.1]", "clinic-a", 4)

    sql, args = calls[0]
    assert "WHERE clinic_id = %s" in sql
    assert args == ("[0.1]", "clinic-a", "[0.1]", 4)
