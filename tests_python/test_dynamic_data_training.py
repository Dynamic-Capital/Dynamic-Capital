from __future__ import annotations

from datetime import datetime
from typing import Mapping

import pytest

from dynamic_data_training import (
    DataTrainingSummary,
    DynamicDataTrainingEngine,
    generate_training_report,
    generate_training_summary,
)
from dynamic_trainer import DynamicTrainerModel, TrainingSignal


def _sample_records() -> list[Mapping[str, object]]:
    return [
        {
            "prompt": "Summarise the latest market update",
            "response": "The market closed higher with strong liquidity inflows.",
            "context": "evening-briefing",
            "tags": ["market", "summary"],
            "language": "en",
        },
        {
            "prompt": "Provide compliance checkpoints",
            "response": "Verify trade surveillance and policy attestations.",
            "context": "compliance-digest",
            "tags": ["compliance", "policy"],
            "language": "en",
        },
        {
            "prompt": "Outline onboarding packet",
            "response": "Include platform overview and risk handbook excerpts.",
            "context": "ops-playbook",
            "tags": ["onboarding", "operations"],
            "language": "en",
        },
    ]


def test_generate_training_summary_returns_readiness_model() -> None:
    summary = generate_training_summary(_sample_records(), objective="ops-knowledge-base")

    assert isinstance(summary, DataTrainingSummary)
    assert isinstance(summary.readiness, DynamicTrainerModel)
    assert summary.signals
    assert all(isinstance(signal, TrainingSignal) for signal in summary.signals)

    readiness = summary.readiness
    assert readiness.sample_size == len(summary.signals)
    assert readiness.metadata["averages"]["accuracy"] > 0
    assert summary.diagnostics["base_metrics"]["dataset_rows"] == len(_sample_records())


def test_generate_training_report_is_json_ready() -> None:
    report = generate_training_report(_sample_records(), objective="ops-knowledge-base")

    assert report["objective"] == "ops-knowledge-base"
    assert isinstance(report["signals"], list)
    assert report["dataset_rows"] == len(_sample_records())

    timestamps = [datetime.fromisoformat(item["timestamp"]) for item in report["signals"]]
    assert all(timestamp.tzinfo is not None for timestamp in timestamps)


def test_dynamic_data_training_engine_wraps_helpers() -> None:
    engine = DynamicDataTrainingEngine(objective="ops-knowledge-base", epochs=2)

    summary = engine.summarise(_sample_records())
    report = engine.report(_sample_records())

    assert summary.readiness.readiness == pytest.approx(report["readiness"]["readiness"], rel=1e-9)
    assert len(report["signals"]) == len(summary.signals)
    assert report["epochs"] == summary.diagnostics["epochs"]

