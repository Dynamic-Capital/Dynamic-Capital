"""Diffusion modelling engine used to map how narratives spread between nodes."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "DiffusionNode",
    "DiffusionSignal",
    "DiffusionSnapshot",
    "DynamicDiffusionEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def _ensure_positive(value: float, *, name: str) -> float:
    numeric = float(value)
    if numeric <= 0.0:
        raise ValueError(f"{name} must be positive")
    return numeric


def _normalise_text(value: str, *, name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{name} must not be empty")
    return cleaned


def _normalise_key(value: str, *, name: str) -> str:
    return _normalise_text(value, name=name).lower()


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_connections(
    connections: Mapping[str, float] | None,
) -> MutableMapping[str, float]:
    if not connections:
        return {}
    normalised: dict[str, float] = {}
    for target, weight in connections.items():
        normalised[_normalise_key(target, name="connection target")] = _clamp_unit(
            float(weight)
        )
    return normalised


@dataclass(slots=True)
class DiffusionNode:
    """Represents a participant in the diffusion network."""

    name: str
    influence: float = 1.0
    susceptibility: float = 0.5
    retention: float = 0.65
    connections: Mapping[str, float] = field(default_factory=dict)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_key(self.name, name="node name")
        self.influence = _ensure_positive(self.influence, name="influence")
        self.susceptibility = _clamp_unit(float(self.susceptibility))
        self.retention = _clamp_unit(float(self.retention))
        self.connections = _normalise_connections(self.connections)
        self.tags = _normalise_tuple(self.tags)


@dataclass(slots=True)
class DiffusionSignal:
    """Signal describing the narrative impulse injected into the network."""

    origin: str
    intensity: float = 0.6
    coherence: float = 0.7
    novelty: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.origin = _normalise_key(self.origin, name="signal origin")
        self.intensity = _clamp_unit(float(self.intensity))
        self.coherence = _clamp_unit(float(self.coherence))
        self.novelty = _clamp_unit(float(self.novelty))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class DiffusionSnapshot:
    """Summary of the diffusion state after processing a signal."""

    timestamp: datetime
    activation_index: float
    active_nodes: tuple[str, ...]
    wavefront: tuple[tuple[str, float], ...]
    alerts: tuple[str, ...]
    recommendations: tuple[str, ...]


class DynamicDiffusionEngine:
    """Engine orchestrating diffusion propagation between registered nodes."""

    def __init__(
        self,
        *,
        decay: float = 0.15,
        diffusion_rate: float = 0.6,
        history: int = 24,
    ) -> None:
        if not 0.0 <= decay <= 1.0:
            raise ValueError("decay must be between 0 and 1")
        if not 0.0 < diffusion_rate <= 1.0:
            raise ValueError("diffusion_rate must be between 0 and 1")
        if history <= 0:
            raise ValueError("history must be positive")
        self._decay = float(decay)
        self._diffusion_rate = float(diffusion_rate)
        self._nodes: Dict[str, DiffusionNode] = {}
        self._activation: Dict[str, float] = {}
        self._history: Deque[DiffusionSnapshot] = deque(maxlen=history)

    @property
    def nodes(self) -> tuple[str, ...]:
        return tuple(sorted(self._nodes))

    @property
    def recent_snapshots(self) -> tuple[DiffusionSnapshot, ...]:
        return tuple(self._history)

    def register_node(self, node: DiffusionNode) -> None:
        self._nodes[node.name] = node
        self._activation.setdefault(node.name, 0.0)

    def register_nodes(self, nodes: Iterable[DiffusionNode]) -> None:
        for node in nodes:
            self.register_node(node)

    def connect(self, source: str, target: str, weight: float) -> None:
        source_key = _normalise_key(source, name="source")
        target_key = _normalise_key(target, name="target")
        if source_key not in self._nodes:
            raise KeyError(f"unknown source node '{source}'")
        if target_key not in self._nodes:
            raise KeyError(f"unknown target node '{target}'")
        self._nodes[source_key].connections[target_key] = _clamp_unit(float(weight))

    def reset(self) -> None:
        for key in self._activation:
            self._activation[key] = 0.0
        self._history.clear()

    def _apply_decay(self) -> None:
        for name, value in list(self._activation.items()):
            node = self._nodes.get(name)
            if node is None:
                continue
            retention = node.retention
            decayed = value * (1.0 - self._decay * (1.0 - retention))
            self._activation[name] = 0.0 if decayed < 1e-4 else decayed

    def ingest_signal(self, signal: DiffusionSignal, *, max_depth: int = 3) -> DiffusionSnapshot:
        if not self._nodes:
            raise RuntimeError("at least one node must be registered before ingesting signals")
        if signal.origin not in self._nodes:
            raise KeyError(f"unknown origin node '{signal.origin}'")
        if max_depth <= 0:
            raise ValueError("max_depth must be positive")

        self._apply_decay()

        contributions: MutableMapping[str, float] = defaultdict(float)
        frontier: list[tuple[str, float]] = []
        pending: Deque[tuple[str, float, int]] = deque(
            [(signal.origin, signal.intensity, 0)]
        )
        visited: set[tuple[str, int]] = set()

        while pending:
            node_name, intensity, depth = pending.popleft()
            state_key = (node_name, depth)
            if state_key in visited:
                continue
            visited.add(state_key)
            node = self._nodes.get(node_name)
            if node is None:
                continue

            effective = intensity * node.susceptibility * signal.coherence
            if effective > 0.0:
                contributions[node_name] += effective * node.influence
                frontier.append((node_name, effective))

            if depth >= max_depth:
                continue

            for target, weight in node.connections.items():
                if weight <= 0.0 or target not in self._nodes:
                    continue
                propagated = intensity * weight * self._diffusion_rate * signal.novelty
                if propagated < 1e-4:
                    continue
                pending.append((target, propagated, depth + 1))

        alerts: list[str] = []
        recommendations: list[str] = []

        for name, delta in contributions.items():
            previous = self._activation.get(name, 0.0)
            updated = _clamp_unit(previous + delta)
            self._activation[name] = updated
            if delta >= 0.4:
                alerts.append(f"Activation spike detected for {name}")
            if updated >= 0.7:
                recommendations.append(f"Engage {name} coalition for amplification")

        activation_index = (
            sum(self._activation.values()) / len(self._activation)
            if self._activation
            else 0.0
        )

        if activation_index >= 0.6:
            recommendations.append("Stabilise diffusion with integration resources")
        if signal.novelty >= 0.65:
            recommendations.append(
                f"Highlight emerging narrative from {signal.origin} while novelty persists"
            )

        active_nodes = tuple(
            name
            for name, value in sorted(
                self._activation.items(), key=lambda item: item[1], reverse=True
            )
            if value >= 0.35
        )

        wavefront = tuple(
            (name, round(strength, 4))
            for name, strength in sorted(frontier, key=lambda item: item[1], reverse=True)
        )

        snapshot = DiffusionSnapshot(
            timestamp=signal.timestamp,
            activation_index=round(activation_index, 4),
            active_nodes=active_nodes,
            wavefront=wavefront,
            alerts=tuple(alerts),
            recommendations=tuple(dict.fromkeys(recommendations)),
        )
        self._history.append(snapshot)
        return snapshot


__all__ = [name for name in globals() if not name.startswith("_")]
