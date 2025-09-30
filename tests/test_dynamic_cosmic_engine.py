from datetime import datetime, timezone

import pytest

from dynamic_cosmic import (
    CosmicBridge,
    CosmicCoordinate,
    CosmicExpansionModel,
    CosmicPhenomenon,
    CosmicSignal,
    CosmicTimelineEvent,
    DynamicCosmic,
)


def _phenomenon(identifier: str, magnitude: float, volatility: float) -> CosmicPhenomenon:
    return CosmicPhenomenon(
        identifier=identifier,
        location=CosmicCoordinate(0.0, 0.0, magnitude - 5.0),
        magnitude=magnitude,
        volatility=volatility,
        signals=(
            CosmicSignal(
                identifier=f"{identifier}-beam",
                wavelength_nm=520.0 + magnitude,
                amplitude=3.2 + magnitude * 0.2,
                coherence=0.7,
                origin="Observatory",
            ),
        ),
        tags=("cosmic", identifier),
        metadata={"tier": magnitude},
    )


def test_cosmic_expansion_model_derivations() -> None:
    model = CosmicExpansionModel(
        cosmological_constant=0.72,
        equation_of_state=-1.0,
        matter_density=0.28,
        hubble_constant=70.0,
    )

    telemetry = model.telemetry(network_density=1.5)

    assert pytest.approx(telemetry["energy_density"], rel=1e-6) == 1.0
    assert pytest.approx(telemetry["dark_energy_pressure"], rel=1e-6) == -0.72
    assert telemetry["friedmann_acceleration"] > 0.0
    assert 0.75 < telemetry["stability_modifier"] < 1.5
    assert telemetry["continuity_residual"] != 0.0


def test_dynamic_cosmic_resilience_modulated_by_expansion_profile() -> None:
    base_model = CosmicExpansionModel(
        cosmological_constant=0.6,
        equation_of_state=-0.9,
        matter_density=0.35,
        hubble_constant=62.0,
    )
    tuned_model = CosmicExpansionModel(
        cosmological_constant=1.05,
        equation_of_state=-1.15,
        matter_density=0.25,
        hubble_constant=78.0,
    )

    phenomena = [
        _phenomenon("aurora-core", 7.2, 0.24),
        _phenomenon("quantum-halo", 6.8, 0.31),
        _phenomenon("nebula-resonance", 6.5, 0.29),
    ]
    bridges = [
        CosmicBridge(
            source="aurora-core",
            target="quantum-halo",
            stability=0.74,
            flux=4.4,
            route_length=1.6,
        ),
        CosmicBridge(
            source="quantum-halo",
            target="nebula-resonance",
            stability=0.69,
            flux=4.1,
            route_length=2.1,
        ),
    ]

    base_engine = DynamicCosmic(phenomena=phenomena, bridges=bridges, expansion_model=base_model)
    tuned_engine = DynamicCosmic(phenomena=phenomena, bridges=bridges, expansion_model=tuned_model)

    base_resilience = base_engine.evaluate_resilience()
    tuned_resilience = tuned_engine.evaluate_resilience()

    assert base_resilience != pytest.approx(tuned_resilience)

    base_snapshot = base_engine.snapshot()
    tuned_snapshot = tuned_engine.snapshot()

    assert pytest.approx(base_snapshot["resilience"]) == base_resilience
    assert pytest.approx(tuned_snapshot["resilience"]) == tuned_resilience
    assert base_snapshot["expansion"]["stability_modifier"] != pytest.approx(
        tuned_snapshot["expansion"]["stability_modifier"]
    )
    assert base_snapshot["expansion"]["friedmann_acceleration"] > 0.0
    assert tuned_snapshot["expansion"]["friedmann_acceleration"] > 0.0

    base_engine.record_event(
        CosmicTimelineEvent(
            description="Calibration sweep",
            impact=0.42,
            timestamp=datetime(2024, 1, 12, 15, 30, tzinfo=timezone.utc),
        )
    )
    tuned_engine.record_event(
        CosmicTimelineEvent(
            description="Stability pulse",
            impact=0.37,
            timestamp=datetime(2024, 2, 4, 10, 0, tzinfo=timezone.utc),
        )
    )

    assert base_engine.history_size == 1
    assert tuned_engine.history_size == 1


def test_configure_expansion_accepts_reset() -> None:
    engine = DynamicCosmic()
    custom = engine.configure_expansion({"cosmological_constant": 0.9, "matter_density": 0.2})
    assert isinstance(custom, CosmicExpansionModel)
    assert custom.cosmological_constant == 0.9

    reset_model = engine.configure_expansion(None)
    assert isinstance(reset_model, CosmicExpansionModel)
    assert reset_model.cosmological_constant == pytest.approx(0.7)
