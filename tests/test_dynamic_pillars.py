"""Tests for the Dynamic Pillar framework."""

from __future__ import annotations

import math
from datetime import datetime, timezone, timedelta

import pytest

from dynamic_pillars import (
    DynamicPillarFramework,
    PillarDefinition,
    PillarSignal,
)


def _ts(minutes: int) -> datetime:
    return datetime(2024, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def test_snapshot_with_signals_generates_status_and_alerts() -> None:
    framework = DynamicPillarFramework(
        history=5,
        decay=0.1,
        definitions=[
            PillarDefinition(
                key="execution",
                title="Execution",
                description="Delivery velocity and ritual adherence",
                minimum_health=0.4,
                target_health=0.75,
                guardrails=("cadence", "quality"),
            )
        ],
    )
    framework.ingest(
        [
            PillarSignal(
                pillar="execution",
                score=0.35,
                confidence=0.55,
                momentum=-0.2,
                timestamp=_ts(0),
                narrative="Sprint slipped due to blocked integrations",
            ),
            PillarSignal(
                pillar="execution",
                score=0.5,
                confidence=0.65,
                momentum=0.1,
                timestamp=_ts(30),
                narrative="Recovery plan deployed",
            ),
        ]
    )

    snapshot = framework.snapshot("execution")

    assert snapshot.key == "execution"
    assert 0.35 < snapshot.score < 0.55
    assert snapshot.status == "watch"
    assert any("guardrails" in alert or "Recovery" in alert for alert in snapshot.alerts)
    assert "Execution is"[:5] == snapshot.summary[:5]


def test_snapshot_without_signals_reports_insufficient_data() -> None:
    definition = PillarDefinition(key="growth", title="Growth", description="")
    framework = DynamicPillarFramework(definitions=[definition])

    snapshot = framework.snapshot("growth")

    assert snapshot.status == "insufficient-data"
    assert snapshot.score == 0.0
    assert snapshot.alerts == ("Growth: insufficient data",)


def test_overview_prioritises_non_healthy_pillars() -> None:
    framework = DynamicPillarFramework(
        definitions=[
            PillarDefinition(key="trust", title="Trust", target_health=0.8),
            PillarDefinition(key="automation", title="Automation", target_health=0.7),
        ]
    )
    framework.ingest(
        [
            PillarSignal(
                pillar="trust",
                score=0.85,
                confidence=0.7,
                momentum=0.1,
                timestamp=_ts(10),
            ),
            PillarSignal(
                pillar="automation",
                score=0.3,
                confidence=0.6,
                momentum=-0.3,
                timestamp=_ts(20),
            ),
        ]
    )

    overview = framework.overview()

    assert overview.overall_health < 0.6
    assert math.isclose(overview.stability, 0.65, rel_tol=1e-2)
    assert overview.priorities == ("Automation",)
    assert any("Automation" in alert for alert in overview.alerts)
    assert "Stabilise pillars" in overview.narrative


def test_overview_without_definitions_raises_runtime_error() -> None:
    framework = DynamicPillarFramework()
    with pytest.raises(RuntimeError):
        framework.overview()


def test_register_accepts_mapping() -> None:
    framework = DynamicPillarFramework()
    definition = framework.register(
        {
            "key": "resilience",
            "title": "Resilience",
            "guardrails": ("incident response",),
        }
    )

    assert isinstance(definition, PillarDefinition)
    assert "resilience" in framework.definitions
