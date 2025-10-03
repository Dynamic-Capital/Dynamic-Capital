from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_benchmark.quantum import load_quantum_benchmark


def _build_payload() -> dict[str, object]:
    return {
        "reference_time": "2024-02-01T00:00:00+00:00",
        "domains": {
            "IonTrap": {
                "environment": {
                    "vacuum_pressure": 0.5,
                    "background_noise": 0.62,
                    "gravity_gradient": 0.34,
                    "measurement_rate": 0.7,
                    "thermal_load": 0.6,
                },
                "pulses": [
                    {
                        "system": "ion-alpha",
                        "coherence": 0.82,
                        "entanglement": 0.74,
                        "temperature": 45.0,
                        "flux": 0.08,
                        "phase_variance": 0.28,
                        "timestamp": "2024-01-31T18:00:00+00:00",
                    },
                    {
                        "system": "ion-beta",
                        "coherence": 0.78,
                        "entanglement": 0.7,
                        "temperature": 55.0,
                        "flux": -0.04,
                        "phase_variance": 0.32,
                        "timestamp": "2024-01-31T20:00:00+00:00",
                    },
                ],
            },
            "Photonic": {
                "environment": {
                    "vacuum_pressure": 0.6,
                    "background_noise": 0.4,
                    "gravity_gradient": 0.3,
                    "measurement_rate": 0.55,
                    "thermal_load": 0.48,
                },
                "pulses": [
                    {
                        "system": "photon-alpha",
                        "coherence": 0.9,
                        "entanglement": 0.88,
                        "temperature": 42.0,
                        "flux": 0.02,
                        "phase_variance": 0.22,
                        "timestamp": "2024-01-31T21:00:00+00:00",
                    }
                ],
            },
        },
    }


def test_load_quantum_benchmark_derives_metrics() -> None:
    payload = _build_payload()
    reference_time = datetime(2024, 2, 1, 0, 0, tzinfo=timezone.utc)

    result = load_quantum_benchmark(payload, reference_time=reference_time)

    assert set(result) == {"IonTrap", "Photonic"}

    ion_metrics = result["IonTrap"].metrics
    assert pytest.approx(ion_metrics.coverage_ratio, rel=1e-6) == 0.8
    assert pytest.approx(ion_metrics.accuracy_ratio, rel=1e-6) == 0.72
    assert pytest.approx(ion_metrics.telemetry_staleness_hours, rel=1e-6) == 4.0
    assert ion_metrics.failed_health_checks >= 3

    ion_frame = result["IonTrap"].frame
    assert ion_frame.recommended_actions

    photonic_metrics = result["Photonic"].metrics
    assert photonic_metrics.failed_health_checks == 0
    assert photonic_metrics.telemetry_staleness_hours == pytest.approx(3.0)


def test_load_quantum_benchmark_requires_pulses() -> None:
    payload = {
        "domains": {
            "Empty": {
                "environment": {
                    "vacuum_pressure": 0.6,
                    "background_noise": 0.4,
                    "gravity_gradient": 0.3,
                    "measurement_rate": 0.5,
                    "thermal_load": 0.4,
                },
                "pulses": [],
            }
        }
    }

    with pytest.raises(ValueError):
        load_quantum_benchmark(payload)
