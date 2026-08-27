from app.runtime_info import get_runtime_info


def test_runtime_info_exposes_abbreviated_render_commit(monkeypatch) -> None:
    monkeypatch.setenv("RENDER_GIT_COMMIT", "1234567890abcdef1234567890abcdef12345678")

    assert get_runtime_info("staging") == {
        "service": "evolua-ai",
        "version": "1.0.0",
        "commit": "1234567890ab",
        "environment": "staging",
    }


def test_runtime_info_uses_explicit_local_fallback(monkeypatch) -> None:
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)

    assert get_runtime_info("test")["commit"] == "unknown"
