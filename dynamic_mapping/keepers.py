"""Keeper-focused utilities for the dynamic mapping engine."""

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
    "build_keeper_layer",
    "build_keeper_overlay",
    "register_keeper_layer",
    "register_keeper_overlay",
]


def build_keeper_layer(
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    *,
    name: str = "Keeper Network",
    description: str = "Keeper algorithms safeguarding the platform",
) -> MapLayer:
    """Create a layer representing keeper responsibilities and links."""

    return build_domain_layer(
        name=name,
        description=description,
        entities=entities,
        relations=relations or (),
    )


def build_keeper_overlay(
    *,
    name: str = "Keeper Watchlist",
    description: str = "Emphasise keepers handling sensitive systems",
    focus_tags: Sequence[str] | None = None,
    focus_keepers: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Create an overlay highlighting priority keepers."""

    return build_domain_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_entities=focus_keepers,
        weight=weight,
    )


def register_keeper_layer(
    engine: DynamicMappingEngine,
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    **kwargs,
) -> MapLayer:
    """Build and register a keeper layer with the supplied engine."""

    layer = build_keeper_layer(entities, relations, **kwargs)
    engine.register_layer(layer)
    return layer


def register_keeper_overlay(
    engine: DynamicMappingEngine,
    *,
    name: str = "Keeper Watchlist",
    description: str = "Emphasise keepers handling sensitive systems",
    focus_tags: Sequence[str] | None = None,
    focus_keepers: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Build and register a keeper overlay with the supplied engine."""

    overlay = build_keeper_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_keepers=focus_keepers,
        weight=weight,
    )
    engine.register_overlay(overlay)
    return overlay
