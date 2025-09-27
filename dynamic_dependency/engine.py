"""Dynamic dependency orchestration engine."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Iterable, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "DependencyNode",
    "DependencyEdge",
    "DependencyImpulse",
    "DynamicDependencyEngine",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_key(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class DependencyNode:
    """Represents a system component with intrinsic readiness."""

    name: str
    readiness: float = 0.5
    resilience: float = 0.5
    criticality: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.readiness = _clamp(float(self.readiness))
        self.resilience = _clamp(float(self.resilience))
        self.criticality = _clamp(float(self.criticality))
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def key(self) -> str:
        return _normalise_key(self.name)


@dataclass(slots=True)
class DependencyEdge:
    """Directional relationship between upstream and downstream nodes."""

    upstream: str
    downstream: str
    weight: float = 0.5
    coupling: float = 0.5
    latency_penalty: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.upstream = _normalise_text(self.upstream)
        self.downstream = _normalise_text(self.downstream)
        if self.upstream.lower() == self.downstream.lower():
            raise ValueError("dependency edge cannot be self-referential")
        self.weight = _clamp(float(self.weight))
        self.coupling = _clamp(float(self.coupling))
        self.latency_penalty = _clamp(float(self.latency_penalty))
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def influence(self) -> float:
        return self.weight * self.coupling * (1.0 - self.latency_penalty)

    @property
    def upstream_key(self) -> str:
        return _normalise_key(self.upstream)

    @property
    def downstream_key(self) -> str:
        return _normalise_key(self.downstream)


@dataclass(slots=True)
class DependencyImpulse:
    """Signal describing a stressor or boost to propagate through the graph."""

    origin: str
    amplitude: float = 1.0
    urgency: float = 0.5
    confidence: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.origin = _normalise_text(self.origin)
        self.amplitude = _clamp(float(self.amplitude))
        self.urgency = _clamp(float(self.urgency))
        self.confidence = _clamp(float(self.confidence))
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def intensity(self) -> float:
        return self.amplitude * self.urgency * self.confidence

    @property
    def origin_key(self) -> str:
        return _normalise_key(self.origin)


class DynamicDependencyEngine:
    """Manages dependency nodes, edges, and risk propagation."""

    def __init__(self) -> None:
        self._nodes: Dict[str, DependencyNode] = {}
        self._dependents: Dict[str, list[DependencyEdge]] = {}
        self._dependencies: Dict[str, list[DependencyEdge]] = {}

    # -- registration -------------------------------------------------
    def register_node(self, node: DependencyNode | Mapping[str, object]) -> DependencyNode:
        coerced = self._coerce_node(node)
        self._nodes[coerced.key] = coerced
        self._dependents.setdefault(coerced.key, [])
        self._dependencies.setdefault(coerced.key, [])
        return coerced

    def register_nodes(self, nodes: Iterable[DependencyNode | Mapping[str, object]]) -> None:
        for node in nodes:
            self.register_node(node)

    def connect(self, edge: DependencyEdge | Mapping[str, object]) -> DependencyEdge:
        coerced = self._coerce_edge(edge)
        if coerced.upstream_key not in self._nodes:
            raise KeyError(f"unknown upstream node: {coerced.upstream}")
        if coerced.downstream_key not in self._nodes:
            raise KeyError(f"unknown downstream node: {coerced.downstream}")

        dependents = self._dependents.setdefault(coerced.upstream_key, [])
        dependencies = self._dependencies.setdefault(coerced.downstream_key, [])

        # replace existing edge if present
        for existing in dependents:
            if existing.downstream_key == coerced.downstream_key:
                dependents.remove(existing)
                break
        for existing in dependencies:
            if existing.upstream_key == coerced.upstream_key:
                dependencies.remove(existing)
                break

        dependents.append(coerced)
        dependencies.append(coerced)
        return coerced

    def connect_many(self, edges: Iterable[DependencyEdge | Mapping[str, object]]) -> None:
        for edge in edges:
            self.connect(edge)

    def disconnect(self, upstream: str, downstream: str) -> None:
        upstream_key = _normalise_key(upstream)
        downstream_key = _normalise_key(downstream)
        if upstream_key not in self._dependents or downstream_key not in self._dependencies:
            return
        self._dependents[upstream_key] = [
            edge for edge in self._dependents[upstream_key] if edge.downstream_key != downstream_key
        ]
        self._dependencies[downstream_key] = [
            edge for edge in self._dependencies[downstream_key] if edge.upstream_key != upstream_key
        ]

    # -- accessors ----------------------------------------------------
    def get_node(self, name: str) -> DependencyNode:
        key = _normalise_key(name)
        try:
            return self._nodes[key]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown node: {name}") from exc

    def nodes(self) -> Iterator[DependencyNode]:
        return iter(self._nodes.values())

    def dependencies_of(self, name: str) -> tuple[DependencyEdge, ...]:
        return tuple(self._dependencies.get(_normalise_key(name), ()))

    def dependents_of(self, name: str) -> tuple[DependencyEdge, ...]:
        return tuple(self._dependents.get(_normalise_key(name), ()))

    # -- analytics ----------------------------------------------------
    def readiness(self, name: str) -> float:
        memo: Dict[str, float] = {}
        return self._readiness_recursive(_normalise_key(name), memo, set())

    def readiness_profile(self) -> Dict[str, float]:
        memo: Dict[str, float] = {}
        for key in self._nodes:
            if key not in memo:
                self._readiness_recursive(key, memo, set())
        return {self._nodes[key].name: memo[key] for key in memo}

    def topological_order(self) -> tuple[DependencyNode, ...]:
        indegree: Dict[str, int] = {key: 0 for key in self._nodes}
        for edges in self._dependents.values():
            for edge in edges:
                indegree[edge.downstream_key] = indegree.get(edge.downstream_key, 0) + 1

        queue: Deque[str] = deque(key for key, degree in indegree.items() if degree == 0)
        ordered: list[DependencyNode] = []

        while queue:
            key = queue.popleft()
            ordered.append(self._nodes[key])
            for edge in self._dependents.get(key, ()):  # pragma: no branch - simple loop
                downstream_key = edge.downstream_key
                indegree[downstream_key] -= 1
                if indegree[downstream_key] == 0:
                    queue.append(downstream_key)

        if len(ordered) != len(self._nodes):
            raise RuntimeError("dependency graph contains a cycle")
        return tuple(ordered)

    def propagate(self, impulse: DependencyImpulse, *, attenuation: float = 0.85, max_depth: int = 5) -> Dict[str, float]:
        if attenuation <= 0.0 or attenuation > 1.0:
            raise ValueError("attenuation must be within (0, 1]")
        if max_depth < 1:
            raise ValueError("max_depth must be at least 1")

        if impulse.origin_key not in self._nodes:
            raise KeyError(f"unknown origin node: {impulse.origin}")

        impact: Dict[str, float] = {impulse.origin: impulse.intensity}
        queue: Deque[tuple[str, float, int]] = deque([(impulse.origin_key, impulse.intensity, 0)])

        while queue:
            current_key, current_intensity, depth = queue.popleft()
            if depth >= max_depth:
                continue
            for edge in self._dependents.get(current_key, ()):  # pragma: no branch - simple loop
                downstream = self._nodes[edge.downstream_key]
                propagated = current_intensity * edge.influence * attenuation
                if propagated <= 0.0:
                    continue
                impact[downstream.name] = impact.get(downstream.name, 0.0) + propagated
                queue.append((edge.downstream_key, propagated, depth + 1))

        return impact

    # -- internal helpers ---------------------------------------------
    def _coerce_node(self, node: DependencyNode | Mapping[str, object]) -> DependencyNode:
        if isinstance(node, DependencyNode):
            return node
        data = dict(node)
        return DependencyNode(**data)

    def _coerce_edge(self, edge: DependencyEdge | Mapping[str, object]) -> DependencyEdge:
        if isinstance(edge, DependencyEdge):
            return edge
        data = dict(edge)
        return DependencyEdge(**data)

    def _readiness_recursive(
        self,
        key: str,
        memo: MutableMapping[str, float],
        trail: set[str],
    ) -> float:
        if key in memo:
            return memo[key]
        if key in trail:
            raise RuntimeError("cycle detected during readiness evaluation")
        trail.add(key)

        node = self._nodes[key]
        dependencies = self._dependencies.get(key, ())
        if not dependencies:
            score = node.readiness
        else:
            weighted_sum = 0.0
            total_weight = 0.0
            for edge in dependencies:
                upstream_score = self._readiness_recursive(edge.upstream_key, memo, trail)
                weight = edge.influence or 1e-6
                weighted_sum += upstream_score * weight
                total_weight += weight
            dependency_score = weighted_sum / total_weight if total_weight else 0.0
            intrinsic = node.readiness * node.resilience
            external = dependency_score * (1.0 - node.resilience)
            penalty = (1.0 - dependency_score) * node.criticality * 0.5
            score = _clamp(intrinsic + external - penalty)

        memo[key] = score
        trail.remove(key)
        return score

