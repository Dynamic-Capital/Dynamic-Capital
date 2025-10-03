"""Tests for dynamic integration of atmospheric layers."""

from __future__ import annotations

from dataclasses import replace

from dynamic_atmosphere import DynamicAtmosphere
from dynamic_exosphere.model import ExosphericState
from dynamic_mesosphere.model import MesosphericState
from dynamic_stratosphere.model import StratosphericState
from dynamic_thermosphere.model import ThermosphericState
from dynamic_troposphere.model import TroposphericState


def _build_states() -> dict[str, object]:
    return {
        "troposphere": TroposphericState(
            lapse_rate_c_per_km=6.2,
            precipitation_potential=0.45,
            storm_risk=0.3,
            cloud_base_km=1.4,
            summary="Bounded convection forming",
        ),
        "stratosphere": StratosphericState(
            ozone_integrity=0.8,
            polar_vortex_strength=0.5,
            radiative_balance=0.7,
            stabilization_score=0.85,
            summary="Healthy ozone layer",
        ),
        "mesosphere": MesosphericState(
            thermal_variance=12.0,
            meteor_ablation_index=0.6,
            wave_drag_intensity=0.55,
            noctilucent_potential=0.35,
            summary="Wave driven cooling",
        ),
        "thermosphere": ThermosphericState(
            heat_content=0.65,
            satellite_drag_factor=0.4,
            geomagnetic_activity=0.55,
            auroral_activity=0.35,
            summary="High latitude aurora",
        ),
        "exosphere": ExosphericState(
            escape_energy=0.6,
            outflow_flux=0.4,
            satellite_risk=0.35,
            boundary_instability=0.25,
            summary="Solar wind steady",
        ),
    }


def test_dynamic_layers_are_integrated_and_sorted() -> None:
    atmosphere = DynamicAtmosphere()
    states = _build_states()

    snapshot = atmosphere.integrate_layers(
        troposphere=states["troposphere"],
        stratosphere=states["stratosphere"],
        mesosphere=states["mesosphere"],
        thermosphere=states["thermosphere"],
        exosphere=states["exosphere"],
    )

    identifiers = [layer.identifier for layer in snapshot.layers]
    assert identifiers == [
        "troposphere",
        "stratosphere",
        "mesosphere",
        "thermosphere",
        "exosphere",
    ]

    troposphere = snapshot.layers[0]
    assert 0.0 <= troposphere.humidity <= 1.0
    assert 0.0 <= troposphere.stability_index <= 1.0
    assert "summary" in troposphere.metadata
    assert troposphere.metadata["summary"] == states["troposphere"].summary
    assert troposphere.metadata["metrics"]["cloud_base_km"] == states["troposphere"].cloud_base_km

    # ensure later layers were updated using the new integration API
    exosphere = snapshot.layers[-1]
    assert exosphere.identifier == "exosphere"
    assert "metrics" in exosphere.metadata
    assert exosphere.metadata["metrics"]["boundary_instability"] == states["exosphere"].boundary_instability

    # integration should be idempotent and keep ordering on subsequent syncs
    snapshot_repeat = atmosphere.integrate_layers(
        troposphere=states["troposphere"],
        mesosphere=states["mesosphere"],
    )
    repeat_identifiers = [layer.identifier for layer in snapshot_repeat.layers]
    assert repeat_identifiers[0] == "troposphere"
    assert repeat_identifiers[-1] == "exosphere"


def test_back_to_back_sync_skips_unchanged_layers() -> None:
    atmosphere = DynamicAtmosphere()
    states = _build_states()

    baseline_snapshot = atmosphere.integrate_layers(
        troposphere=states["troposphere"],
        stratosphere=states["stratosphere"],
        mesosphere=states["mesosphere"],
        thermosphere=states["thermosphere"],
        exosphere=states["exosphere"],
    )

    baseline_ids = {layer.identifier: id(layer) for layer in baseline_snapshot.layers}

    followup_snapshot = atmosphere.integrate_layers(
        troposphere=states["troposphere"],
        stratosphere=states["stratosphere"],
        mesosphere=states["mesosphere"],
        thermosphere=states["thermosphere"],
        exosphere=states["exosphere"],
    )

    followup_ids = {layer.identifier: id(layer) for layer in followup_snapshot.layers}
    assert followup_ids == baseline_ids


def test_only_changed_layers_are_replaced() -> None:
    atmosphere = DynamicAtmosphere()
    states = _build_states()

    baseline_snapshot = atmosphere.integrate_layers(
        troposphere=states["troposphere"],
        stratosphere=states["stratosphere"],
        mesosphere=states["mesosphere"],
        thermosphere=states["thermosphere"],
        exosphere=states["exosphere"],
    )

    baseline_ids = {layer.identifier: id(layer) for layer in baseline_snapshot.layers}

    updated_snapshot = atmosphere.integrate_layers(
        troposphere=replace(states["troposphere"], storm_risk=0.6),
        mesosphere=states["mesosphere"],
    )

    updated_ids = {layer.identifier: id(layer) for layer in updated_snapshot.layers}

    assert updated_ids["troposphere"] != baseline_ids["troposphere"]
    assert updated_ids["mesosphere"] == baseline_ids["mesosphere"]
    assert updated_ids["exosphere"] == baseline_ids["exosphere"]
