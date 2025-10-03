from __future__ import annotations

import importlib

import pytest

from dynamic_autonoetic import (
    AutonoeticConsciousness,
    AutonoeticContext,
    AutonoeticSignal,
)


def test_autonoetic_signal_normalisation() -> None:
    signal = AutonoeticSignal(
        domain="  Memory ",
        narrative="   Recalled last win   ",
        emotional_valence=1.3,
        temporal_distance=-0.2,
        agency=2.1,
        clarity=-0.5,
        weight=-4.2,
        tags=[" Focus ", "focus", "Archive"],
        metadata={"note": "ok"},
    )

    assert signal.domain == "memory"
    assert signal.narrative == "Recalled last win"
    assert signal.emotional_valence == 1.0
    assert signal.temporal_distance == 0.0
    assert signal.agency == 1.0
    assert signal.clarity == 0.0
    assert signal.weight == 0.0
    assert signal.tags == ("focus", "archive")
    assert signal.metadata == {"note": "ok"}


def test_autonoetic_state_generation() -> None:
    consciousness = AutonoeticConsciousness(history=10)
    consciousness.extend(
        [
            {
                "domain": "Memory",
                "narrative": "Replayed the disciplined exit from last week.",
                "emotional_valence": 0.7,
                "temporal_distance": 0.2,
                "agency": 0.65,
                "clarity": 0.75,
                "weight": 1.0,
            },
            {
                "domain": "drift",
                "narrative": "Noted moments of distraction post-lunch.",
                "emotional_valence": 0.35,
                "temporal_distance": 0.6,
                "agency": 0.4,
                "clarity": 0.45,
                "weight": 1.4,
            },
            {
                "domain": "vision",
                "narrative": "Connected current work to five-year thesis.",
                "emotional_valence": 0.82,
                "temporal_distance": 0.8,
                "agency": 0.72,
                "clarity": 0.68,
                "weight": 0.8,
            },
        ]
    )

    context = AutonoeticContext(
        identity_statement="I am a composed operator",
        regulation_capacity=0.55,
        stress_load=0.7,
        integration_practice=0.35,
        narrative_alignment=0.48,
        somatic_baseline=0.42,
        anchor_rituals=("Sunset debrief walk",),
        future_self_name="Tomorrow's me",
    )

    state = consciousness.build_state(context)

    assert 0.0 <= state.presence_score <= 1.0
    assert 0.0 <= state.narrative_coherence <= 1.0
    assert state.dominant_domains[0] in {"memory", "drift", "vision"}
    assert any("Tomorrow's me" in prompt for prompt in state.reflective_prompts)
    assert any("Sunset debrief walk" == step for step in state.integration_steps)
    assert "I am a composed operator" in state.narrative_summary


def test_autonoetic_state_requires_signals() -> None:
    consciousness = AutonoeticConsciousness()
    context = AutonoeticContext(
        identity_statement="I am deliberate",
        regulation_capacity=0.8,
        stress_load=0.1,
        integration_practice=0.9,
        narrative_alignment=0.85,
        somatic_baseline=0.7,
    )

    with pytest.raises(RuntimeError):
        consciousness.build_state(context)


def test_dynamic_namespace_re_exports_autonoetic_utilities() -> None:
    module = importlib.import_module("dynamic.autonoetic")

    for name in (
        "AutonoeticConsciousness",
        "AutonoeticContext",
        "AutonoeticSignal",
        "AutonoeticState",
    ):
        exported = getattr(module, name)
        original = getattr(importlib.import_module("dynamic_autonoetic"), name)
        assert exported is original
        # Ensure repeated lookups reuse cached attribute and do not raise.
        assert getattr(module, name) is exported

