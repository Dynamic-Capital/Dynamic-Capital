from __future__ import annotations

"""Self-contained engine for reasoning about dynamic entity links."""

from dataclasses import dataclass, field
from math import exp
from typing import Iterable, Mapping, MutableMapping, Sequence
from types import MappingProxyType

__all__ = [
    "DynamicLinkEngine",
    "LinkEdge",
    "LinkNetworkSnapshot",
    "LinkNode",
    "LinkObservation",
    "LinkSuggestion",
]


def _normalise_identifier(value: str, *, field_name: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_label(value: str | None, *, fallback: str) -> str:
    if value is None:
        return fallback
    text = value.strip()
    return text or fallback


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _freeze_mapping(
    value: Mapping[str, object] | None, *, field_name: str
) -> Mapping[str, object] | None:
    if value is None:
        return None
    if not isinstance(value, Mapping):
        raise TypeError(f"{field_name} must be a mapping if provided")
    return MappingProxyType(dict(value))


@dataclass(frozen=True, slots=True)
class LinkNode:
    """Representation of an entity that can participate in links."""

    identifier: str
    label: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        identifier = _normalise_identifier(self.identifier, field_name="identifier")
        label = _normalise_label(self.label, fallback=identifier)
        metadata = _freeze_mapping(self.metadata, field_name="metadata")
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "label", label)
        object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True, slots=True)
class LinkObservation:
    """Signal describing an interaction between two nodes."""

    source: str
    target: str
    interaction: str
    strength: float = 1.0
    quality: float = 0.8
    metadata: Mapping[str, object] | None = None
    bidirectional: bool = True

    def __post_init__(self) -> None:
        source = _normalise_identifier(self.source, field_name="source")
        target = _normalise_identifier(self.target, field_name="target")
        if source == target:
            raise ValueError("source and target must be different")
        interaction = _normalise_identifier(
            self.interaction, field_name="interaction"
        )
        strength = max(float(self.strength), 0.0)
        quality = _clamp(self.quality)
        metadata = _freeze_mapping(self.metadata, field_name="metadata")
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "interaction", interaction)
        object.__setattr__(self, "strength", strength)
        object.__setattr__(self, "quality", quality)
        object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True, slots=True)
class LinkEdge:
    """Aggregated link state between two nodes."""

    source: str
    target: str
    weight: float
    confidence: float
    observations: int
    average_quality: float
    interactions: Mapping[str, int]
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        source = _normalise_identifier(self.source, field_name="source")
        target = _normalise_identifier(self.target, field_name="target")
        if source == target:
            raise ValueError("source and target must be different")
        weight = max(float(self.weight), 0.0)
        confidence = _clamp(self.confidence)
        observations = max(int(self.observations), 0)
        average_quality = _clamp(self.average_quality)
        interactions = MappingProxyType(dict(self.interactions))
        metadata = _freeze_mapping(self.metadata, field_name="metadata")
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "weight", weight)
        object.__setattr__(self, "confidence", confidence)
        object.__setattr__(self, "observations", observations)
        object.__setattr__(self, "average_quality", average_quality)
        object.__setattr__(self, "interactions", interactions)
        object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True, slots=True)
class LinkSuggestion:
    """Recommendation describing a promising connection for a node."""

    source: str
    target: str
    score: float
    confidence: float
    reasons: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        source = _normalise_identifier(self.source, field_name="source")
        target = _normalise_identifier(self.target, field_name="target")
        if source == target:
            raise ValueError("suggestions must link different nodes")
        score = max(float(self.score), 0.0)
        confidence = _clamp(self.confidence)
        reasons = tuple(reason.strip() for reason in self.reasons if reason.strip())
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "score", score)
        object.__setattr__(self, "confidence", confidence)
        object.__setattr__(self, "reasons", reasons)


