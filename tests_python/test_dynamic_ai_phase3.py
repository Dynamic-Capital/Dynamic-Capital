from __future__ import annotations

import math
import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:  # pragma: no cover - path hygiene for pytest discovery
    sys.path.insert(0, str(ROOT))

from dynamic.intelligence.ai_apps.phase3 import (
    AgentProfile,
    Assignment,
    BacklogItem,
    PhaseThreePlan,
    build_phase_three_plan,
)


def test_build_phase_three_plan_assigns_agents_and_packets() -> None:
    backlog = [
        {
            "id": "B1",
            "title": "Macro scenario analysis",
            "required_skills": ["analysis", "macro"],
            "effort": 1.0,
        },
        {
            "id": "B2",
            "title": "Treasury guardrail refresh",
            "required_skills": ["risk", "treasury"],
            "effort": 0.5,
        },
        {
            "id": "B3",
            "title": "Agent onboarding playbooks",
            "required_skills": ["operations", "compliance"],
            "effort": 0.75,
        },
    ]
    agents = [
        {
            "name": "Research Agent",
            "skills": ["analysis", "macro", "sentiment"],
            "capacity": 2.0,
            "channels": ["daily_sync", "async_digest"],
            "preferred_cadence": "Daily research standup",
        },
        {
            "name": "Risk Agent",
            "skills": ["risk", "treasury", "compliance"],
            "capacity": 1.5,
            "channels": ["risk_review"],
            "preferred_cadence": "Daily risk huddle",
        },
        {
            "name": "Operations Agent",
            "skills": ["operations", "automation"],
            "capacity": 1.0,
            "channels": ["ops_room"],
            "onboarded": False,
        },
    ]

    plan = build_phase_three_plan(backlog, agents, default_cadence="Weekly sync")

    assert isinstance(plan, PhaseThreePlan)
    assert len(plan.assignments) == 3
    assignment_map = {assignment.item_id: assignment for assignment in plan.assignments}

    assert assignment_map["B1"].primary_agent == "Research Agent"
    assert assignment_map["B2"].primary_agent == "Risk Agent"
    assert assignment_map["B3"].primary_agent == "Operations Agent"

    assert plan.coverage_ratio > 1.0
    assert any(packet.agent == "Operations Agent" for packet in plan.onboarding_packets)

    matrix = {line.agent: line for line in plan.communication_matrix}
    assert matrix["Risk Agent"].cadence == "Daily risk huddle"
    assert "ops_room" in matrix["Operations Agent"].channels


def test_build_phase_three_plan_exposes_shortfalls() -> None:
    backlog = [
        BacklogItem(id="X1", title="High effort task", required_skills=("analysis",), effort=3.0)
    ]
    agents = [
        AgentProfile(name="Limited Agent", skills=("analysis",), capacity=1.0),
    ]

    plan = build_phase_three_plan(backlog, agents)

    assert pytest.approx(plan.coverage_ratio, rel=1e-3) == 1.0 / 3.0
    assert len(plan.assignments) == 1
    assignment = plan.assignments[0]
    assert isinstance(assignment, Assignment)
    assert assignment.coverage < 1.0
    assert any("shortfall" in note.lower() for note in assignment.notes)
    assert "Resolve capacity gaps" in plan.summary


def test_phase_three_plan_to_dict_round_trips() -> None:
    item = BacklogItem(id="A1", title="Task", required_skills=("analysis",))
    agent = AgentProfile(name="Agent", skills=("analysis",), capacity=1.0)
    plan = build_phase_three_plan([item], [agent])
    payload = plan.to_dict()

    assert payload["assignments"][0]["item_id"] == "A1"
    assert math.isclose(payload["coverage_ratio"], plan.coverage_ratio, rel_tol=1e-6)
