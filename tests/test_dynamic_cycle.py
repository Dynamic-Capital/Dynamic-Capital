from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_cycle import (
    CycleEvent,
    CyclePhase,
    DynamicCycleOrchestrator,
    create_dynamic_life_cycle,
)


@pytest.fixture()
def orchestrator() -> DynamicCycleOrchestrator:
    phases = (
        CyclePhase(
            key="discovery",
            title="Discovery",
            description="Frame the problem space",
            entry_criteria=("brief aligned",),
            exit_criteria=("hypothesis locked",),
            expected_duration_hours=12,
            tags=("research", "analysis"),
        ),
        CyclePhase(
            key="delivery",
            title="Delivery",
            description="Execute and measure",
            expected_duration_hours=24,
            tags=("execution",),
        ),
    )
    return DynamicCycleOrchestrator(phases=phases)


def test_snapshot_defaults(orchestrator: DynamicCycleOrchestrator) -> None:
    snapshot = orchestrator.snapshot("discovery")

    assert snapshot.progress == pytest.approx(0.0)
    assert snapshot.status == "initiated"
    assert snapshot.alerts == ()
    assert snapshot.tags == ("analysis", "research")
    payload = snapshot.as_dict()
    assert payload["key"] == "discovery"
    assert payload["progress"] == pytest.approx(0.0)
    assert payload["events"] == []


def test_event_progression_and_velocity(orchestrator: DynamicCycleOrchestrator) -> None:
    base = datetime(2025, 1, 1, tzinfo=timezone.utc)
    orchestrator.record(
        CycleEvent(
            phase="discovery",
            category="research",
            description="Initial interviews complete",
            timestamp=base,
            progress=0.3,
            confidence=0.8,
            tags=("customers",),
            impact=1.0,
        )
    )
    orchestrator.record(
        CycleEvent(
            phase="discovery",
            category="synthesis",
            description="Signal aligned",
            timestamp=base + timedelta(hours=1),
            progress=0.7,
            confidence=0.9,
            tags=("insights",),
        )
    )

    snapshot = orchestrator.snapshot("discovery")

    assert snapshot.progress == pytest.approx(0.51176, rel=1e-3)
    assert snapshot.velocity_per_hour == pytest.approx(0.4, rel=1e-3)
    assert snapshot.momentum >= 0.0
    assert snapshot.status == "in_progress"
    assert snapshot.notes == ("research: Initial interviews complete",)
    assert snapshot.tags == ("analysis", "customers", "insights", "research")

    payload = snapshot.as_dict()
    assert payload["metadata"]["event_count"] == 2
    assert payload["alerts"] == []


def test_overview_includes_all_phases(orchestrator: DynamicCycleOrchestrator) -> None:
    overview = orchestrator.overview()

    assert set(overview.keys()) == {"discovery", "delivery"}
    assert overview["delivery"].definition.title == "Delivery"


def test_alerts_trigger_on_duration(orchestrator: DynamicCycleOrchestrator) -> None:
    stale_time = datetime.now(timezone.utc) - timedelta(hours=40)
    orchestrator.record(
        CycleEvent(
            phase="delivery",
            category="status",
            description="Kickoff",
            timestamp=stale_time,
            progress=0.1,
        )
    )

    snapshot = orchestrator.snapshot("delivery")

    assert snapshot.alerts != ()
    assert "expected duration" in snapshot.alerts[0]
    assert snapshot.status in {"initiated", "at_risk"}


def test_rewind_prunes_old_events(orchestrator: DynamicCycleOrchestrator) -> None:
    old_time = datetime.now(timezone.utc) - timedelta(hours=10)
    orchestrator.record(
        CycleEvent(
            phase="discovery",
            category="research",
            description="Archived",
            timestamp=old_time,
            progress=0.4,
        )
    )
    orchestrator.rewind(hours=1)

    snapshot = orchestrator.snapshot("discovery")

    assert snapshot.progress == pytest.approx(0.0)
    assert snapshot.metadata["event_count"] == 0


def test_create_dynamic_life_cycle_bootstraps_phases() -> None:
    orchestrator = create_dynamic_life_cycle(history=42)

    assert orchestrator.current_phase == "emergence"
    assert len(orchestrator.phases) == 5
    assert orchestrator.phases[0].title == "Emergence"
    assert orchestrator.phases[-1].key == "renewal"


def test_create_dynamic_life_cycle_supports_overrides_and_extensions() -> None:
    orchestrator = create_dynamic_life_cycle(
        overrides={
            "expansion": {
                "expected_duration_hours": 360.0,
                "tags": ("execution", "scale"),
            }
        },
        additional_phases=[
            {
                "key": "sunset",
                "title": "Sunset",
                "description": "Retire and transition operations",
                "tags": ("closure",),
            }
        ],
        start_phase="formation",
    )

    assert orchestrator.current_phase == "formation"
    assert orchestrator.phases[0].key == "emergence"
    expansion = next(phase for phase in orchestrator.phases if phase.key == "expansion")
    assert expansion.expected_duration_hours == pytest.approx(360.0)
    assert expansion.tags == ("execution", "scale")
    assert orchestrator.phases[-1].key == "sunset"
