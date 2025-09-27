"""Unit tests for the Dynamic Thinking engine."""

from __future__ import annotations

from datetime import datetime

import pytest

from dynamic_thinking import (
    DynamicThinkingEngine,
    ThinkingContext,
    ThinkingSignal,
)


def test_signal_normalisation_and_capture() -> None:
    engine = DynamicThinkingEngine(history=5)

    naive_timestamp = datetime(2024, 3, 8, 12, 0, 0)
    captured = engine.capture(
        {
            "theme": "  Market Expansion  ",
            "content": "  Investigate premium positioning  ",
            "confidence": 0.92,
            "novelty": 0.61,
            "risk": 0.27,
            "weight": 1.8,
            "timestamp": naive_timestamp,
            "tags": [" Growth ", "focus", "growth"],
            "metadata": {"source": "ops-review"},
        }
    )

    assert captured.theme == "market expansion"
    assert captured.content == "Investigate premium positioning"
    assert captured.confidence == pytest.approx(0.92)
    assert captured.novelty == pytest.approx(0.61)
    assert captured.risk == pytest.approx(0.27)
    assert captured.weight == pytest.approx(1.8)
    assert captured.timestamp.tzinfo is not None
    assert captured.tags == ("growth", "focus")
    assert captured.metadata == {"source": "ops-review"}


def test_build_frame_aggregates_weighted_signals() -> None:
    engine = DynamicThinkingEngine(history=10)
    engine.extend(
        [
            ThinkingSignal(
                theme="Market",
                content="Launch timing",
                confidence=0.9,
                novelty=0.8,
                risk=0.2,
                weight=3.0,
            ),
            ThinkingSignal(
                theme="market",
                content="Channel performance",
                confidence=0.6,
                novelty=0.4,
                risk=0.5,
                weight=1.0,
            ),
            ThinkingSignal(
                theme="People",
                content="Team readiness",
                confidence=0.3,
                novelty=0.2,
                risk=0.8,
                weight=2.0,
            ),
        ]
    )

    context = ThinkingContext(
        objective="Decide on Q4 launch strategy",
        decision_horizon="Quarter",
        risk_tolerance=0.5,
        time_pressure=0.8,
        data_completeness=0.3,
        constraints=("Budget cap",),
        principles=("Customer first",),
    )

    frame = engine.build_frame(context)

    assert frame.clarity_index == pytest.approx(0.43, abs=1e-3)
    assert frame.risk_pressure == pytest.approx(0.45, abs=1e-3)
    assert frame.idea_velocity == pytest.approx(0.592, abs=1e-3)
    assert frame.dominant_themes == ("market", "people")
    assert frame.bias_alerts == ()
    assert frame.recommended_models == (
        "OODA Loop",
        "First Principles Decomposition",
        "MECE Structuring",
    )
    assert "Objective: Decide on Q4 launch strategy." in frame.synthesis
    assert frame.action_steps == (
        "Run mental models: OODA Loop, First Principles Decomposition, MECE Structuring",
        "Re-check constraints: Budget cap",
        "Align with principles: Customer first",
    )

    frame_dict = frame.as_dict()
    assert frame_dict["dominant_themes"] == ["market", "people"]
    assert frame_dict["action_steps"][0].startswith("Run mental models: ")