@dataclass(frozen=True, slots=True)
class LinkNetworkSnapshot:
    """Serializable snapshot of the nodes and edges managed by the engine."""

    nodes: tuple[LinkNode, ...]
    edges: tuple[LinkEdge, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "nodes": [
                {
                    "identifier": node.identifier,
                    "label": node.label,
                    "metadata": dict(node.metadata or {}),
                }
                for node in self.nodes
            ],
            "edges": [
                {
                    "source": edge.source,
                    "target": edge.target,
                    "weight": edge.weight,
                    "confidence": edge.confidence,
                    "observations": edge.observations,
                    "average_quality": edge.average_quality,
                    "interactions": dict(edge.interactions),
                    "metadata": dict(edge.metadata or {}),
                }
                for edge in self.edges
            ],
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, object]) -> LinkNetworkSnapshot:
        if not isinstance(payload, Mapping):
            raise TypeError("snapshot payload must be a mapping")
        node_payloads = payload.get("nodes", [])
        edge_payloads = payload.get("edges", [])
        nodes = []
        for item in node_payloads:
            if not isinstance(item, Mapping):
                raise TypeError("node entry must be a mapping")
            nodes.append(
                LinkNode(
                    identifier=str(item.get("identifier", "")),
                    label=str(item.get("label")) if item.get("label") is not None else None,
                    metadata=item.get("metadata"),
                )
            )
        edges = []
        for item in edge_payloads:
            if not isinstance(item, Mapping):
                raise TypeError("edge entry must be a mapping")
            edges.append(
                LinkEdge(
                    source=str(item.get("source", "")),
                    target=str(item.get("target", "")),
                    weight=float(item.get("weight", 0.0)),
                    confidence=float(item.get("confidence", 0.0)),
                    observations=int(item.get("observations", 0)),
                    average_quality=float(item.get("average_quality", 0.0)),
                    interactions=item.get("interactions", {}),
                    metadata=item.get("metadata"),
                )
            )
        return cls(nodes=tuple(nodes), edges=tuple(edges))


@dataclass
class _EdgeStats:
    weight: float = 0.0
    count: int = 0
    quality_sum: float = 0.0
    interaction_counts: MutableMapping[str, int] = field(default_factory=dict)
    metadata: Mapping[str, object] | None = None

    def register(self, observation: LinkObservation, *, decay: float) -> None:
        influence = observation.strength * (0.5 + 0.5 * observation.quality)
        self.weight = (self.weight * (1.0 - decay)) + influence
        self.count += 1
        self.quality_sum += observation.quality
        self.interaction_counts[observation.interaction] = (
            self.interaction_counts.get(observation.interaction, 0) + 1
        )
        if observation.metadata is not None:
            self.metadata = MappingProxyType(dict(observation.metadata))

    @property
    def average_quality(self) -> float:
        if self.count <= 0:
            return 0.0
        return _clamp(self.quality_sum / self.count)

    def confidence(self) -> float:
        if self.count <= 0:
            return 0.0
        base = 1.0 - exp(-0.5 * self.count)
        quality_factor = 0.6 + 0.4 * self.average_quality
        return _clamp(base * quality_factor)

    def score(self) -> float:
        return self.weight * self.confidence()

    def to_edge(self, source: str, target: str) -> LinkEdge:
        return LinkEdge(
            source=source,
            target=target,
            weight=self.weight,
            confidence=self.confidence(),
            observations=self.count,
            average_quality=self.average_quality,
            interactions=self.interaction_counts,
            metadata=self.metadata,
        )

    def merge(self, edge: LinkEdge) -> None:
        self.weight = max(self.weight, edge.weight)
        self.count = max(self.count, edge.observations)
        self.quality_sum = max(self.quality_sum, edge.average_quality * edge.observations)
        for name, amount in edge.interactions.items():
            self.interaction_counts[name] = (
                self.interaction_counts.get(name, 0) + int(amount)
            )
        if edge.metadata is not None:
            self.metadata = MappingProxyType(dict(edge.metadata))


