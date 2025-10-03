from __future__ import annotations

import json
from pathlib import Path

import pytest

from dynamic_knowledge_base_training import (
    DynamicKnowledgeBaseTrainer,
    KnowledgeBaseDataset,
    load_knowledge_base_records,
)


@pytest.fixture()
def sample_datasets(tmp_path: Path) -> tuple[Path, Path]:
    jsonl_path = tmp_path / "sample.jsonl"
    jsonl_records = [
        {
            "prompt": "Summarise policy updates",
            "response": "Outline compliance checkpoints and attestations.",
            "context": "ops-briefing",
            "tags": ["policy", "operations"],
            "language": "en",
        },
        {
            "prompt": "Draft onboarding walkthrough",
            "response": "Highlight system access requirements and safety guides.",
            "context": "training-module",
            "tags": ["onboarding", "ops"],
            "language": "en",
        },
    ]
    jsonl_path.write_text("\n".join(json.dumps(record) for record in jsonl_records), encoding="utf-8")

    json_path = tmp_path / "supplemental.json"
    json_path.write_text(
        json.dumps(
            [
                {
                    "prompt": "Provide escalation paths",
                    "response": "Escalate to duty officer then operations council.",
                    "context": "incident-response",
                    "tags": ["escalation", "ops"],
                    "language": "en",
                }
            ]
        ),
        encoding="utf-8",
    )

    return jsonl_path, json_path


def test_load_knowledge_base_records_supports_multiple_formats(sample_datasets: tuple[Path, Path]) -> None:
    dataset = load_knowledge_base_records(sample_datasets)

    assert isinstance(dataset, KnowledgeBaseDataset)
    assert len(dataset.records) == 3
    assert {record["context"] for record in dataset.records} == {
        "ops-briefing",
        "training-module",
        "incident-response",
    }
    assert dataset.sources == sample_datasets


def test_dynamic_knowledge_base_trainer_builds_summary(sample_datasets: tuple[Path, Path]) -> None:
    trainer = DynamicKnowledgeBaseTrainer()

    summary = trainer.summarise(sample_datasets)
    report = trainer.report(sample_datasets)

    assert summary.readiness.readiness == pytest.approx(report["readiness"]["readiness"], rel=1e-9)
    assert summary.readiness.sample_size == len(summary.signals)
    assert report["objective"] == "knowledge-base-training"
    assert report["sources"] == [str(path) for path in sample_datasets]


def test_dynamic_knowledge_base_trainer_accepts_preloaded_dataset(
    sample_datasets: tuple[Path, Path]
) -> None:
    trainer = DynamicKnowledgeBaseTrainer()
    dataset = load_knowledge_base_records(sample_datasets)

    summary = trainer.summarise(dataset)
    report = trainer.report(dataset)

    assert summary.readiness.sample_size == len(dataset.records)
    assert report["sources"] == [str(path) for path in dataset.sources]
