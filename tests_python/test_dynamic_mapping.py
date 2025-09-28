from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_mapping import (  # noqa: E402  - path mutation for test isolation
    DynamicMappingEngine,
    MapConnection,
    MapLayer,
    MapNode,
    MapOverlay,
    MapScenario,
    MapView,
)


def _build_sample_layer() -> MapLayer:
    nodes = (
        MapNode(
            identifier="North Hub",
            name="North Hub",
            category="hub",
            weight=0.9,
            tags=("strategic", "north"),
        ),
        MapNode(
            identifier="South Hub",
            name="South Hub",
            category="hub",
            weight=0.8,
            tags=("south", "logistics"),
        ),
        MapNode(
            identifier="Innovation Lab",
            name="Innovation Lab",
            category="lab",
            weight=0.7,
            tags=("strategic", "innovation"),
        ),
    )
    connections = (
        MapConnection(
            source="North Hub",
            target="South Hub",
            relation="supply",
            intensity=0.8,
        ),
        MapConnection(
            source="North Hub",
            target="Innovation Lab",
            relation="insight",
            intensity=0.6,
        ),
        MapConnection(
            source="South Hub",
            target="Innovation Lab",
            relation="feedback",
            intensity=0.4,
        ),
    )
    return MapLayer(
        name="Operational Network",
        description="Core operational nodes",
        nodes=nodes,
        connections=connections,
    )


def test_dynamic_mapping_engine_compose_blueprint() -> None:
    engine = DynamicMappingEngine()
    layer = _build_sample_layer()
    overlay = MapOverlay(
        name="Strategic Overlay",
        description="Highlight strategic assets",
        focus_tags=("strategic",),
        focus_nodes=("Innovation Lab",),
        weight=1.2,
    )
    scenario = MapScenario(
        name="Growth Push",
        objective="Expand strategic throughput",
        key_layers=("Operational Network",),
        focus_tags=("innovation",),
    )
    view = MapView(
        title="Executive Overview",
        narrative="Surface critical nodes and relationships",
        overlay_names=("Strategic Overlay",),
        highlight_limit=2,
    )

    engine.register_layer(layer)
    engine.register_overlay(overlay)

    blueprint = engine.compose(scenario, view)

    assert blueprint.layers[0].name == "Operational Network"
    assert blueprint.overlays[0].name == "Strategic Overlay"
    assert len(blueprint.highlighted_nodes) == 2
    assert all(node.identifier in {"north_hub", "innovation_lab", "south_hub"} for node in blueprint.highlighted_nodes)
    assert blueprint.highlighted_connections
    assert blueprint.insights
    assert blueprint.recommended_actions
    payload = blueprint.as_dict()
    assert payload["scenario"]["name"] == "Growth Push"
    assert payload["highlighted_nodes"], "highlighted nodes should serialise"


def test_layer_rejects_missing_node_connections() -> None:
    nodes = (MapNode(identifier="alpha", name="Alpha"),)
    connections = (MapConnection(source="alpha", target="beta", relation="link"),)
    try:
        MapLayer(
            name="Invalid",
            description="Broken connection",
            nodes=nodes,
            connections=connections,
        )
    except ValueError as exc:
        assert "connection target" in str(exc)
    else:  # pragma: no cover - defensive
        raise AssertionError("MapLayer should reject connections referencing unknown nodes")
