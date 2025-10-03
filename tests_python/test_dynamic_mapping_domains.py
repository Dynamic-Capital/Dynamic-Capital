from __future__ import annotations

import pytest

from dynamic_mapping import (
    DomainEntitySpec,
    DomainRelationSpec,
    DynamicMappingEngine,
    MapScenario,
    MapView,
    build_agent_layer,
    build_agent_overlay,
    register_agent_layer,
    register_agent_overlay,
    build_helper_layer,
    build_helper_overlay,
    register_helper_layer,
    register_helper_overlay,
    build_mod_layer,
    build_mod_overlay,
    register_mod_layer,
    register_mod_overlay,
    build_keeper_layer,
    build_keeper_overlay,
    register_keeper_layer,
    register_keeper_overlay,
    build_bot_layer,
    build_bot_overlay,
    register_bot_layer,
    register_bot_overlay,
    build_sync_layer,
    build_sync_overlay,
    register_sync_layer,
    register_sync_overlay,
)


DOMAIN_VARIANTS = (
    (
        "agents",
        build_agent_layer,
        build_agent_overlay,
        register_agent_layer,
        register_agent_overlay,
        "focus_agents",
    ),
    (
        "helpers",
        build_helper_layer,
        build_helper_overlay,
        register_helper_layer,
        register_helper_overlay,
        "focus_helpers",
    ),
    (
        "mods",
        build_mod_layer,
        build_mod_overlay,
        register_mod_layer,
        register_mod_overlay,
        "focus_mods",
    ),
    (
        "keepers",
        build_keeper_layer,
        build_keeper_overlay,
        register_keeper_layer,
        register_keeper_overlay,
        "focus_keepers",
    ),
    (
        "bots",
        build_bot_layer,
        build_bot_overlay,
        register_bot_layer,
        register_bot_overlay,
        "focus_bots",
    ),
    (
        "sync",
        build_sync_layer,
        build_sync_overlay,
        register_sync_layer,
        register_sync_overlay,
        "focus_systems",
    ),
)


@pytest.mark.parametrize(
    "domain, layer_builder, overlay_builder, layer_register, overlay_register, focus_param",
    DOMAIN_VARIANTS,
)
def test_domain_helpers_build_and_register(
    domain: str,
    layer_builder,
    overlay_builder,
    layer_register,
    overlay_register,
    focus_param: str,
) -> None:
    entities = [
        DomainEntitySpec(
            identifier=f"{domain}_alpha",
            name=f"{domain.title()} Alpha",
            tags=(domain, "core"),
            weight=0.9,
        ),
        DomainEntitySpec(
            identifier=f"{domain}_beta",
            name=f"{domain.title()} Beta",
            tags=("support",),
            weight=0.7,
        ),
    ]
    relations = [
        DomainRelationSpec(
            source=f"{domain}_alpha",
            target=f"{domain}_beta",
            relation="supports",
            intensity=0.6,
        )
    ]

    layer_name = f"{domain.title()} Layer"
    layer_description = f"{domain.title()} relationship graph"
    layer = layer_builder(
        entities,
        relations,
        name=layer_name,
        description=layer_description,
    )
    assert layer.name == layer_name
    assert layer.connections

    focus_kwargs = {"focus_tags": (domain,)}
    focus_kwargs[focus_param] = (entities[0].identifier,)
    overlay_name = f"{domain.title()} Overlay"
    overlay_description = f"{domain.title()} focus"
    overlay = overlay_builder(
        name=overlay_name,
        description=overlay_description,
        **focus_kwargs,
    )
    assert overlay.name == overlay_name

    engine = DynamicMappingEngine()
    registered_layer = layer_register(
        engine,
        entities,
        relations,
        name=layer_name,
        description=layer_description,
    )
    assert registered_layer.name == layer_name

    registered_overlay = overlay_register(
        engine,
        name=overlay_name,
        description=overlay_description,
        **focus_kwargs,
    )
    assert registered_overlay.name == overlay_name

    scenario = MapScenario(
        name=f"{domain.title()} Scenario",
        objective="Demonstrate domain mapping",
        key_layers=(layer_name,),
        focus_tags=(domain,),
    )
    view = MapView(
        title=f"{domain.title()} View",
        narrative="Highlight critical actors",
        overlay_names=(overlay_name,),
        highlight_limit=1,
    )

    blueprint = engine.compose(scenario, view)

    assert blueprint.layers[0].name == layer_name
    assert blueprint.overlays[0].name == overlay_name
    assert blueprint.highlighted_nodes, "expected highlighted nodes for domain mapping"
    assert isinstance(blueprint.routes, tuple)
