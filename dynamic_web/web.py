"""Dynamic web orchestration utilities for engagement topologies."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Dict, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicWebError",
    "NodeNotFoundError",
    "LinkNotFoundError",
    "WebNode",
    "WebLink",
    "WebPulse",
    "WebSnapshot",
    "DynamicWebNetwork",
]


# ---------------------------------------------------------------------------
# helpers & errors


class DynamicWebError(RuntimeError):
    """Base error for dynamic web failures."""


class NodeNotFoundError(DynamicWebError):
    """Raised when an operation references an unknown node."""


class LinkNotFoundError(DynamicWebError):
    """Raised when a link lookup fails."""


_DEF_DECAY = 0.78
_MIN_FLOAT = 1e-9


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_mapping(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise DynamicWebError("metadata must be a mapping")
    return dict(metadata)


def _normalise_identifier(value: str) -> str:
    identifier = str(value).strip()
    if not identifier:
        raise DynamicWebError("identifier must not be empty")
    return identifier


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if values is None:
        return ()
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        tag = value.strip().lower()
        if tag and tag not in seen:
            seen.add(tag)
            cleaned.append(tag)
    return tuple(cleaned)


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class WebNode:
    """Definition of a node in the dynamic engagement web."""

    identifier: str
    label: str | None = None
    importance: float = 1.0
    capacity: float = 1.0
    activation_threshold: float = 0.05
    latency_budget_ms: float = 250.0
    metadata: Mapping[str, object] | None = None
    tags: Sequence[str] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.label = self.label.strip() if isinstance(self.label, str) and self.label.strip() else None
        self.importance = max(float(self.importance), 0.0)
        self.capacity = max(float(self.capacity), 0.0)
        self.activation_threshold = max(float(self.activation_threshold), 0.0)
        self.latency_budget_ms = max(float(self.latency_budget_ms), 0.0)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class WebLink:
    """Directional edge between two web nodes."""

    source: str
    target: str
    weight: float = 1.0
    reliability: float = 1.0
    latency_ms: float = 15.0
    bandwidth: float = 3.0
    damping: float = 0.05
    metadata: Mapping[str, object] | None = None
    tags: Sequence[str] | None = None

    def __post_init__(self) -> None:
        self.source = _normalise_identifier(self.source)
        self.target = _normalise_identifier(self.target)
        if self.source == self.target:
            raise DynamicWebError("links must connect distinct nodes")
        self.weight = max(float(self.weight), 0.0)
        self.reliability = _clamp01(self.reliability)
        self.latency_ms = max(float(self.latency_ms), 0.0)
        self.bandwidth = max(float(self.bandwidth), 0.0)
        self.damping = max(float(self.damping), 0.0)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True, frozen=True)
class WebPulse:
    """Represents a recorded pulse event within the web."""

    name: str
    origin: str
    intensity: float
    created_at: datetime
    metadata: Mapping[str, object]


@dataclass(slots=True, frozen=True)
class WebSnapshot:
    """Read-only capture of a broadcast across the web."""

    timestamp: datetime
    origin: str
    intensity: float
    reached: Mapping[str, float]
    path_map: Mapping[str, tuple[str, ...]]
    max_depth: int
    visited: int
    coverage_score: float
    unresolved: tuple[str, ...]
    metadata: Mapping[str, object]


# ---------------------------------------------------------------------------
# main network primitive


class DynamicWebNetwork:
    """Maintains a dynamic activation graph with propagation analytics."""

    def __init__(self, *, decay_factor: float = _DEF_DECAY) -> None:
        if decay_factor <= 0.0 or decay_factor > 1.0:
            raise DynamicWebError("decay_factor must be in the range (0, 1]")
        self.decay_factor = float(decay_factor)
        self.nodes: Dict[str, WebNode] = {}
        self._adjacency: Dict[str, Dict[str, WebLink]] = {}
        self.events: list[WebPulse] = []
        self.history: list[WebSnapshot] = []

    # ------------------------------------------------------------------ helpers
    def _ensure_node(self, node: WebNode | Mapping[str, object]) -> WebNode:
        if isinstance(node, WebNode):
            return node
        if not isinstance(node, Mapping):  # pragma: no cover - defensive
            raise DynamicWebError("node must be WebNode or mapping")
        return WebNode(**node)

    def _ensure_link(self, link: WebLink | Mapping[str, object]) -> WebLink:
        if isinstance(link, WebLink):
            return link
        if not isinstance(link, Mapping):  # pragma: no cover - defensive
            raise DynamicWebError("link must be WebLink or mapping")
        return WebLink(**link)

    def _assert_node_exists(self, identifier: str) -> None:
        if identifier not in self.nodes:
            raise NodeNotFoundError(f"unknown node: {identifier}")

    # ------------------------------------------------------------------ mutation
    def upsert_node(self, node: WebNode | Mapping[str, object]) -> WebNode:
        record = self._ensure_node(node)
        self.nodes[record.identifier] = record
        self._adjacency.setdefault(record.identifier, {})
        return record

    def remove_node(self, identifier: str) -> None:
        identifier = _normalise_identifier(identifier)
        if identifier not in self.nodes:
            raise NodeNotFoundError(f"unknown node: {identifier}")
        del self.nodes[identifier]
        self._adjacency.pop(identifier, None)
        for edges in self._adjacency.values():
            edges.pop(identifier, None)

    def link_nodes(self, link: WebLink | Mapping[str, object], *, bidirectional: bool = False) -> tuple[WebLink, ...]:
        record = self._ensure_link(link)
        self._assert_node_exists(record.source)
        self._assert_node_exists(record.target)
        self._adjacency.setdefault(record.source, {})[record.target] = record
        results: list[WebLink] = [record]
        if bidirectional:
            mirror = WebLink(
                source=record.target,
                target=record.source,
                weight=record.weight,
                reliability=record.reliability,
                latency_ms=record.latency_ms,
                bandwidth=record.bandwidth,
                damping=record.damping,
                metadata=record.metadata,
                tags=record.tags,
            )
            self._adjacency.setdefault(mirror.source, {})[mirror.target] = mirror
            results.append(mirror)
        return tuple(results)

    def unlink_nodes(self, source: str, target: str) -> None:
        source = _normalise_identifier(source)
        target = _normalise_identifier(target)
        if source not in self._adjacency or target not in self._adjacency[source]:
            raise LinkNotFoundError(f"link {source}->{target} does not exist")
        del self._adjacency[source][target]

    # ------------------------------------------------------------------ analytics
    def neighbours(self, identifier: str) -> tuple[str, ...]:
        identifier = _normalise_identifier(identifier)
        self._assert_node_exists(identifier)
        return tuple(self._adjacency.get(identifier, {}))

    def node_reachability(self, identifier: str, *, max_depth: int | None = None) -> float:
        identifier = _normalise_identifier(identifier)
        self._assert_node_exists(identifier)
        if len(self.nodes) <= 1:
            return 0.0
        depth_limit = max_depth if max_depth is not None else len(self.nodes)
        visited: set[str] = set()
        queue = deque([(identifier, 0)])
        while queue:
            node_id, depth = queue.popleft()
            if node_id in visited:
                continue
            visited.add(node_id)
            if depth >= depth_limit:
                continue
            queue.extend((child, depth + 1) for child in self._adjacency.get(node_id, ()))
        return max(0.0, (len(visited) - 1) / (len(self.nodes) - 1))

    def resilience_index(self) -> float:
        total_weight = 0.0
        weighted = 0.0
        for edges in self._adjacency.values():
            for link in edges.values():
                weight = max(link.weight, _MIN_FLOAT)
                total_weight += weight
                weighted += weight * link.reliability * max(0.0, 1.0 - link.damping)
        if total_weight <= 0.0:
            return 0.0
        return weighted / total_weight

    # ------------------------------------------------------------------ events
    def record_event(
        self,
        name: str,
        *,
        origin: str,
        intensity: float,
        metadata: Mapping[str, object] | None = None,
    ) -> WebPulse:
        origin = _normalise_identifier(origin)
        self._assert_node_exists(origin)
        pulse = WebPulse(
            name=_normalise_identifier(name),
            origin=origin,
            intensity=max(float(intensity), 0.0),
            created_at=_utcnow(),
            metadata=MappingProxyType(_ensure_mapping(metadata)),
        )
        self.events.append(pulse)
        return pulse

    # ------------------------------------------------------------------ broadcast
    def broadcast(
        self,
        origin: str,
        intensity: float,
        *,
        max_depth: int = 4,
        decay_factor: float | None = None,
        metadata: Mapping[str, object] | None = None,
        record_event: bool = True,
    ) -> WebSnapshot:
        origin = _normalise_identifier(origin)
        self._assert_node_exists(origin)
        if max_depth < 0:
            raise DynamicWebError("max_depth must be non-negative")
        base_intensity = max(float(intensity), 0.0)
        decay = self.decay_factor if decay_factor is None else float(decay_factor)
        if decay <= 0.0 or decay > 1.0:
            raise DynamicWebError("decay_factor must be in the range (0, 1]")

        queue = deque([(origin, base_intensity, 0, (origin,))])
        delivered: Dict[str, float] = {}
        path_map: Dict[str, tuple[str, ...]] = {}

        while queue:
            node_id, current_intensity, depth, path = queue.popleft()
            node = self.nodes[node_id]
            # compute delivered intensity respecting capacity and threshold
            available = max(current_intensity * node.importance, 0.0)
            delivered_intensity = min(available, node.capacity)
            if delivered_intensity < node.activation_threshold:
                delivered_intensity = 0.0

            previous = delivered.get(node_id)
            if previous is not None and delivered_intensity <= previous + _MIN_FLOAT:
                continue
            delivered[node_id] = delivered_intensity
            path_map[node_id] = path

            if delivered_intensity <= 0.0 or depth >= max_depth:
                continue

            edges = self._adjacency.get(node_id, {})
            if not edges:
                continue

            for neighbour, link in edges.items():
                base_transfer = delivered_intensity * link.weight
                if base_transfer <= 0.0:
                    continue
                reliability = max(link.reliability, 0.0)
                next_intensity = base_transfer * reliability
                if link.latency_ms > 0.0:
                    latency_penalty = max(0.0, 1.0 - (link.latency_ms / (link.latency_ms + node.latency_budget_ms + 1.0)))
                    next_intensity *= latency_penalty
                if link.bandwidth > 0.0:
                    next_intensity = min(next_intensity, link.bandwidth)
                next_intensity *= max(0.0, 1.0 - link.damping)
                next_intensity *= decay
                if next_intensity <= _MIN_FLOAT:
                    continue
                queue.append((neighbour, next_intensity, depth + 1, path + (neighbour,)))

        unresolved = tuple(sorted(node_id for node_id in self.nodes if node_id not in delivered))
        total_capacity = sum(node.capacity for node in self.nodes.values()) or 1.0
        coverage_score = sum(delivered.values()) / total_capacity

        snapshot = WebSnapshot(
            timestamp=_utcnow(),
            origin=origin,
            intensity=base_intensity,
            reached=MappingProxyType(dict(sorted(delivered.items()))),
            path_map=MappingProxyType({key: tuple(value) for key, value in path_map.items()}),
            max_depth=max_depth,
            visited=len(delivered),
            coverage_score=coverage_score,
            unresolved=unresolved,
            metadata=MappingProxyType(_ensure_mapping(metadata)),
        )
        self.history.append(snapshot)

        if record_event:
            self.record_event(
                name=f"pulse:{origin}",
                origin=origin,
                intensity=base_intensity,
                metadata={"snapshot_ts": snapshot.timestamp.isoformat()},
            )
        return snapshot


