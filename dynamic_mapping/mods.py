"""Module and mod-centric helpers for the dynamic mapping engine."""

from __future__ import annotations

from typing import Sequence

from .domain import (
    DomainEntitySpec,
    DomainRelationSpec,
    build_domain_layer,
    build_domain_overlay,
)
from .engine import DynamicMappingEngine, MapLayer, MapOverlay

__all__ = [
    "build_mod_layer",
    "build_mod_overlay",
    "register_mod_layer",
    "register_mod_overlay",
]


def build_mod_layer(
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    *,
    name: str = "Module Topology",
    description: str = "Mod components and their integration pathways",
) -> MapLayer:
    """Create a layer describing platform mods or modules."""

    return build_domain_layer(
        name=name,
        description=description,
        entities=entities,
        relations=relations or (),
    )


def build_mod_overlay(
    *,
    name: str = "Critical Mods",
    description: str = "Highlight mods driving the current initiative",
    focus_tags: Sequence[str] | None = None,
    focus_mods: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Create an overlay to emphasise key mods or modules."""

    return build_domain_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_entities=focus_mods,
        weight=weight,
    )


def register_mod_layer(
    engine: DynamicMappingEngine,
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    **kwargs,
) -> MapLayer:
    """Build and register a mod layer with the supplied engine."""

    layer = build_mod_layer(entities, relations, **kwargs)
    engine.register_layer(layer)
    return layer


def register_mod_overlay(
    engine: DynamicMappingEngine,
    *,
    name: str = "Critical Mods",
    description: str = "Highlight mods driving the current initiative",
    focus_tags: Sequence[str] | None = None,
    focus_mods: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Build and register a mod overlay with the supplied engine."""

    overlay = build_mod_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_mods=focus_mods,
        weight=weight,
    )
    engine.register_overlay(overlay)
    return overlay
