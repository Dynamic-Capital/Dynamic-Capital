from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def _quantum_config() -> dict[str, object]:
    return {
        "reference_time": "2024-02-01T12:00:00+00:00",
        "domains": {
            "IonTrap": {
                "environment": {
                    "vacuum_pressure": 0.55,
                    "background_noise": 0.45,
                    "gravity_gradient": 0.4,
                    "measurement_rate": 0.7,
                    "thermal_load": 0.58,
                },
                "pulses": [
                    {
                        "system": "ion-alpha",
                        "coherence": 0.9,
                        "entanglement": 0.84,
                        "temperature": 52.0,
                        "flux": 0.12,
                        "phase_variance": 0.3,
                        "timestamp": "2024-02-01T02:00:00+00:00",
                    },
                    {
                        "system": "ion-beta",
                        "coherence": 0.88,
                        "entanglement": 0.82,
                        "temperature": 46.0,
                        "flux": -0.06,
                        "phase_variance": 0.28,
                        "timestamp": "2024-02-01T03:30:00+00:00",
                    },
                ],
            },
            "Photonic": {
                "environment": {
                    "vacuum_pressure": 0.48,
                    "background_noise": 0.65,
                    "gravity_gradient": 0.32,
                    "measurement_rate": 0.6,
                    "thermal_load": 0.5,
                },
                "pulses": [
                    {
                        "system": "photon-alpha",
                        "coherence": 0.85,
                        "entanglement": 0.78,
                        "temperature": 45.0,
                        "flux": 0.04,
                        "phase_variance": 0.34,
                        "timestamp": "2024-01-31T18:30:00+00:00",
                    }
                ],
            },
        },
    }


def test_quantum_cli_outputs_summary(tmp_path: Path) -> None:
    config_path = tmp_path / "quantum.json"
    config_path.write_text(json.dumps(_quantum_config()), encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            "scripts/run_quantum_benchmark.py",
            "--config",
            str(config_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    assert "Quantum Resonance Benchmark Results" in result.stdout
    assert "IonTrap" in result.stdout
    assert "Photonic" in result.stdout
    assert "Comprehensive Grade" in result.stdout
    assert "Recommended actions" in result.stdout