class DynamicLinkEngine:
    """Infer and maintain weighted connections between nodes."""

    def __init__(self, *, decay: float = 0.15) -> None:
        if not 0.0 < decay < 1.0:
            raise ValueError("decay must be between 0 and 1")
        self._decay = float(decay)
        self._nodes: dict[str, LinkNode] = {}
        self._edges: dict[tuple[str, str], _EdgeStats] = {}

    # ------------------------------------------------------------------
    # Node management
    # ------------------------------------------------------------------
    def upsert_node(self, node: LinkNode | Mapping[str, object]) -> LinkNode:
        candidate = self._coerce_node(node)
        self._nodes[candidate.identifier] = candidate
        return candidate

    def upsert_nodes(self, nodes: Iterable[LinkNode | Mapping[str, object]]) -> None:
        for node in nodes:
            self.upsert_node(node)

    def remove_node(self, identifier: str) -> bool:
        identifier = _normalise_identifier(identifier, field_name="identifier")
        if identifier not in self._nodes:
            return False
        self._nodes.pop(identifier)
        for key in list(self._edges):
            if identifier in key:
                self._edges.pop(key, None)
        return True

    def get_node(self, identifier: str) -> LinkNode | None:
        identifier = _normalise_identifier(identifier, field_name="identifier")
        return self._nodes.get(identifier)

    def iter_nodes(self) -> Sequence[LinkNode]:
        return tuple(self._nodes.values())

    # ------------------------------------------------------------------
    # Edge updates
    # ------------------------------------------------------------------
    def record(self, observation: LinkObservation) -> None:
        self._ensure_node(observation.source)
        self._ensure_node(observation.target)
        self._apply_observation(observation.source, observation.target, observation)
        if observation.bidirectional:
            self._apply_observation(observation.target, observation.source, observation)

    def record_many(self, observations: Iterable[LinkObservation]) -> None:
        for observation in observations:
            self.record(observation)

    def _apply_observation(
        self, source: str, target: str, observation: LinkObservation
    ) -> None:
        key = (source, target)
        stats = self._edges.get(key)
        if stats is None:
            stats = _EdgeStats()
            self._edges[key] = stats
        stats.register(observation, decay=self._decay)

    def get_edge(self, source: str, target: str) -> LinkEdge | None:
        source = _normalise_identifier(source, field_name="source")
        target = _normalise_identifier(target, field_name="target")
        stats = self._edges.get((source, target))
        if stats is None:
            return None
        return stats.to_edge(source, target)

    def remove_edge(self, source: str, target: str) -> bool:
        source = _normalise_identifier(source, field_name="source")
        target = _normalise_identifier(target, field_name="target")
        return self._edges.pop((source, target), None) is not None

    def iter_edges(self) -> Sequence[LinkEdge]:
        return tuple(
            stats.to_edge(source, target)
            for (source, target), stats in self._edges.items()
        )

    # ------------------------------------------------------------------
    # Suggestions and snapshots
    # ------------------------------------------------------------------
    def suggest_links(
        self,
        identifier: str,
        *,
        limit: int = 5,
        min_confidence: float = 0.2,
    ) -> list[LinkSuggestion]:
        identifier = _normalise_identifier(identifier, field_name="identifier")
        if identifier not in self._nodes:
            return []
        if limit <= 0:
            return []
        min_confidence = _clamp(min_confidence)
        suggestions_by_target: dict[str, LinkSuggestion] = {}
        for (source, target), stats in self._edges.items():
            if source == identifier:
                other = target
            elif target == identifier:
                other = source
            else:
                continue
            confidence = stats.confidence()
            if confidence < min_confidence:
                continue
            reasons = tuple(
                sorted(
                    (name for name in stats.interaction_counts if name),
                    key=lambda name: stats.interaction_counts[name],
                    reverse=True,
                )[:3]
            )
            suggestion = LinkSuggestion(
                source=identifier,
                target=other,
                score=stats.score(),
                confidence=confidence,
                reasons=reasons,
            )
            existing = suggestions_by_target.get(other)
            if existing is None or suggestion.score > existing.score:
                suggestions_by_target[other] = suggestion
        suggestions = sorted(
            suggestions_by_target.values(), key=lambda item: (-item.score, item.target)
        )
        return suggestions[:limit]

    def snapshot(self) -> LinkNetworkSnapshot:
        nodes = tuple(sorted(self._nodes.values(), key=lambda node: node.identifier))
        edges = tuple(
            sorted(
                (
                    stats.to_edge(source, target)
                    for (source, target), stats in self._edges.items()
                ),
                key=lambda edge: (edge.source, edge.target),
            )
        )
        return LinkNetworkSnapshot(nodes=nodes, edges=edges)

    def merge_snapshot(self, snapshot: LinkNetworkSnapshot | Mapping[str, object]) -> None:
        if isinstance(snapshot, Mapping):
            snapshot = LinkNetworkSnapshot.from_dict(snapshot)
        if not isinstance(snapshot, LinkNetworkSnapshot):
            raise TypeError("snapshot must be a LinkNetworkSnapshot or mapping")
        for node in snapshot.nodes:
            self.upsert_node(node)
        for edge in snapshot.edges:
            self._ensure_node(edge.source)
            self._ensure_node(edge.target)
            stats = self._edges.get((edge.source, edge.target))
            if stats is None:
                stats = _EdgeStats()
                self._edges[(edge.source, edge.target)] = stats
            stats.merge(edge)

    def clear(self) -> None:
        self._nodes.clear()
        self._edges.clear()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _ensure_node(self, identifier: str) -> LinkNode:
        node = self._nodes.get(identifier)
        if node is None:
            node = LinkNode(identifier=identifier)
            self._nodes[identifier] = node
        return node

    @staticmethod
    def _coerce_node(node: LinkNode | Mapping[str, object]) -> LinkNode:
        if isinstance(node, LinkNode):
            return node
        if isinstance(node, Mapping):
            identifier = _normalise_identifier(
                str(node.get("identifier") or node.get("id") or ""),
                field_name="identifier",
            )
            label_value = node.get("label") or node.get("name")
            label = None if label_value is None else str(label_value)
            metadata = node.get("metadata")
            return LinkNode(identifier=identifier, label=label, metadata=metadata)
        raise TypeError("node must be a LinkNode or mapping")
