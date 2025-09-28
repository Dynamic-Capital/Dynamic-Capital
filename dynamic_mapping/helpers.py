"""Helper-centric utilities for the dynamic mapping engine."""

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
    "build_helper_layer",
    "build_helper_overlay",
    "register_helper_layer",
    "register_helper_overlay",
]


def build_helper_layer(
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    *,
    name: str = "Helper Fabric",
    description: str = "Support helpers coordinating operations",
) -> MapLayer:
    """Create a layer highlighting helper utilities and interactions."""

    return build_domain_layer(
        name=name,
        description=description,
        entities=entities,
        relations=relations or (),
    )


def build_helper_overlay(
    *,
    name: str = "Essential Helpers",
    description: str = "Surface helpers critical to the initiative",
    focus_tags: Sequence[str] | None = None,
    focus_helpers: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Create an overlay targeting helpers by tag or identifier."""

    return build_domain_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_entities=focus_helpers,
        weight=weight,
    )


def register_helper_layer(
    engine: DynamicMappingEngine,
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    **kwargs,
) -> MapLayer:
    """Build and register a helper layer with the supplied engine."""

    layer = build_helper_layer(entities, relations, **kwargs)
    engine.register_layer(layer)
    return layer


def register_helper_overlay(
    engine: DynamicMappingEngine,
    *,
    name: str = "Essential Helpers",
    description: str = "Surface helpers critical to the initiative",
    focus_tags: Sequence[str] | None = None,
    focus_helpers: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Build and register a helper overlay with the supplied engine."""

    overlay = build_helper_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_helpers=focus_helpers,
        weight=weight,
    )
    engine.register_overlay(overlay)
    return overlay
