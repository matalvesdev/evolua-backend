"""Validate Render Blueprints against Render's official JSON Schema."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.request import urlopen

import yaml
from jsonschema.validators import validator_for

SCHEMA_URL = "https://render.com/schema/render.yaml.json"
BLUEPRINTS = (Path("render.yaml"), Path("render.staging.yaml"))


def main() -> None:
    with urlopen(SCHEMA_URL, timeout=30) as response:
        schema = json.load(response)

    validator_class = validator_for(schema)
    validator_class.check_schema(schema)
    validator = validator_class(schema)

    invalid = False
    for blueprint in BLUEPRINTS:
        document = yaml.safe_load(blueprint.read_text(encoding="utf-8"))
        errors = sorted(validator.iter_errors(document), key=lambda error: list(error.path))
        if not errors:
            print(f"VALID {blueprint}")
            continue

        invalid = True
        for error in errors:
            location = "/".join(str(part) for part in error.path) or "<root>"
            print(f"ERROR {blueprint}:{location}: {error.message}")

    if invalid:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
