"""Agent-specific helpers for the dynamic mapping engine."""

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
    "build_agent_layer",
    "build_agent_overlay",
    "register_agent_layer",
    "register_agent_overlay",
]


def build_agent_layer(
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    *,
    name: str = "Agent Network",
    description: str = "Operational agents and their collaboration pathways",
) -> MapLayer:
    """Create a layer describing the relationship graph between agents."""

    return build_domain_layer(
        name=name,
        description=description,
        entities=entities,
        relations=relations or (),
    )


def build_agent_overlay(
    *,
    name: str = "Priority Agents",
    description: str = "Highlight agents aligned to the current mission",
    focus_tags: Sequence[str] | None = None,
    focus_agents: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Create an overlay to emphasise specific agents or competencies."""

    return build_domain_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_entities=focus_agents,
        weight=weight,
    )


def register_agent_layer(
    engine: DynamicMappingEngine,
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
    **kwargs,
) -> MapLayer:
    """Build and register an agent layer with the supplied engine."""

    layer = build_agent_layer(entities, relations, **kwargs)
    engine.register_layer(layer)
    return layer


def register_agent_overlay(
    engine: DynamicMappingEngine,
    *,
    name: str = "Priority Agents",
    description: str = "Highlight agents aligned to the current mission",
    focus_tags: Sequence[str] | None = None,
    focus_agents: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Build and register an agent overlay with the supplied engine."""

    overlay = build_agent_overlay(
        name=name,
        description=description,
        focus_tags=focus_tags,
        focus_agents=focus_agents,
        weight=weight,
    )
    engine.register_overlay(overlay)
    return overlay
