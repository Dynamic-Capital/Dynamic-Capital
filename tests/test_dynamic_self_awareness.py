from __future__ import annotations

import pytest

from dynamic_self_awareness import (
    AwarenessContext,
    DynamicSelfAwareness,
    SelfAwarenessSignal,
)


def test_self_awareness_signal_normalisation() -> None:
    signal = SelfAwarenessSignal(
        channel="  Thought  ",
        observation="  Feeling anxious about pace  ",
        clarity=1.4,
        alignment=-0.2,
        agitation=1.3,
        action_bias=-0.5,
        weight=-3,
    )

    assert signal.channel == "thought"
    assert signal.observation == "Feeling anxious about pace"
    assert 0.0 <= signal.clarity <= 1.0
    assert 0.0 <= signal.alignment <= 1.0
    assert 0.0 <= signal.agitation <= 1.0
    assert 0.0 <= signal.action_bias <= 1.0
    assert signal.weight == 0.0


def test_generate_report_distinguishes_from_overthinking() -> None:
    engine = DynamicSelfAwareness(history=5)
    engine.extend(
        [
            {
                "channel": "emotion",
                "observation": "Pressure in chest before presentation",
                "clarity": 0.7,
                "alignment": 0.4,
                "agitation": 0.6,
                "action_bias": 0.3,
            },
            {
                "channel": "thought",
                "observation": "Worried about missing personal standard",
                "clarity": 0.6,
                "alignment": 0.3,
                "agitation": 0.5,
                "action_bias": 0.2,
            },
            {
                "channel": "behavior",
                "observation": "Not preparing outline despite insight",
                "clarity": 0.5,
                "alignment": 0.2,
                "agitation": 0.4,
                "action_bias": 0.2,
            },
        ]
    )

    context = AwarenessContext(
        situation="Leading client briefing",
        emotion_label="anxious",
        cognitive_noise=0.7,
        bodily_tension=0.65,
        readiness_for_action=0.3,
        value_alignment_target=0.8,
        personal_standards=("Deliver calm clarity", "Lead with empathy"),
        support_level=0.6,
    )

    report = engine.generate_report(context)

    assert 0.0 <= report.clarity_index <= 1.0
    assert 0.0 <= report.emotional_equilibrium <= 1.0
    assert 0.0 <= report.alignment_score <= 1.0
    assert 0.0 <= report.overthinking_risk <= 1.0
    assert report.dominant_channels[0] in {"emotion", "thought", "behavior"}
    assert any("Translate awareness" in action or "experiment" in action for action in report.productive_actions)
    assert any("looping" in prompt or "analysis" in prompt for prompt in report.reflection_prompts)
    assert "Self-awareness" in report.narrative or "overthinking" in report.narrative


def test_generate_report_requires_signals() -> None:
    engine = DynamicSelfAwareness()
    context = AwarenessContext(
        situation="Preparing portfolio review",
        emotion_label="steady",
        cognitive_noise=0.2,
        bodily_tension=0.2,
        readiness_for_action=0.7,
        value_alignment_target=0.6,
    )

    with pytest.raises(RuntimeError):
        engine.generate_report(context)
