from datetime import datetime, timezone

from dynamic_wave import (
    DynamicWaveField,
    WaveListener,
    WaveMedium,
    WaveSource,
    WaveformKind,
)


def _build_wave_field() -> DynamicWaveField:
    field = DynamicWaveField()
    field.register_medium(
        WaveMedium(
            name="oceanic",
            propagation_speed=340.0,
            attenuation=0.05,
            dispersion=0.01,
        ),
        default=True,
    )
    field.upsert_source(
        WaveSource(
            name="Primary Beacon",
            kind=WaveformKind.SINE,
            frequency_hz=20.0,
            amplitude=12.0,
            coherence=0.9,
            position=(0.0, 0.0, 0.0),
        )
    )
    field.upsert_source(
        {
            "name": "Square Pulse",
            "kind": "square",
            "frequency_hz": 10.0,
            "amplitude": 8.0,
            "phase": 0.2,
            "position": (2.0, 0.0, 0.0),
            "coherence": 0.6,
        }
    )
    field.attach_listener(
        WaveListener(
            name="North Array",
            position=(1.0, 0.0, 0.0),
            sensitivity=1.2,
            bandwidth_hz=50.0,
            gain=1.1,
            noise_floor=0.02,
        )
    )
    field.attach_listener(
        {
            "name": "South Array",
            "position": (-1.0, 0.0, 0.0),
            "sensitivity": 0.9,
            "bandwidth_hz": 40.0,
            "gain": 1.0,
            "noise_floor": 0.02,
        }
    )
    return field


def test_dynamic_wave_measurement_tracks_alerts_and_history() -> None:
    field = _build_wave_field()
    timestamp = datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    snapshot = field.measure(timestamp=timestamp)

    assert snapshot.medium.name == "oceanic"
    assert set(snapshot.listener_intensity) == {"North Array", "South Array"}
    assert all(value >= 0.02 for value in snapshot.listener_intensity.values())
    assert snapshot.dominant_frequency > 0.0
    assert snapshot.aggregate_energy >= sum(value**2 for value in snapshot.listener_intensity.values())
    assert snapshot.alerts  # intensity should be high enough to trigger
    assert field.history[-1] is snapshot
    assert field.events[-1].description == snapshot.alerts[-1]


def test_wave_field_decay_and_recent_activity() -> None:
    field = _build_wave_field()
    field.decay_sources(0.5)
    reduced_amplitude = field.sources["Primary Beacon"].amplitude
    assert 0.0 < reduced_amplitude < 12.0

    field.decay_sources(1e-6)
    field.decay_sources(1e-6)
    assert "Primary Beacon" not in field.sources

    event = field.log_event("manual adjustment", intensity=0.7, listener="North Array")
    assert event.description == "manual adjustment"
    assert field.recent_activity(limit=1) == (event,)
