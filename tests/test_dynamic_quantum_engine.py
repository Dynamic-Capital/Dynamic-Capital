from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_quantum import (
    DynamicQuantumEngine,
    QuantumEnvironment,
    QuantumPulse,
)


def test_quantum_pulse_normalisation() -> None:
    timestamp = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
    pulse = QuantumPulse(
        system="  Core-Lattice  ",
        coherence=0.92,
        entanglement=0.84,
        temperature=42.0,
        flux=1.2,
        phase_variance=0.33,
        timestamp=timestamp,
        annotations=("  alpha  ", ""),
        metadata={"origin": "lab"},
    )

    assert pulse.system == "Core-Lattice"
    assert pulse.flux == pytest.approx(1.0)
    assert pulse.annotations == ("alpha",)
    assert pulse.metadata == {"origin": "lab"}
    assert 0.6 < pulse.stability_index < 1.0
    assert not pulse.requires_cooling


def test_quantum_engine_synthesize_frame_with_environment() -> None:
    engine = DynamicQuantumEngine(window=5, equilibrium_target=0.7)
    engine.register_pulse(
        QuantumPulse(
            system="alpha",
            coherence=0.5,
            entanglement=0.4,
            temperature=38.0,
            flux=0.2,
            phase_variance=0.3,
        )
    )
    engine.register_pulse(
        QuantumPulse(
            system="beta",
            coherence=0.7,
            entanglement=0.6,
            temperature=41.0,
            flux=-0.3,
            phase_variance=0.2,
        )
    )
    engine.register_pulse(
        QuantumPulse(
            system="gamma",
            coherence=0.65,
            entanglement=0.55,
            temperature=36.0,
            flux=0.1,
            phase_variance=0.25,
        )
    )

    environment = QuantumEnvironment(
        vacuum_pressure=0.45,
        background_noise=0.7,
        gravity_gradient=0.4,
        measurement_rate=0.75,
        thermal_load=0.65,
    )

    frame = engine.synthesize_frame(environment=environment)

    assert pytest.approx(frame.mean_coherence, rel=1e-6) == 0.6166666667
    assert pytest.approx(frame.mean_entanglement, rel=1e-6) == 0.5166666667
    assert pytest.approx(frame.mean_flux, abs=1e-9) == 0.0
    assert pytest.approx(frame.mean_phase_variance, rel=1e-6) == 0.25
    assert frame.anomalies == ("coherence-trend-shift", "equilibrium-shortfall")
    assert frame.stability_outlook < 0.7
    assert frame.recommended_actions == (
        "deploy adaptive damping kernels",
        "boost equilibrium field strength",
        "deploy adaptive shielding",
        "slow measurement cadence",
        "increase vacuum integrity",
        "engage cryogenic buffer",
    )
    assert pytest.approx(frame.ewma_coherence, rel=1e-6) == 0.548
    assert pytest.approx(frame.ewma_entanglement, rel=1e-6) == 0.448
    assert pytest.approx(frame.ewma_flux, rel=1e-6) == 0.12125
    assert pytest.approx(frame.ewma_phase_variance, rel=1e-6) == 0.27975
    assert frame.equilibrium_gap > 0.1
    assert frame.drift_score > 0.12


def test_quantum_engine_estimate_decoherence_projection() -> None:
    engine = DynamicQuantumEngine(window=5)
    engine.register_pulse(
        QuantumPulse(
            system="omega",
            coherence=0.72,
            entanglement=0.66,
            temperature=44.0,
            flux=0.05,
            phase_variance=0.28,
        )
    )

    environment = QuantumEnvironment(
        vacuum_pressure=0.4,
        background_noise=0.8,
        gravity_gradient=0.6,
        measurement_rate=0.85,
        thermal_load=0.7,
    )

    decoherence = engine.estimate_decoherence(time_steps=3, environment=environment)

    assert 0.4 < decoherence < 0.5
