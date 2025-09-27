from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from algorithms.python.trading_psychology_elements import (
    Element,
    ElementProfile,
    ElementSignal,
    PsychologyTelemetry,
    score_elements,
)
from dynamic_ai.agents import ElementAgent, ElementAgentResult
from dynamic_agents.elements import ElementAgent as ShimElementAgent


def _dt(minutes: int = 0) -> datetime:
    return datetime(2025, 4, 1, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def _payload() -> dict[str, object]:
    return {
        "contributions": [
            {"element": "fire", "score": 7.2, "weight": 2.0, "source": "desk-a", "timestamp": _dt()},
            {"element": Element.EARTH, "score": 6.5, "weight": 1.0, "source": "desk-b", "timestamp": _dt(5)},
            {"element": "light", "score": 4.0, "weight": 0.5, "timestamp": _dt(7)},
            {"element": "fire", "score": 8.0, "weight": 1.5, "source": "desk-c", "timestamp": _dt(8)},
        ],
        "focus": "earth",
    }


def test_element_agent_generates_snapshot() -> None:
    agent = ElementAgent()

    result = agent.run(_payload())
    assert isinstance(result, ElementAgentResult)

    snapshot = result.snapshot
    assert snapshot.total_samples == 4
    assert snapshot.dominant_element == "fire"
    assert snapshot.dominant_level == "critical"
    assert snapshot.readiness_index == pytest.approx(5.25, rel=1e-3)
    assert snapshot.caution_index == pytest.approx(7.5428, rel=1e-3)
    assert snapshot.recovery_index == pytest.approx(0.0)

    focus_summary = result.focus
    assert focus_summary is not None
    assert focus_summary.name == "earth"
    assert focus_summary.sample_count == 1
    assert focus_summary.average_score == pytest.approx(6.5, rel=1e-3)

    assert result.highlights
    assert any("Fire" in entry for entry in result.highlights)
    assert result.recommendations
    assert any("caution" in rec.lower() for rec in result.recommendations)

    expected_confidence = max(0.0, min(1.0, (snapshot.balance_index + 10.0) / 20.0))
    assert result.confidence == pytest.approx(expected_confidence, rel=1e-6)

    payload_dict = result.to_dict()
    assert payload_dict["snapshot"]["total_samples"] == 4
    assert payload_dict["focus"]["element"] == "earth"
    assert payload_dict["recommendations"]


def test_element_agent_shim_matches_direct() -> None:
    direct = ElementAgent()
    shim = ShimElementAgent()

    payload = _payload()
    direct_result = direct.run(payload)
    shim_result = shim.run(payload)

    assert direct_result.snapshot.dominant_element == shim_result.snapshot.dominant_element
    assert direct_result.to_dict()["snapshot"]["balance_index"] == pytest.approx(
        shim_result.to_dict()["snapshot"]["balance_index"],
        rel=1e-6,
    )


def test_element_agent_accepts_element_profile() -> None:
    agent = ElementAgent()

    signals = (
        ElementSignal(
            element=Element.FIRE,
            score=7.4,
            level="critical",
            reasons=("Loss streak detected.",),
            recommendations=("Trigger cooldown protocol.",),
        ),
        ElementSignal(
            element=Element.WATER,
            score=5.6,
            level="elevated",
            reasons=("Stress index rising.",),
            recommendations=("Schedule breathwork reset.",),
        ),
        ElementSignal(
            element=Element.WIND,
            score=4.8,
            level="elevated",
            reasons=("Choppy conditions detected.",),
            recommendations=("Shift to scouting mode.",),
        ),
        ElementSignal(
            element=Element.EARTH,
            score=6.2,
            level="building",
            reasons=("Discipline anchored.",),
            recommendations=("Reinforce routines.",),
        ),
        ElementSignal(
            element=Element.LIGHTNING,
            score=3.7,
            level="stable",
            reasons=("Volatility moderate.",),
            recommendations=("Maintain alert state.",),
        ),
        ElementSignal(
            element=Element.LIGHT,
            score=6.8,
            level="peak",
            reasons=("Clarity rising.",),
            recommendations=("Document winning setups.",),
        ),
        ElementSignal(
            element=Element.DARKNESS,
            score=2.4,
            level="recovering",
            reasons=("Fatigue elevated.",),
            recommendations=("Schedule rest block.",),
        ),
    )

    profile = ElementProfile(signals=signals)

    timestamp = _dt(15)
    result = agent.run(
        {
            "profile": profile,
            "focus": "darkness",
            "source": "psychology-engine",
            "timestamp": timestamp,
            "weight": 1.5,
            "metadata": {"capture": "profile"},
        }
    )

    snapshot = result.snapshot
    assert snapshot.total_samples == len(signals)
    assert snapshot.dominant_element == "fire"

    focus = result.focus
    assert focus is not None
    assert focus.name == "darkness"
    assert focus.sample_count == 1

    fire_entries = tuple(agent.algo.contributions(Element.FIRE))
    assert fire_entries[-1].weight == pytest.approx(1.5)
    assert fire_entries[-1].source == "psychology-engine"
    assert fire_entries[-1].timestamp == timestamp
    assert fire_entries[-1].metadata is not None
    assert fire_entries[-1].metadata.get("capture") == "profile"
    assert "reasons" in fire_entries[-1].metadata
    assert "recommendations" in fire_entries[-1].metadata

    darkness_entries = tuple(agent.algo.contributions(Element.DARKNESS))
    assert darkness_entries[-1].metadata is not None
    assert darkness_entries[-1].metadata.get("level") == "recovering"


def test_element_agent_scores_telemetry_payload() -> None:
    agent = ElementAgent()

    telemetry_mapping = {
        "trades_planned": 1,
        "trades_executed": 4,
        "drawdown_pct": 8.0,
        "account_balance_delta_pct": -4.0,
        "stress_index": 0.85,
        "emotional_volatility": 0.75,
        "consecutive_losses": 3,
        "focus_index": 0.35,
        "market_volatility": 0.82,
        "news_shock": True,
        "fatigue_index": 0.72,
        "discipline_index": 0.25,
        "conviction_index": 0.32,
    }

    expected_profile = score_elements(PsychologyTelemetry(**telemetry_mapping))

    result = agent.run({"telemetry": telemetry_mapping, "focus": "wind"})

    snapshot = result.snapshot
    assert snapshot.total_samples == len(Element)
    assert snapshot.dominant_element == expected_profile.dominant.element.value

    focus = result.focus
    assert focus is not None
    assert focus.name == "wind"
    assert focus.sample_count == 1

    wind_entries = tuple(agent.algo.contributions(Element.WIND))
    assert wind_entries
    assert wind_entries[-1].metadata is not None
    assert wind_entries[-1].metadata.get("reasons")
