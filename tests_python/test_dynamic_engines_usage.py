from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_assign.engine import AgentProfile
from dynamic.platform.engines import DynamicUsageOrchestrator, PersonaSignal
from dynamic_space.engine import SpaceNetworkOverview
from dynamic_zone.zone import Zone, ZoneBoundary


def _build_zone(name: str) -> Zone:
    return Zone(
        name=name,
        boundary=ZoneBoundary(min_x=0, max_x=10, min_y=0, max_y=10),
        capacity=5,
        tags=("level-1",),
    )


def test_usage_orchestrator_links_zone_space_and_assignment() -> None:
    orchestrator = DynamicUsageOrchestrator()
    orchestrator.register_zone(_build_zone("Operations Hub"))
    orchestrator.register_sector(
        {
            "name": "Lunar Logistics",
            "hazard_index": 0.4,
            "supply_level": 0.7,
            "energy_output_gw": 1.25,
        }
    )

    signal = PersonaSignal(
        persona="research",
        summary="Fuel leak risk within the operations hub",
        zone="Operations Hub",
        sector="Lunar Logistics",
        severity=0.82,
        required_skills=("safety", "engineering"),
        estimated_effort_hours=3.5,
    )

    agents = (
        AgentProfile(
            name="Ava",
            skills=("safety", "engineering"),
            available_hours=6,
            confidence=0.8,
        ),
        AgentProfile(
            name="Milo",
            skills=("navigation",),
            available_hours=5,
            confidence=0.9,
        ),
    )

    result = orchestrator.plan_cycle((signal,), agents)

    assert len(result.assignments) == 1
    decision = result.assignments[0]
    assert decision.agent == "Ava"
    assert decision.task_id == result.tasks[0].identifier

    snapshot = result.zone_snapshots["Operations Hub"]
    assert snapshot.status in {"active", "overloaded"}

    assert isinstance(result.space_overview, SpaceNetworkOverview)
    assert "Lunar Logistics" in result.space_overview.snapshots


def test_usage_orchestrator_can_register_missing_zone_and_sector() -> None:
    orchestrator = DynamicUsageOrchestrator()

    signal = PersonaSignal(
        persona="risk",
        summary="Telemetry drift detected",
        zone="Edge Case",
        sector="Outer Belt",
        severity=0.45,
        zone_configuration={
            "name": "Edge Case",
            "boundary": {
                "min_x": -5,
                "max_x": 5,
                "min_y": -5,
                "max_y": 5,
            },
            "capacity": 3,
        },
        sector_configuration={
            "name": "Outer Belt",
            "hazard_index": 0.4,
            "supply_level": 0.65,
            "energy_output_gw": 0.9,
        },
    )

    agents = (
        AgentProfile(
            name="Lina",
            skills=("analysis", "risk"),
            available_hours=4,
            confidence=0.75,
        ),
    )

    result = orchestrator.plan_cycle((signal,), agents)

    assert "Edge Case" in result.zone_snapshots
    assert "Outer Belt" in result.space_overview.snapshots
