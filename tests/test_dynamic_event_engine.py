from __future__ import annotations

import pytest

from dynamic_event import DynamicEventEngine, EventContext, EventPulse


def test_dynamic_event_engine_prioritise_generates_operational_frame() -> None:
    engine = DynamicEventEngine(window=5)
    engine.extend(
        [
            EventPulse(
                source="Ops",
                category="Incident",
                description="API latency spike",
                urgency=0.8,
                impact=0.7,
                confidence=0.9,
                preparedness=0.3,
                tags=("api", "latency"),
            ),
            EventPulse(
                source="Ops",
                category="Maintenance",
                description="Planned upgrade drift",
                urgency=0.4,
                impact=0.6,
                confidence=0.7,
                preparedness=0.6,
            ),
            EventPulse(
                source="Intel",
                category="Market",
                description="Regulatory rumour surfacing",
                urgency=0.6,
                impact=0.8,
                confidence=0.6,
                preparedness=0.5,
            ),
        ]
    )

    context = EventContext(
        operating_mode="Command",
        team_capacity=0.55,
        risk_appetite=0.3,
        communication_bandwidth=0.45,
        escalation_threshold=0.65,
    )

    frame = engine.prioritise(context)

    assert len(engine) == 3
    assert frame.priority_index == pytest.approx(0.675, rel=1e-3)
    assert frame.expected_impact == pytest.approx(0.536, rel=1e-3)
    assert frame.coordination_load == pytest.approx(0.3875, rel=1e-3)
    assert frame.dominant_sources == ("ops", "intel")
    assert frame.dominant_categories == ("incident", "market", "maintenance")
    assert "Priority exceeds escalation threshold." in frame.alerts
    assert (
        "Communication bandwidth is stretched for timely updates." in frame.alerts
    )
    assert frame.recommended_actions[0] == "Schedule immediate leadership review."
    assert "Increase frequency of situation updates." in frame.recommended_actions


def test_event_context_flags() -> None:
    context = EventContext(
        operating_mode="Adaptive",
        team_capacity=0.35,
        risk_appetite=0.25,
        communication_bandwidth=0.3,
        escalation_threshold=0.7,
        active_initiatives=("Launch", "Stabilise"),
    )

    assert context.is_capacity_constrained is True
    assert context.prefers_caution is True
    assert context.bandwidth_stretched is True
    assert context.requires_escalation(0.71) is True
    assert context.requires_escalation(0.5) is False
