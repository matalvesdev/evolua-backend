from __future__ import annotations

import json
from pathlib import Path


def _load_jsonl(path: Path) -> list[dict[str, object]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def _edit_distance(reference: list[str], prediction: list[str]) -> int:
    previous = list(range(len(prediction) + 1))
    for row, ref_word in enumerate(reference, start=1):
        current = [row]
        for column, pred_word in enumerate(prediction, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + (ref_word != pred_word),
                )
            )
        previous = current
    return previous[-1]


def evaluate_asr(rows: list[dict[str, object]]) -> float:
    errors = 0
    words = 0
    for row in rows:
        reference = str(row["reference"]).lower().split()
        prediction = str(row["prediction"]).lower().split()
        errors += _edit_distance(reference, prediction)
        words += len(reference)
    return errors / words if words else 0.0


def evaluate_rag(rows: list[dict[str, object]], k: int = 3) -> tuple[float, float]:
    recalls: list[float] = []
    reciprocal_ranks: list[float] = []
    for row in rows:
        relevant = {str(item) for item in row["relevant_doc_ids"]}  # type: ignore[union-attr]
        retrieved = [str(item) for item in row["retrieved_doc_ids"]][:k]  # type: ignore[union-attr]
        recalls.append(len(relevant.intersection(retrieved)) / len(relevant) if relevant else 1.0)
        rank = next((index for index, item in enumerate(retrieved, start=1) if item in relevant), 0)
        reciprocal_ranks.append(1 / rank if rank else 0.0)
    return sum(recalls) / len(recalls), sum(reciprocal_ranks) / len(reciprocal_ranks)


def main() -> int:
    root = Path(__file__).parent
    wer = evaluate_asr(_load_jsonl(root / "asr_fixture.jsonl"))
    recall, mrr = evaluate_rag(_load_jsonl(root / "rag_fixture.jsonl"))
    print(json.dumps({"asr_wer": round(wer, 4), "rag_recall_at_3": recall, "rag_mrr": mrr}))
    return 0 if wer <= 0.20 and recall >= 0.80 and mrr >= 0.70 else 1


if __name__ == "__main__":
    raise SystemExit(main())
