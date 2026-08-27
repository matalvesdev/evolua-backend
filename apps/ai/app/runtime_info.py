import os
from importlib.metadata import PackageNotFoundError, version


def get_runtime_info(environment: str) -> dict[str, str]:
    try:
        service_version = version("evolua-ai")
    except PackageNotFoundError:
        service_version = "1.0.0"

    render_commit = os.getenv("RENDER_GIT_COMMIT", "").strip()
    return {
        "service": "evolua-ai",
        "version": service_version,
        "commit": render_commit[:12] if render_commit else "unknown",
        "environment": environment,
    }
