from __future__ import annotations

from dynamic_agents import SpaceAgent, SpaceAgentResult
from dynamic_agents.space import SpaceAgent as ShimSpaceAgent
from dynamic_space import (
    BodyKind,
    CelestialBody,
    DynamicSpace,
    OrbitalRoute,
    SpaceEventSeverity,
    SpaceSector,
)


def _build_sector() -> SpaceSector:
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


def test_space_agent_generates_snapshot_and_recommendations() -> None:
    manager = DynamicSpace()
    agent = SpaceAgent(manager)

    sector = _build_sector()
    payload = {
        "sectors": [sector],
        "events": [
            {
                "sector_name": sector.name,
                "description": "micrometeorite shower",
                "impact_score": 0.6,
                "severity": SpaceEventSeverity.ALERT,
            },
            {
                "sector_name": sector.name,
                "description": "routing congestion",
                "impact_score": 0.4,
                "severity": SpaceEventSeverity.ADVISORY,
            },
        ],
        "sector": sector.name,
        "rebalance": True,
        "congestion_threshold": 0.65,
        "horizon": 3,
    }

    result = agent.run(payload)
    assert isinstance(result, SpaceAgentResult)
    assert result.sector == sector.name
    assert result.snapshot.sector_name == sector.name
    assert result.recommendations
    assert result.events
    assert result.snapshot.recent_events[-1].description == "routing congestion"

    payload_dict = result.to_dict()
    assert payload_dict["sector"] == sector.name
    assert payload_dict["snapshot"]["sector_name"] == sector.name
    assert payload_dict["events"] == payload_dict["snapshot"]["recent_events"]
    assert all(isinstance(rec, str) and rec for rec in payload_dict["recommendations"])


def test_space_agent_shim_matches_direct_import() -> None:
    direct = SpaceAgent()
    via_shim = ShimSpaceAgent()

    sector = _build_sector()
    result_direct = direct.run({"sectors": [sector], "sector": sector.name})
    result_shim = via_shim.run({"sectors": [sector], "sector": sector.name})

    assert result_direct.snapshot.sector_name == result_shim.snapshot.sector_name
    assert result_direct.to_dict()["snapshot"]["sector_name"] == result_shim.to_dict()["snapshot"]["sector_name"]
