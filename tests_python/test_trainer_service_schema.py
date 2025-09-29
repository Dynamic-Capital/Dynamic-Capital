from __future__ import annotations

import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

pytest.importorskip("requests")
pytest.importorskip("torch")
pytest.importorskip("datasets")
pytest.importorskip("transformers")
pytest.importorskip("peft")
pytest.importorskip("fastapi")
pytest.importorskip("pydantic")

from trainer.main import (
    SupportedTaskType,
    build_hf_dataset,
    compute_domain_alignment,
    compute_generation_scores,
    format_instruction_example,
    parse_rows,
)


def write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    path.write_text("\n".join(json.dumps(row) for row in rows), encoding="utf-8")


def test_parse_rows_supports_instruction_and_language_detection(tmp_path: Path) -> None:
    dataset_path = tmp_path / "instruction.jsonl"
    write_jsonl(
        dataset_path,
        [
            {"prompt": "Provide a signal", "response": "Buy the breakout"},
            {
                "prompt": "ދިވެހި މަގު",
                "response": "ހުޅުވުމަށް ނުވަތަ ހުޅުވާ",
                "context": "ރަނގަޅު",
            },
        ],
    )

    rows = parse_rows(dataset_path, SupportedTaskType.CAUSAL_LM)

    assert len(rows) == 2
    assert rows[0]["language"] == "en"
    assert rows[1]["language"] == "dv"

    dataset = build_hf_dataset(rows, SupportedTaskType.CAUSAL_LM)
    assert set(dataset["train"].column_names) == {"prompt", "context", "response", "language"}


def test_parse_rows_supports_legacy_classification(tmp_path: Path) -> None:
    dataset_path = tmp_path / "classification.jsonl"
    write_jsonl(
        dataset_path,
        [
            {"input_text": "price falling", "label": "sell"},
            {"input_text": "support holds", "label": "buy"},
        ],
    )

    rows = parse_rows(dataset_path, SupportedTaskType.CLASSIFICATION)
    dataset = build_hf_dataset(rows, SupportedTaskType.CLASSIFICATION)

    assert set(dataset["train"].column_names) == {"text", "label"}
    assert set(dataset["train"]["label"]) <= {0, 1}


def test_format_instruction_example_includes_context_and_language() -> None:
    formatted = format_instruction_example(
        prompt="Explain tokenomics",
        response="Discuss supply schedules",
        context="DCT governance",
        language="en",
    )
    assert "LANG=en" in formatted
    assert "Context:" in formatted
    assert "Response:" in formatted


def test_compute_generation_scores_without_sacrebleu(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("trainer.main._load_sacrebleu", lambda: None)
    scores = compute_generation_scores(["buy low"], ["buy low"])
    assert scores["bleu"] >= 100.0 - 1e-6
    assert scores["chrf"] > 0.0


def test_compute_domain_alignment_distinguishes_domains() -> None:
    prompts = ["Provide trading advice", "Offer mentorship", "Explain governance"]
    predictions = ["Sell the rally", "Give feedback", "Discuss council voting"]
    score = compute_domain_alignment(prompts, predictions)
    assert 0.5 < score <= 1.0
