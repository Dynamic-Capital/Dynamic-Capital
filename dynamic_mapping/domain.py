"""Domain helpers for constructing mapping layers and overlays."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from .engine import MapConnection, MapLayer, MapNode, MapOverlay

__all__ = [
    "DomainEntitySpec",
    "DomainRelationSpec",
    "build_domain_layer",
    "build_domain_overlay",
]


@dataclass(slots=True)
class DomainEntitySpec:
    """Specification for translating a domain object into a :class:`MapNode`."""

    identifier: str
    name: str | None = None
    category: str | None = None
    weight: float = 1.0
    tags: Sequence[str] = ()
    metadata: Mapping[str, object] | None = None


@dataclass(slots=True)
class DomainRelationSpec:
    """Specification for translating a relation into a :class:`MapConnection`."""

    source: str
    target: str
    relation: str
    intensity: float = 0.5
    directed: bool = False
    metadata: Mapping[str, object] | None = None


def _build_nodes(specs: Iterable[DomainEntitySpec]) -> tuple[MapNode, ...]:
    nodes: list[MapNode] = []
    for spec in specs:
        nodes.append(
            MapNode(
                identifier=spec.identifier,
                name=spec.name or spec.identifier,
                category=spec.category,
                weight=spec.weight,
                tags=tuple(spec.tags),
                metadata=spec.metadata,
            )
        )
    return tuple(nodes)


def _build_connections(
    relations: Iterable[DomainRelationSpec],
) -> tuple[MapConnection, ...]:
    connections: list[MapConnection] = []
    for relation in relations:
        connections.append(
            MapConnection(
                source=relation.source,
                target=relation.target,
                relation=relation.relation,
                intensity=relation.intensity,
                directed=relation.directed,
                metadata=relation.metadata,
            )
        )
    return tuple(connections)


def build_domain_layer(
    *,
    name: str,
    description: str,
    entities: Sequence[DomainEntitySpec],
    relations: Sequence[DomainRelationSpec] | None = None,
) -> MapLayer:
    """Construct a :class:`MapLayer` from domain entity specifications."""

    return MapLayer(
        name=name,
        description=description,
        nodes=_build_nodes(entities),
        connections=_build_connections(relations or ()),
    )


def build_domain_overlay(
    *,
    name: str,
    description: str,
    focus_tags: Sequence[str] | None = None,
    focus_entities: Sequence[str] | None = None,
    weight: float = 1.0,
) -> MapOverlay:
    """Construct a :class:`MapOverlay` tailored to the supplied domain."""

    return MapOverlay(
        name=name,
        description=description,
        focus_tags=tuple(focus_tags or ()),
        focus_nodes=tuple(focus_entities or ()),
        weight=weight,
    )
