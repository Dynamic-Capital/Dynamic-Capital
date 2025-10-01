from datetime import datetime, timezone

from dynamic_agents.wave import WaveAgent as ShimWaveAgent
from dynamic.intelligence.ai_apps.agents import WaveAgent, WaveAgentResult
from dynamic_wave import WaveformKind


def test_wave_agent_shim_exposes_core_persona() -> None:
    assert ShimWaveAgent is WaveAgent


def test_wave_agent_generates_snapshot_and_recommendations() -> None:
    agent = WaveAgent()
    timestamp = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)

    result = agent.run(
        {
            "mediums": [
                {
                    "name": "oceanic",
                    "propagation_speed": 340.0,
                    "attenuation": 0.05,
                    "dispersion": 0.01,
                }
            ],
            "sources": [
                {
                    "name": "Beacon",
                    "kind": WaveformKind.SINE,
                    "frequency_hz": 20.0,
                    "amplitude": 12.0,
                    "coherence": 0.9,
                },
                {
                    "name": "Pulse",
                    "kind": "square",
                    "frequency_hz": 10.0,
                    "amplitude": 8.0,
                    "phase": 0.3,
                    "position": (1.5, 0.0, 0.0),
                    "coherence": 0.7,
                },
            ],
            "listeners": [
                {
                    "name": "Array-N",
                    "position": (1.0, 0.0, 0.0),
                    "sensitivity": 1.3,
                    "bandwidth_hz": 60.0,
                    "gain": 1.1,
                    "noise_floor": 0.02,
                },
                {
                    "name": "Array-S",
                    "position": (-1.0, 0.0, 0.0),
                    "sensitivity": 0.9,
                    "bandwidth_hz": 45.0,
                    "gain": 1.0,
                    "noise_floor": 0.02,
                },
            ],
            "timestamp": timestamp,
            "coherence_target": 0.75,
            "safe_intensity": 0.05,
        }
    )

    assert isinstance(result, WaveAgentResult)
    assert result.medium == "oceanic"
    assert result.snapshot.dominant_frequency > 0.0
    assert result.snapshot.aggregate_energy > 0.0
    assert result.recommendations
    assert all(isinstance(rec, str) and rec for rec in result.recommendations)

    payload = result.to_dict()
    assert payload["medium"] == "oceanic"
    assert payload["snapshot"]["listener_intensity"]
    assert payload["snapshot"]["alerts"]
