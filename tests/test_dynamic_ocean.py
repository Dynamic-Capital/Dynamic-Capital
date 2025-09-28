from datetime import datetime, timezone

import pytest

from dynamic_ocean import (
    DynamicOcean,
    OceanCurrent,
    OceanEventSeverity,
    OceanLayer,
    OceanSensor,
)


def _build_ocean() -> DynamicOcean:
    ocean = DynamicOcean()
    ocean.register_layer(
        OceanLayer(
            name="Epipelagic",
            depth_range=(0.0, 200.0),
            temperature_c=18.0,
            salinity_psu=35.0,
            oxygen_mg_l=6.5,
            turbidity_ntu=2.0,
        ),
        default=True,
    )
    ocean.register_layer(
        {
            "name": "Mesopelagic",
            "depth_range": (200.0, 1000.0),
            "temperature_c": 4.0,
            "salinity_psu": 34.6,
            "oxygen_mg_l": 5.2,
            "turbidity_ntu": 3.5,
        }
    )
    ocean.add_current(
        OceanCurrent(
            name="Gulf Stream",
            speed_mps=1.2,
            direction=(1.0, 0.2, 0.0),
            depth=100.0,
            origin=(0.0, 0.0, 90.0),
            influence_radius_km=320.0,
            temperature_delta=2.8,
            salinity_delta=0.3,
            oxygen_delta=0.6,
            turbulence_delta=0.4,
            variability=0.18,
            stability=0.82,
        )
    )
    ocean.add_current(
        {
            "name": "Subsurface Counter",
            "speed_mps": 0.7,
            "direction": (-0.5, 0.3, 0.1),
            "depth": 250.0,
            "origin": (30.0, -12.0, 240.0),
            "influence_radius_km": 180.0,
            "temperature_delta": -0.8,
            "salinity_delta": 0.1,
            "oxygen_delta": -0.4,
            "turbulence_delta": 0.2,
            "variability": 0.3,
            "stability": 0.55,
        }
    )
    ocean.add_sensor(
        OceanSensor(
            name="Array-A",
            position=(20.0, 10.0, 80.0),
            sensitivity=1.2,
            detection_range=220.0,
            noise_floor=0.05,
        )
    )
    ocean.add_sensor(
        {
            "name": "Array-B",
            "position": (-40.0, 15.0, 75.0),
            "sensitivity": 0.9,
            "detection_range": 260.0,
            "noise_floor": 0.04,
        }
    )
    return ocean


def test_dynamic_ocean_observe_generates_snapshot_and_alerts() -> None:
    ocean = _build_ocean()
    timestamp = datetime(2024, 1, 1, 6, 0, tzinfo=timezone.utc)

    snapshot = ocean.observe(depth=90.0, location=(10.0, 5.0, 90.0), timestamp=timestamp)

    assert snapshot.layer.name == "Epipelagic"
    assert snapshot.temperature_c > 18.0
    assert snapshot.oxygen_mg_l > 6.0
    assert snapshot.current_energy > 0.0
    assert 0.0 <= snapshot.stability_index <= 1.0
    assert set(snapshot.sensor_readings) == {"Array-A", "Array-B"}
    assert all(value >= 0.04 for value in snapshot.sensor_readings.values())
    assert snapshot.alerts
    assert ocean.history[-1] is snapshot
    assert ocean.events[-1].description == snapshot.alerts[-1]


def test_dynamic_ocean_layer_resolution_and_decay() -> None:
    ocean = _build_ocean()
    before_speed = ocean.currents["Gulf Stream"].speed_mps

    meso_snapshot = ocean.observe(depth=400.0, layer="Mesopelagic", location=(0.0, 0.0, 400.0))
    assert meso_snapshot.layer.name == "Mesopelagic"

    ocean.decay_currents(0.5)
    assert pytest.approx(before_speed * 0.5, rel=1e-5) == ocean.currents["Gulf Stream"].speed_mps

    ocean.decay_currents(1e-6)
    assert "Gulf Stream" not in ocean.currents


def test_dynamic_ocean_event_logging_and_recent_events() -> None:
    ocean = _build_ocean()
    event = ocean.record_event(
        "Manual ROV inspection completed",
        severity=OceanEventSeverity.INFO,
        impact=0.2,
        location=(5.0, -2.0, 95.0),
    )
    assert event.description == "Manual ROV inspection completed"
    assert ocean.recent_events(limit=1) == (event,)

    # Invoking observe should append new alerts to the log
    ocean.observe(depth=90.0, location=(5.0, 0.0, 90.0))
    assert ocean.events[-1].timestamp >= event.timestamp
