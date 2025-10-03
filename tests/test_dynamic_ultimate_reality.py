from __future__ import annotations

import importlib

import pytest

from dynamic_ultimate_reality import (
    DynamicUltimateReality,
    NonDualContext,
    UltimateRealitySignal,
)


def test_ultimate_reality_signal_normalisation() -> None:
    signal = UltimateRealitySignal(
        dimension="  Luminosity  ",
        insight="  Spaciousness recognised in breath  ",
        luminosity=1.4,
        emptiness=-0.2,
        compassion=1.3,
        embodiment=-0.4,
        coherence=2.0,
        weight=-5.0,
        tags=("  Clarity  ", "clarity", "Embodied"),
        metadata={"note": "observe"},
    )

    assert signal.dimension == "luminosity"
    assert signal.insight == "Spaciousness recognised in breath"
    assert signal.luminosity == 1.0
    assert signal.emptiness == 0.0
    assert signal.compassion == 1.0
    assert signal.embodiment == 0.0
    assert signal.coherence == 1.0
    assert signal.weight == 0.0
    assert signal.tags == ("clarity", "embodied")
    assert signal.metadata == {"note": "observe"}


def test_dynamic_ultimate_reality_realise() -> None:
    engine = DynamicUltimateReality(history=5)
    engine.extend(
        [
            {
                "dimension": "Luminosity",
                "insight": "Transparent awareness saturates sensory field.",
                "luminosity": 0.82,
                "emptiness": 0.74,
                "compassion": 0.68,
                "embodiment": 0.56,
                "coherence": 0.6,
                "weight": 1.2,
            },
            {
                "dimension": "compassion",
                "insight": "Soft hearted response to partner tension.",
                "luminosity": 0.64,
                "emptiness": 0.58,
                "compassion": 0.86,
                "embodiment": 0.66,
                "coherence": 0.62,
                "weight": 1.0,
            },
            {
                "dimension": "integration",
                "insight": "Witnessing dissolves charge from legacy pattern.",
                "luminosity": 0.58,
                "emptiness": 0.65,
                "compassion": 0.54,
                "embodiment": 0.72,
                "coherence": 0.68,
                "weight": 0.8,
            },
        ]
    )

    context = NonDualContext(
        intention="Live as unbound clarity",
        integration_capacity=0.62,
        nervous_system_regulation=0.48,
        community_support=0.7,
        stewardship_commitment=0.58,
        environmental_noise=0.52,
        practice_cadence=0.4,
        core_practices=("Morning sit", "Evening gratitude"),
        lineage="Mahamudra",
        guidance="Remember breath in the heart.",
    )

    state = engine.realise(context)

    assert 0.0 <= state.nondual_index <= 1.0
    assert 0.0 <= state.integration_index <= 1.0
    assert 0.0 <= state.groundedness_index <= 1.0
    assert state.dominant_dimensions[0] in {"luminosity", "compassion", "integration"}
    assert any("Stabilise nervous system" in principle for principle in state.guiding_principles)
    assert any("Morning sit" in action for action in state.integration_actions)
    assert any("Only awareness aware" in mantra for mantra in state.attunement_mantras)
    assert "Live as unbound clarity" in state.narrative
    assert "Mahamudra" in state.narrative


def test_dynamic_ultimate_reality_requires_signals() -> None:
    context = NonDualContext(
        intention="Abide as presence",
        integration_capacity=0.5,
        nervous_system_regulation=0.5,
        community_support=0.5,
        stewardship_commitment=0.5,
        environmental_noise=0.5,
        practice_cadence=0.5,
    )

    engine = DynamicUltimateReality()

    with pytest.raises(RuntimeError):
        engine.realise(context)


def test_dynamic_ultimate_reality_requires_weight() -> None:
    context = NonDualContext(
        intention="Stay with awareness",
        integration_capacity=0.6,
        nervous_system_regulation=0.6,
        community_support=0.6,
        stewardship_commitment=0.6,
        environmental_noise=0.4,
        practice_cadence=0.6,
    )

    engine = DynamicUltimateReality()
    engine.capture(
        UltimateRealitySignal(
            dimension="luminosity",
            insight="Even presence",
            weight=0.0,
        )
    )

    with pytest.raises(RuntimeError):
        engine.realise(context)


def test_platform_engines_expose_ultimate_reality_symbols() -> None:
    engines = importlib.import_module("dynamic.platform.engines")
    module = importlib.import_module("dynamic_ultimate_reality")

    assert engines.DynamicUltimateReality is module.DynamicUltimateReality
    assert engines.NonDualContext is module.NonDualContext
    assert engines.UltimateRealitySignal is module.UltimateRealitySignal
    assert engines.UltimateRealityState is module.UltimateRealityState
