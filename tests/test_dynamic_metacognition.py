from __future__ import annotations

import pytest

from dynamic_metacognition import (
    DynamicMetacognition,
    MetaSignal,
    ReflectionContext,
)


def test_meta_signal_normalisation() -> None:
    naive_signal = MetaSignal(
        domain="  Focus  ",
        insight="   Need to slow down reviews   ",
        impact=1.4,
        stability=-0.2,
        friction=2.0,
        weight=-3.0,
    )

    assert naive_signal.domain == "focus"
    assert naive_signal.insight == "Need to slow down reviews"
    assert 0.0 <= naive_signal.impact <= 1.0
    assert 0.0 <= naive_signal.stability <= 1.0
    assert 0.0 <= naive_signal.friction <= 1.0
    assert naive_signal.weight == 0.0


def test_generate_report_recommends_supportive_actions() -> None:
    engine = DynamicMetacognition(history=5)
    engine.extend(
        [
            {"domain": "focus", "insight": "Skipped debrief", "impact": 0.3, "friction": 0.6},
            {"domain": "process", "insight": "Documented experiment", "impact": 0.7, "stability": 0.8},
            {"domain": "focus", "insight": "Rushing decisions", "impact": 0.2, "friction": 0.7, "weight": 1.5},
        ]
    )

    context = ReflectionContext(
        learning_goal="Design calmer execution routine",
        time_available=0.4,
        cognitive_load=0.75,
        emotion_state="Stressed",
        support_available=0.35,
        recent_breakthroughs=0,
        stuck_points=2,
        sleep_quality=0.55,
        energy_reserve=0.45,
    )

    report = engine.generate_report(context)

    assert 0.0 <= report.awareness_level <= 1.0
    assert 0.0 <= report.learning_readiness <= 1.0
    assert 0.0 <= report.stress_index <= 1.0
    assert "focus" in report.dominant_domains
    assert any("release ritual" in prompt for prompt in report.reflection_prompts)
    assert any("micro-experiment" in step for step in report.recommended_experiments)
    assert any("mentor" in action or "peer" in action for action in report.support_actions)
    assert "Goal: Design calmer execution routine." in report.narrative


def test_generate_report_requires_signals() -> None:
    engine = DynamicMetacognition()
    context = ReflectionContext(
        learning_goal="Sharpen reasoning loops",
        time_available=0.6,
        cognitive_load=0.3,
        emotion_state="steady",
        support_available=0.8,
    )

    with pytest.raises(RuntimeError):
        engine.generate_report(context)

