from __future__ import annotations

import pytest

from dynamic_consciousness import (
    ConsciousnessContext,
    ConsciousnessSignal,
    DynamicConsciousness,
)


def test_consciousness_signal_normalisation() -> None:
    signal = ConsciousnessSignal(
        modality="  Interoception ",
        observation="   Elevated heart rate before open   ",
        salience=1.5,
        novelty=-0.2,
        emotional_tone=1.4,
        clarity=-0.6,
        stability=2.0,
        weight=-3.0,
        tags=["  Stress  ", "stress", "Physiology"],
        metadata={"note": "track"},
    )

    assert signal.modality == "interoception"
    assert signal.observation == "Elevated heart rate before open"
    assert signal.salience == 1.0
    assert signal.novelty == 0.0
    assert signal.emotional_tone == 1.0
    assert signal.clarity == 0.0
    assert signal.stability == 1.0
    assert signal.weight == 0.0
    assert signal.tags == ("stress", "physiology")
    assert signal.metadata == {"note": "track"}


def test_dynamic_consciousness_build_state() -> None:
    consciousness = DynamicConsciousness(history=6)
    consciousness.extend(
        [
            {
                "modality": "Interoception",
                "observation": "Noted calmer breathing after ritual.",
                "salience": 0.65,
                "novelty": 0.3,
                "emotional_tone": 0.55,
                "clarity": 0.6,
                "stability": 0.58,
                "weight": 1.1,
            },
            {
                "modality": "context",
                "observation": "Desk clutter triggering micro stressors.",
                "salience": 0.75,
                "novelty": 0.52,
                "emotional_tone": 0.32,
                "clarity": 0.48,
                "stability": 0.4,
                "weight": 1.3,
            },
            {
                "modality": "strategic",
                "observation": "Fresh catalyst aligning with mid-term thesis.",
                "salience": 0.82,
                "novelty": 0.74,
                "emotional_tone": 0.66,
                "clarity": 0.7,
                "stability": 0.62,
                "weight": 0.9,
            },
        ]
    )

    context = ConsciousnessContext(
        mission="Compound deliberate reps",
        time_horizon="90-day sprint",
        cognitive_load=0.72,
        emotional_regulation=0.42,
        threat_level=0.58,
        opportunity_level=0.64,
        support_network=0.55,
        environmental_complexity=0.62,
        stabilising_rituals=("Pre-open grounding breath",),
        future_snapshot="Operating from composed conviction",
    )

    state = consciousness.build_state(context)

    assert 0.0 <= state.awareness_index <= 1.0
    assert 0.0 <= state.readiness_index <= 1.0
    assert 0.0 <= state.stability_index <= 1.0
    assert state.modal_dominance[0] in {"interoception", "context", "strategic"}
    assert any("strategic" in highlight for highlight in state.critical_signals)
    assert any("grounding loop" in focus for focus in state.recommended_focus)
    assert any("Pre-open grounding breath" in ritual for ritual in state.stabilisation_rituals)
    assert "Compound deliberate reps" in state.narrative_summary
    assert "Operating from composed conviction" in state.narrative_summary


def test_dynamic_consciousness_requires_signals() -> None:
    context = ConsciousnessContext(
        mission="Hold composure",
        time_horizon="weekly",
        cognitive_load=0.4,
        emotional_regulation=0.7,
        threat_level=0.2,
        opportunity_level=0.4,
        support_network=0.5,
        environmental_complexity=0.3,
    )

    consciousness = DynamicConsciousness()

    with pytest.raises(RuntimeError):
        consciousness.build_state(context)


def test_dynamic_consciousness_requires_weight() -> None:
    context = ConsciousnessContext(
        mission="Stay present",
        time_horizon="daily",
        cognitive_load=0.3,
        emotional_regulation=0.6,
        threat_level=0.2,
        opportunity_level=0.4,
        support_network=0.5,
        environmental_complexity=0.3,
    )

    consciousness = DynamicConsciousness()
    consciousness.capture(
        ConsciousnessSignal(
            modality="context",
            observation="Neutral observation",
            weight=0.0,
        )
    )

    with pytest.raises(RuntimeError):
        consciousness.build_state(context)
