"""Synchronisation insights for the dynamic mapping engine."""

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
    "build_sync_layer",
    "build_sync_overlay",
    "register_sync_layer",
    "register_sync_overlay",
]


def build_sync_layer(
    systems: Sequence[DomainEntitySpec],
    dependencies: Sequence[DomainRelationSpec] | None = None,
    *,
    name: str = "Sync Systems",
    description: str = "Synchronized systems and their dependencies",
) -> MapLayer:
    """Create a layer representing synchronisation systems and flows."""

    return build_domain_layer(
        name=name,
        description=description,
        entities=systems,
        relations=dependencies or (),
    )


def build_sync_overlay(
    *,
    name: str = "Sync Hotspots",
    description: str = "Highlight synchronisation points requiring attention",
    focus_tags: Sequence[str] | None = None,
    focus_systems: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Create an overlay emphasising synchronisation hotspots."""

    return build_domain_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_entities=focus_systems,
        weight=weight,
    )


def register_sync_layer(
    engine: DynamicMappingEngine,
    systems: Sequence[DomainEntitySpec],
    dependencies: Sequence[DomainRelationSpec] | None = None,
    **kwargs,
) -> MapLayer:
    """Build and register a sync layer with the supplied engine."""

    layer = build_sync_layer(systems, dependencies, **kwargs)
    engine.register_layer(layer)
    return layer


def register_sync_overlay(
    engine: DynamicMappingEngine,
    *,
    name: str = "Sync Hotspots",
    description: str = "Highlight synchronisation points requiring attention",
    focus_tags: Sequence[str] | None = None,
    focus_systems: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Build and register a sync overlay with the supplied engine."""

    overlay = build_sync_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_systems=focus_systems,
        weight=weight,
    )
    engine.register_overlay(overlay)
    return overlay
