"""Tests for the dynamic checkpoint orchestration helper."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_algo.dynamic_checkpoints import (
    DynamicCheckpoint,
    DynamicCheckpointRegistry,
    CheckpointConfigError,
)


def _ts(days: int) -> datetime:
    return datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(days=days)


def test_checkpoint_normalises_configuration() -> None:
    checkpoint = DynamicCheckpoint(
        checkpoint_id="  Liquidity runway  ",
        category=" Treasury ",
        description="  Review cash runway scenarios  ",
        cadence_days="30",
        owner="  Alex Morgan  ",
        tags=["Finance", "finance", " Runway "],
        metadata={"source": "fusion"},
        criticality="0.75",
        grace_days="3",
        last_status="Completed",
        last_notes="  All good  ",
    )

    assert checkpoint.checkpoint_id == "Liquidity runway"
    assert checkpoint.category == "treasury"
    assert checkpoint.description == "Review cash runway scenarios"
    assert checkpoint.cadence_days == 30
    assert checkpoint.owner == "Alex Morgan"
    assert checkpoint.tags == ("Finance", "Runway")
    assert checkpoint.metadata == {"source": "fusion"}
    assert checkpoint.criticality == pytest.approx(0.75)
    assert checkpoint.grace_days == 3
    assert checkpoint.last_status == "completed"
    assert checkpoint.last_notes == "All good"


def test_checkpoint_due_logic_with_cadence_and_grace() -> None:
    checkpoint = DynamicCheckpoint(
        checkpoint_id="Ops Review",
        category="operations",
        description="Run operations checkpoint",
        cadence_days=7,
        grace_days=2,
    )

    checkpoint.mark_result(status="completed", completed_at=_ts(0))

    assert checkpoint.is_due(now=_ts(6)) is False
    assert checkpoint.is_due(now=_ts(7)) is True

    checkpoint.mark_result(status="completed", completed_at=_ts(7))

    assert checkpoint.is_due(now=_ts(12)) is False
    assert checkpoint.is_due(now=_ts(12), include_within_grace=True) is True
    assert checkpoint.is_due(now=_ts(15)) is True


def test_registry_resolves_due_checkpoints_with_filters() -> None:
    registry = DynamicCheckpointRegistry(
        [
            {
                "checkpoint_id": "Market Risk",
                "category": "risk",
                "description": "Stress test liquidity",
                "cadence_days": 14,
                "criticality": 0.9,
                "owner": "Risk Desk",
                "tags": ["risk", "core"],
            },
            {
                "checkpoint_id": "Playbook Review",
                "category": "ops",
                "description": "Refresh desk playbooks",
                "owner": "Ops Team",
                "tags": ["ops"],
            },
            {
                "checkpoint_id": "Billing Audit",
                "category": "finance",
                "description": "Audit partner billing",
                "cadence_days": 30,
                "criticality": 0.4,
                "owner": "Finance",
                "tags": ["finance"],
            },
        ]
    )

    registry.record_result("Market Risk", completed_at=_ts(0))
    registry.record_result("Billing Audit", completed_at=_ts(2))

    due = registry.resolve_due_checkpoints(now=_ts(16))
    assert [checkpoint.checkpoint_id for checkpoint in due] == [
        "Playbook Review",
        "Market Risk",
    ]

    ops_only = registry.resolve_due_checkpoints(now=_ts(16), owners=["Ops Team"])
    assert [checkpoint.checkpoint_id for checkpoint in ops_only] == ["Playbook Review"]

    risk_tagged = registry.resolve_due_checkpoints(now=_ts(16), tags=["risk"])
    assert [checkpoint.checkpoint_id for checkpoint in risk_tagged] == ["Market Risk"]


def test_record_result_updates_runtime_state() -> None:
    registry = DynamicCheckpointRegistry(
        [
            {
                "checkpoint_id": "Desk Retro",
                "category": "ops",
                "description": "Team retro checkpoint",
                "owner": "Ops Team",
            }
        ]
    )

    checkpoint = registry.record_result(
        "Desk Retro",
        status="completed",
        completed_at=_ts(5),
        notes="Captured action items",
    )

    assert checkpoint.last_status == "completed"
    assert checkpoint.last_completed_at == _ts(5)
    assert checkpoint.last_notes == "Captured action items"

    registry.record_result("Desk Retro", status="reset")
    assert checkpoint.last_completed_at is None
    assert checkpoint.last_status == "reset"


def test_invalid_configuration_raises() -> None:
    with pytest.raises(CheckpointConfigError):
        DynamicCheckpoint(checkpoint_id="", category="ops", description="Missing cadence", cadence_days=0)

    with pytest.raises(CheckpointConfigError):
        DynamicCheckpoint(checkpoint_id="x", category="", description="no category")

    with pytest.raises(CheckpointConfigError):
        DynamicCheckpoint(checkpoint_id="y", category="ops", description="bad criticality", criticality=2)
