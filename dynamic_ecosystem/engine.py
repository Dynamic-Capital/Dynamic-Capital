"""Interdependence modelling engine for Dynamic Capital ecosystems."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Iterable, Mapping, MutableMapping

__all__ = [
    "CascadeSimulation",
    "DynamicEcosystemEngine",
    "EcosystemEntity",
    "EcosystemLink",
    "EcosystemSnapshot",
]


def _normalise_text(value: str, *, field_name: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_tags(tags: Iterable[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        candidate = _normalise_text(str(tag), field_name="tag").lower()
        if candidate not in seen:
            seen.add(candidate)
            cleaned.append(candidate)
    return tuple(cleaned)


def _clamp_resilience(value: float) -> float:
    numeric = float(value)
    if not 0.0 <= numeric <= 1.0:
        raise ValueError("resilience must be between 0.0 and 1.0")
    return numeric


def _clamp_weight(value: float) -> float:
    numeric = float(value)
    if numeric <= 0.0:
        raise ValueError("relationship weight must be positive")
    return numeric


@dataclass(slots=True)
class EcosystemEntity:
    """Entity participating in the ecosystem graph."""

    name: str
    kind: str
    resilience: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field_name="name").lower()
        self.kind = _normalise_text(self.kind, field_name="kind").lower()
        self.resilience = _clamp_resilience(self.resilience)
        self.tags = _normalise_tags(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "kind": self.kind,
            "resilience": self.resilience,
            "tags": list(self.tags),
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class EcosystemLink:
    """Directional relationship between two entities."""

    source: str
    target: str
    weight: float = 1.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.source = _normalise_text(self.source, field_name="source").lower()
        self.target = _normalise_text(self.target, field_name="target").lower()
        self.weight = _clamp_weight(self.weight)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "source": self.source,
            "target": self.target,
            "weight": self.weight,
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class EcosystemSnapshot:
    """Snapshot of ecosystem diversity and structural metrics."""

    entities: Mapping[str, EcosystemEntity]
    adjacency: Mapping[str, tuple[EcosystemLink, ...]]
    biodiversity_index: float
    dependency_index: float
    recommended_actions: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "entities": {name: entity.as_dict() for name, entity in self.entities.items()},
            "adjacency": {
                name: [link.as_dict() for link in links]
                for name, links in self.adjacency.items()
            },
            "biodiversity_index": self.biodiversity_index,
            "dependency_index": self.dependency_index,
            "recommended_actions": list(self.recommended_actions),
        }


@dataclass(slots=True)
class CascadeSimulation:
    """Result of simulating a cascading shock through the ecosystem."""

    origin: str
    exposures: Mapping[str, float]
    breached_entities: tuple[str, ...]
    residual_risk: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "origin": self.origin,
            "exposures": dict(self.exposures),
            "breached_entities": list(self.breached_entities),
            "residual_risk": self.residual_risk,
        }


class DynamicEcosystemEngine:
    """Model ecosystem relationships and evaluate systemic resilience."""

    def __init__(self) -> None:
        self._entities: Dict[str, EcosystemEntity] = {}
        self._adjacency: Dict[str, list[EcosystemLink]] = defaultdict(list)

    # ------------------------------------------------------------------ entities
    def register(self, entity: EcosystemEntity | Mapping[str, object]) -> EcosystemEntity:
        resolved = self._coerce_entity(entity)
        self._entities[resolved.name] = resolved
        return resolved

    def extend(self, entities: Iterable[EcosystemEntity | Mapping[str, object]]) -> None:
        for entity in entities:
            self.register(entity)

    # ------------------------------------------------------------------ links
    def connect(self, link: EcosystemLink | Mapping[str, object]) -> EcosystemLink:
        resolved = self._coerce_link(link)
        if resolved.source not in self._entities or resolved.target not in self._entities:
            raise KeyError("both source and target must be registered entities")
        # ensure unique by overriding existing link with same target
        connections = self._adjacency[resolved.source]
        connections = [existing for existing in connections if existing.target != resolved.target]
        connections.append(resolved)
        self._adjacency[resolved.source] = connections
        return resolved

    def weave(self, links: Iterable[EcosystemLink | Mapping[str, object]]) -> None:
        for link in links:
            self.connect(link)

    # ----------------------------------------------------------------- telemetry
    def snapshot(self) -> EcosystemSnapshot:
        biodiversity = self._compute_biodiversity_index()
        dependency = self._compute_dependency_index()
        recommendations = self._derive_recommendations(biodiversity, dependency)
        adjacency = {name: tuple(links) for name, links in self._adjacency.items()}
        return EcosystemSnapshot(
            entities=dict(self._entities),
            adjacency=adjacency,
            biodiversity_index=biodiversity,
            dependency_index=dependency,
            recommended_actions=recommendations,
        )

    def simulate_cascade(
        self,
        origin: str,
        *,
        intensity: float = 0.5,
        max_depth: int = 4,
        resilience_floor: float = 0.1,
    ) -> CascadeSimulation:
        normalised_origin = _normalise_text(origin, field_name="origin").lower()
        if normalised_origin not in self._entities:
            raise KeyError(f"unknown origin entity {origin!r}")
        if not 0.0 <= intensity <= 1.0:
            raise ValueError("intensity must be between 0.0 and 1.0")
        if max_depth <= 0:
            raise ValueError("max_depth must be positive")
        if not 0.0 <= resilience_floor <= 1.0:
            raise ValueError("resilience_floor must be between 0.0 and 1.0")

        exposures: Dict[str, float] = {}
        breached: set[str] = set()
        queue: Deque[tuple[str, float, int]] = deque()
        queue.append((normalised_origin, intensity, 0))

        while queue:
            node, shock, depth = queue.popleft()
            entity = self._entities[node]
            effective_shock = max(shock * (1.0 - entity.resilience), resilience_floor if shock > resilience_floor else shock)
            exposures[node] = max(exposures.get(node, 0.0), effective_shock)
            if effective_shock >= 0.7:
                breached.add(node)
            if depth >= max_depth:
                continue
            for link in self._adjacency.get(node, []):
                propagated = shock * link.weight * (1.0 - entity.resilience)
                if propagated < 0.01:
                    continue
                queue.append((link.target, propagated, depth + 1))

        residual_risk = max(exposures.values()) if exposures else 0.0
        return CascadeSimulation(
            origin=normalised_origin,
            exposures=exposures,
            breached_entities=tuple(sorted(breached)),
            residual_risk=residual_risk,
        )

    # ------------------------------------------------------------------ helpers
    def _coerce_entity(self, entity: EcosystemEntity | Mapping[str, object]) -> EcosystemEntity:
        if isinstance(entity, EcosystemEntity):
            return entity
        if not isinstance(entity, Mapping):
            raise TypeError("entity must be an EcosystemEntity or mapping")
        return EcosystemEntity(
            name=entity.get("name", ""),
            kind=entity.get("kind", "module"),
            resilience=float(entity.get("resilience", 0.5)),
            tags=tuple(entity.get("tags", ()) or ()),
            metadata=entity.get("metadata"),
        )

    def _coerce_link(self, link: EcosystemLink | Mapping[str, object]) -> EcosystemLink:
        if isinstance(link, EcosystemLink):
            return link
        if not isinstance(link, Mapping):
            raise TypeError("link must be an EcosystemLink or mapping")
        return EcosystemLink(
            source=link.get("source", ""),
            target=link.get("target", ""),
            weight=float(link.get("weight", 1.0)),
            metadata=link.get("metadata"),
        )

    def _compute_biodiversity_index(self) -> float:
        if not self._entities:
            return 0.0
        kind_counts: Dict[str, int] = defaultdict(int)
        tag_counts: Dict[str, int] = defaultdict(int)
        for entity in self._entities.values():
            kind_counts[entity.kind] += 1
            for tag in entity.tags:
                tag_counts[tag] += 1
        diversity = (len(kind_counts) + len(tag_counts)) / (len(self._entities) * 2)
        return min(max(diversity, 0.0), 1.0)

    def _compute_dependency_index(self) -> float:
        if not self._entities:
            return 0.0
        total_links = sum(len(links) for links in self._adjacency.values())
        return min(total_links / max(len(self._entities), 1), 1.0)

    def _derive_recommendations(
        self,
        biodiversity: float,
        dependency: float,
    ) -> tuple[str, ...]:
        if biodiversity < 0.3:
            return (
                "diversify_strategies",
                "invite_external_protocols",
                "seed_new_cohort_experiments",
            )
        if dependency > 0.75:
            return (
                "reduce_single_points_of_failure",
                "build_redundant_paths",
            )
        if dependency < 0.25:
            return (
                "encourage_cross_module_collaborations",
                "sponsor_shared_initiatives",
            )
        return (
            "monitor_for_cascading_risk",
            "celebrate_ecosystem_health",
        )
