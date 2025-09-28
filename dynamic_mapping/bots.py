"""Bot-centric helpers for the dynamic mapping engine."""

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
    "build_bot_layer",
    "build_bot_overlay",
    "register_bot_layer",
    "register_bot_overlay",
]


def build_bot_layer(
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    *,
    name: str = "Bot Mesh",
    description: str = "Automation bots and notification flows",
) -> MapLayer:
    """Create a layer visualising bots and their interactions."""

    return build_domain_layer(
        name=name,
        description=description,
        entities=entities,
        relations=relations or (),
    )


def build_bot_overlay(
    *,
    name: str = "Active Bots",
    description: str = "Highlight bots engaged in the current cycle",
    focus_tags: Sequence[str] | None = None,
    focus_bots: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Create an overlay emphasising selected bots."""

    return build_domain_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_entities=focus_bots,
        weight=weight,
    )


def register_bot_layer(
    engine: DynamicMappingEngine,
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    **kwargs,
) -> MapLayer:
    """Build and register a bot layer with the supplied engine."""

    layer = build_bot_layer(entities, relations, **kwargs)
    engine.register_layer(layer)
    return layer


def register_bot_overlay(
    engine: DynamicMappingEngine,
    *,
    name: str = "Active Bots",
    description: str = "Highlight bots engaged in the current cycle",
    focus_tags: Sequence[str] | None = None,
    focus_bots: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Build and register a bot overlay with the supplied engine."""

    overlay = build_bot_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_bots=focus_bots,
        weight=weight,
    )
    engine.register_overlay(overlay)
    return overlay
