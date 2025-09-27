from __future__ import annotations

from dynamic_space import (
    BodyKind,
    CelestialBody,
    OrbitalRoute,
    SpaceEvent,
    SpaceEventSeverity,
    SpaceSector,
)
from dynamic_space.engine import DynamicSpaceEngine, SpaceNetworkOverview


def _build_corridor() -> SpaceSector:
    terra = CelestialBody(
        name="Terra",
        kind=BodyKind.PLANET,
        mass_kg=5.97e24,
        velocity_kms=29.78,
        resource_index=0.82,
        habitability=0.94,
    )
    station = CelestialBody(
        name="Astra Station",
        kind=BodyKind.STATION,
        mass_kg=2.5e8,
        velocity_kms=7.66,
        resource_index=0.55,
        habitability=0.4,
        tags=("logistics", "hub"),
    )
    routes = (
        OrbitalRoute(
            identifier="terra-orbit",
            origin="Terra",
            destination="Astra Station",
            delta_v_kms=9.1,
            congestion=0.72,
            stability=0.65,
        ),
        OrbitalRoute(
            identifier="station-transfer",
            origin="Astra Station",
            destination="Terra",
            delta_v_kms=9.1,
            congestion=0.68,
            stability=0.62,
        ),
    )
    return SpaceSector(
        name="L4 Corridor",
        bodies=(terra, station),
        routes=routes,
        hazard_index=0.32,
        supply_level=0.74,
        energy_output_gw=18.5,
    )


def _build_outer_belt() -> SpaceSector:
    ceres = CelestialBody(
        name="Ceres",
        kind=BodyKind.ASTEROID,
        mass_kg=9.39e20,
        velocity_kms=17.9,
        resource_index=0.45,
        habitability=0.1,
    )
    refinery = CelestialBody(
        name="Belt Refinery",
        kind=BodyKind.STATION,
        mass_kg=4.1e9,
        velocity_kms=12.4,
        resource_index=0.48,
        habitability=0.2,
        tags=("mining", "processing"),
    )
    routes = (
        OrbitalRoute(
            identifier="belt-haul",
            origin="Ceres",
            destination="Belt Refinery",
            delta_v_kms=6.7,
            congestion=0.58,
            stability=0.52,
        ),
    )
    return SpaceSector(
        name="Outer Belt",
        bodies=(ceres, refinery),
        routes=routes,
        hazard_index=0.58,
        supply_level=0.42,
        energy_output_gw=4.2,
    )


def test_network_overview_and_priorities() -> None:
    engine = DynamicSpaceEngine([_build_corridor(), _build_outer_belt()])
    overview = engine.network_overview(horizon=4)

    assert isinstance(overview, SpaceNetworkOverview)
    assert set(overview.snapshots.keys()) == {"L4 Corridor", "Outer Belt"}
    assert overview.total_energy_output_gw == 22.7

    average = sum(snapshot.stability_score for snapshot in overview.snapshots.values()) / 2
    assert overview.average_stability == average

    # degrade the Outer Belt sector with critical events
    engine.record_event(
        SpaceEvent(
            sector_name="Outer Belt",
            description="micro-meteor swarm",
            impact_score=0.8,
            severity=SpaceEventSeverity.CRITICAL,
        )
    )
    engine.record_event(
        {
            "sector_name": "Outer Belt",
            "description": "radiation surge",
            "impact_score": 0.6,
            "severity": SpaceEventSeverity.ALERT,
        }
    )

    priorities = engine.prioritise_interventions(limit=2, horizon=3)
    assert len(priorities) == 2
    assert priorities[0].sector_name == "Outer Belt"
    assert priorities[0].stability_score <= priorities[1].stability_score

    engine.configure_intervention_threshold(0.65)
    updated_overview = engine.network_overview(horizon=3)
    assert "Outer Belt" in updated_overview.sectors_requiring_attention
    assert updated_overview.snapshots["Outer Belt"].stability_score == priorities[0].stability_score

    # verify state export mirrors snapshot values
    exported = engine.export_state(horizon=3)
    assert exported["average_stability"] == updated_overview.average_stability
    assert exported["total_energy_output_gw"] == updated_overview.total_energy_output_gw
    assert exported["sectors_requiring_attention"] == updated_overview.sectors_requiring_attention
    assert exported["snapshots"]["Outer Belt"]["stability_score"] == priorities[0].stability_score


def test_stabilise_updates_routes_and_hazard() -> None:
    engine = DynamicSpaceEngine([_build_corridor()])
    before = engine.space.get_sector("L4 Corridor")

    after = engine.stabilise("L4 Corridor", congestion_threshold=0.65)
    assert after.hazard_index <= before.hazard_index
    assert any(new.congestion <= old.congestion for new, old in zip(after.routes, before.routes))

    # upsert a new sector using mapping payload
    payload = {
        "name": "Deep Relay",
        "bodies": (
            {
                "name": "Relay Alpha",
                "kind": BodyKind.STATION,
                "mass_kg": 6.5e9,
                "velocity_kms": 10.2,
                "resource_index": 0.5,
                "habitability": 0.3,
            },
        ),
        "routes": (
            {
                "identifier": "relay-hop",
                "origin": "Relay Alpha",
                "destination": "Terra",
                "delta_v_kms": 11.4,
                "congestion": 0.48,
                "stability": 0.57,
            },
        ),
        "hazard_index": 0.2,
        "supply_level": 0.66,
        "energy_output_gw": 6.4,
    }
    sector = engine.upsert_sector(payload)
    assert sector.name == "Deep Relay"
    assert any(sector.name == "Deep Relay" for sector in engine.sectors)
