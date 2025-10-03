"""Behavioral coverage for the dynamic stem cell engine."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_stem_cell import DynamicStemCell, StemCellContext, StemCellSignal


@pytest.fixture()
def baseline_signal() -> StemCellSignal:
    return StemCellSignal(
        niche="Bone Marrow",
        lineage_hint="Mesenchymal",
        potency=0.8,
        plasticity=0.9,
        stress_resilience=0.7,
        metabolic_reserve=0.6,
        activation=0.65,
        signal_strength=0.75,
        weight=1.0,
        tags=("expansion",),
    )


def test_capture_accepts_mapping_payload(baseline_signal: StemCellSignal) -> None:
    engine = DynamicStemCell()
    engine.capture(baseline_signal)
    recorded = engine.capture(
        {
            "niche": "Bone Marrow",
            "lineage_hint": "Neural",
            "potency": 0.6,
            "plasticity": 0.55,
            "stress_resilience": 0.45,
            "metabolic_reserve": 0.5,
            "activation": 0.7,
            "signal_strength": 0.65,
            "weight": 2.0,
            "tags": [" focus "],
        }
    )

    assert isinstance(recorded, StemCellSignal)
    assert recorded.timestamp.tzinfo is timezone.utc
    assert recorded.tags == ("focus",)


def test_generate_profile_balanced_state(baseline_signal: StemCellSignal) -> None:
    engine = DynamicStemCell()
    engine.capture(baseline_signal)
    engine.capture(
        {
            "niche": "Bone Marrow",
            "lineage_hint": "Neural",
            "potency": 0.6,
            "plasticity": 0.55,
            "stress_resilience": 0.45,
            "metabolic_reserve": 0.5,
            "activation": 0.7,
            "signal_strength": 0.65,
            "weight": 2.0,
        }
    )

    context = StemCellContext(
        niche="Bone Marrow",
        culture_phase="Expansion",
        oxygen_level=0.5,
        nutrient_level=0.7,
        shear_stress=0.2,
        maintenance_bias=0.7,
        target_lineages=("Mesenchymal",),
        stimulatory_factors=("FGF2",),
    )

    profile = engine.generate_profile(context)

    assert profile.potency_score == pytest.approx(0.6821667, rel=1e-6)
    assert profile.stability_index == pytest.approx(0.5621667, rel=1e-6)
    assert profile.differentiation_readiness == pytest.approx(0.73, rel=1e-6)
    assert profile.lineage_bias == ("mesenchymal", "neural")
    assert profile.alert_flags == ()
    assert profile.recommended_interventions == (
        "prepare lineage-specific induction for mesenchymal",
    )
    assert profile.monitoring_focus == ("mesenchymal", "neural", "undirected reserve")
    assert (
        profile.metabolic_notes
        == "Metabolic state requires routine observation."
    )
    assert "maintenance phase" in profile.narrative
    assert "no critical alerts" in profile.narrative


def test_generate_profile_surface_alerts_and_interventions() -> None:
    engine = DynamicStemCell()
    engine.capture(
        StemCellSignal(
            niche="Bioreactor",
            lineage_hint="Hematopoietic",
            potency=0.2,
            plasticity=0.3,
            stress_resilience=0.25,
            metabolic_reserve=0.2,
            activation=0.6,
            signal_strength=0.4,
            weight=1.0,
        )
    )

    context = StemCellContext(
        niche="Bioreactor",
        culture_phase="Differentiation",
        oxygen_level=0.25,
        nutrient_level=0.65,
        shear_stress=0.8,
        maintenance_bias=0.3,
        target_lineages=("Hematopoietic",),
        inhibitory_signals=("TNF-alpha",),
    )

    profile = engine.generate_profile(context)

    assert profile.alert_flags == (
        "potency erosion",
        "culture instability",
        "high mechanical stress",
        "inhibitory pressure detected",
    )
    assert profile.recommended_interventions == (
        "refresh pluripotency factors",
        "increase microenvironment support",
        "reduce shear via medium exchange tuning",
        "adjust oxygenation profile",
        "neutralise inhibitory signals",
    )
    assert profile.monitoring_focus == ("hematopoietic", "undirected reserve")
    assert (
        profile.metabolic_notes
        == "Energy reserves lag despite nutrient presence; review mitochondrial support."
    )
    assert "differentiation phase" in profile.narrative


def test_reset_and_empty_checks(baseline_signal: StemCellSignal) -> None:
    engine = DynamicStemCell()
    engine.capture(baseline_signal)
    engine.reset()

    with pytest.raises(RuntimeError):
        engine.generate_profile(
            StemCellContext(
                niche="Bone Marrow",
                culture_phase="Expansion",
                oxygen_level=0.5,
                nutrient_level=0.5,
                shear_stress=0.2,
                maintenance_bias=0.6,
            )
        )


def test_signal_requires_non_empty_text() -> None:
    with pytest.raises(ValueError):
        StemCellSignal(niche="   ", lineage_hint="")


def test_timestamp_normalisation() -> None:
    naive = datetime(2024, 1, 1, 12, 0, 0)
    signal = StemCellSignal(niche="Bone Marrow", lineage_hint="", timestamp=naive)
    assert signal.timestamp.tzinfo is timezone.utc

