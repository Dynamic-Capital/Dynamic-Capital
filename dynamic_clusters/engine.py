"""Streaming-friendly dynamic clustering primitives for Dynamic Capital."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from itertools import combinations
from typing import Callable, Iterable, Mapping, Sequence

__all__ = [
    "ClusterPoint",
    "ClusterSummary",
    "ClusterAssignment",
    "ClusterSnapshot",
    "DynamicClusterEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_vector(vector: Sequence[float]) -> tuple[float, ...]:
    if isinstance(vector, (str, bytes)):
        raise TypeError("vector must be a sequence of numeric values")
    cleaned = []
    for value in vector:
        try:
            numeric = float(value)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
            raise TypeError("vector values must be numeric") from exc
        if not math.isfinite(numeric):
            raise ValueError("vector values must be finite numbers")
        cleaned.append(numeric)
    if not cleaned:
        raise ValueError("vector must contain at least one dimension")
    return tuple(cleaned)


def _coerce_weight(weight: float | int) -> float:
    try:
        numeric = float(weight)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("weight must be numeric") from exc
    if numeric <= 0.0:
        raise ValueError("weight must be positive")
    return numeric


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _euclidean_distance(lhs: Sequence[float], rhs: Sequence[float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lhs, rhs)))


@dataclass(slots=True)
class ClusterPoint:
    """Represents an incoming observation for the clustering engine."""

    vector: tuple[float, ...]
    weight: float = 1.0
    metadata: Mapping[str, object] | None = None
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.vector = _normalise_vector(self.vector)
        self.weight = _coerce_weight(self.weight)
        self.metadata = _coerce_mapping(self.metadata)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class ClusterSummary:
    """Describes a cluster centroid and its statistics."""

    id: int
    centroid: tuple[float, ...]
    weight: float
    spread: float
    count: float
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def copy(self) -> "ClusterSummary":
        return ClusterSummary(
            id=self.id,
            centroid=tuple(self.centroid),
            weight=self.weight,
            spread=self.spread,
            count=self.count,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


@dataclass(slots=True)
class ClusterAssignment:
    """Result of assigning a point to a cluster."""

    point: ClusterPoint
    cluster_id: int
    distance: float
    created: bool = False


@dataclass(slots=True)
class ClusterSnapshot:
    """Point-in-time view of the clustering state."""

    created_at: datetime
    dimension: int
    total_weight: float
    clusters: tuple[ClusterSummary, ...]

    def to_mapping(self) -> Mapping[str, object]:  # pragma: no cover - convenience
        return {
            "created_at": self.created_at.isoformat(),
            "dimension": self.dimension,
            "total_weight": self.total_weight,
            "clusters": [
                {
                    "id": cluster.id,
                    "centroid": list(cluster.centroid),
                    "weight": cluster.weight,
                    "spread": cluster.spread,
                    "count": cluster.count,
                    "created_at": cluster.created_at.isoformat(),
                    "updated_at": cluster.updated_at.isoformat(),
                }
                for cluster in self.clusters
            ],
        }


class DynamicClusterEngine:
    """Maintains dynamic clusters for streaming data."""

    def __init__(
        self,
        *,
        max_clusters: int = 12,
        distance_threshold: float = 1.5,
        merge_threshold: float | None = 0.75,
        decay: float = 0.0,
        learning_rate: float | None = None,
        clock: Callable[[], datetime] = _utcnow,
    ) -> None:
        if max_clusters <= 0:
            raise ValueError("max_clusters must be positive")
        if distance_threshold <= 0.0:
            raise ValueError("distance_threshold must be positive")
        if merge_threshold is not None and merge_threshold <= 0.0:
            raise ValueError("merge_threshold must be positive when provided")
        if decay < 0.0:
            raise ValueError("decay must be non-negative")
        if learning_rate is not None and not 0.0 < learning_rate <= 1.0:
            raise ValueError("learning_rate must be within (0, 1]")

        self.max_clusters = int(max_clusters)
        self.distance_threshold = float(distance_threshold)
        self.merge_threshold = float(merge_threshold) if merge_threshold is not None else None
        self.decay = float(decay)
        self.learning_rate = float(learning_rate) if learning_rate is not None else None
        self._clock = clock

        self._clusters: dict[int, ClusterSummary] = {}
        self._dimension: int | None = None
        self._next_cluster_id = 1
        self._min_weight = 1e-8

    def assign(self, data: ClusterPoint | Sequence[float]) -> ClusterAssignment:
        """Assign a single observation to a cluster and update state."""

        point = data if isinstance(data, ClusterPoint) else ClusterPoint(vector=data)
        vector = point.vector
        now = point.timestamp

        if self._dimension is None:
            self._dimension = len(vector)
        elif len(vector) != self._dimension:
            raise ValueError("vector dimensionality does not match existing clusters")

        self._decay_clusters(now)

        if not self._clusters:
            cluster = self._spawn_cluster(point)
            return ClusterAssignment(point=point, cluster_id=cluster.id, distance=0.0, created=True)

        best_id, best_distance = self._locate_best_cluster(vector)
        if best_id is None or best_distance > self.distance_threshold:
            assignment = self._handle_new_cluster(point)
        else:
            cluster = self._clusters[best_id]
            self._update_cluster(cluster, point, best_distance)
            assignment = ClusterAssignment(point=point, cluster_id=best_id, distance=best_distance)

        self._merge_clusters()
        return assignment

    def update(self, data: Iterable[ClusterPoint | Sequence[float]]) -> list[ClusterAssignment]:
        """Assign a batch of observations to clusters."""

        return [self.assign(point) for point in data]

    def snapshot(self) -> ClusterSnapshot:
        """Return a snapshot of the current clustering state."""

        clusters = tuple(sorted((cluster.copy() for cluster in self._clusters.values()), key=lambda c: c.id))
        dimension = self._dimension or 0
        total_weight = sum(cluster.weight for cluster in clusters)
        return ClusterSnapshot(
            created_at=self._clock(),
            dimension=dimension,
            total_weight=total_weight,
            clusters=clusters,
        )

    def reset(self) -> None:
        """Clear all clusters and restart the engine."""

        self._clusters.clear()
        self._dimension = None
        self._next_cluster_id = 1

    # ------------------------------------------------------------------
    # internal helpers

    def _decay_clusters(self, now: datetime) -> None:
        if self.decay <= 0.0 or not self._clusters:
            return
        for cluster_id in list(self._clusters):
            cluster = self._clusters[cluster_id]
            delta = max(0.0, (now - cluster.updated_at).total_seconds())
            if delta <= 0.0:
                continue
            decay_factor = math.exp(-self.decay * delta)
            cluster.weight *= decay_factor
            cluster.count *= decay_factor
            cluster.spread *= decay_factor
            cluster.updated_at = now
            if cluster.weight < self._min_weight:
                del self._clusters[cluster_id]

    def _locate_best_cluster(self, vector: Sequence[float]) -> tuple[int | None, float]:
        best_id: int | None = None
        best_distance = math.inf
        for cluster_id, cluster in self._clusters.items():
            distance = _euclidean_distance(vector, cluster.centroid)
            if cluster.spread > 0.0:
                distance /= 1.0 + cluster.spread
            if distance < best_distance:
                best_distance = distance
                best_id = cluster_id
        return best_id, best_distance

    def _spawn_cluster(self, point: ClusterPoint) -> ClusterSummary:
        cluster = ClusterSummary(
            id=self._next_cluster_id,
            centroid=point.vector,
            weight=point.weight,
            spread=0.0,
            count=point.weight,
            created_at=point.timestamp,
            updated_at=point.timestamp,
        )
        self._clusters[cluster.id] = cluster
        self._next_cluster_id += 1
        return cluster

    def _handle_new_cluster(self, point: ClusterPoint) -> ClusterAssignment:
        if len(self._clusters) < self.max_clusters:
            cluster = self._spawn_cluster(point)
            return ClusterAssignment(point=point, cluster_id=cluster.id, distance=0.0, created=True)

        weakest_id = min(self._clusters, key=lambda cid: self._clusters[cid].weight)
        cluster = self._clusters[weakest_id]
        cluster.centroid = point.vector
        cluster.weight = point.weight
        cluster.spread = 0.0
        cluster.count = point.weight
        cluster.created_at = point.timestamp
        cluster.updated_at = point.timestamp
        return ClusterAssignment(point=point, cluster_id=weakest_id, distance=0.0, created=True)

    def _update_cluster(self, cluster: ClusterSummary, point: ClusterPoint, distance: float) -> None:
        weight = point.weight
        total_weight = cluster.weight + weight
        if self.learning_rate is None:
            alpha = weight / total_weight
        else:
            alpha = self.learning_rate
        alpha = max(0.0, min(1.0, alpha))
        centroid = tuple((1.0 - alpha) * c + alpha * v for c, v in zip(cluster.centroid, point.vector))
        cluster.centroid = centroid
        cluster.weight = max(self._min_weight, total_weight if self.learning_rate is None else cluster.weight + weight)
        cluster.count += weight
        cluster.spread = (1.0 - alpha) * cluster.spread + alpha * distance
        cluster.updated_at = point.timestamp

    def _merge_clusters(self) -> None:
        if self.merge_threshold is None or len(self._clusters) < 2:
            return
        merged = True
        while merged and len(self._clusters) >= 2:
            merged = False
            ordered = sorted(self._clusters.items())
            for (id_a, cluster_a), (id_b, cluster_b) in combinations(ordered, 2):
                distance = _euclidean_distance(cluster_a.centroid, cluster_b.centroid)
                if distance <= self.merge_threshold:
                    self._merge_pair(id_a, id_b)
                    merged = True
                    break

    def _merge_pair(self, id_a: int, id_b: int) -> None:
        if id_a == id_b:
            return
        keep_id, drop_id = (id_a, id_b) if id_a < id_b else (id_b, id_a)
        keep = self._clusters[keep_id]
        drop = self._clusters.pop(drop_id)
        total_weight = keep.weight + drop.weight
        if total_weight <= self._min_weight:
            keep.weight = self._min_weight
            keep.spread = 0.0
            return
        centroid = tuple(
            (keep.centroid[i] * keep.weight + drop.centroid[i] * drop.weight) / total_weight
            for i in range(len(keep.centroid))
        )
        keep.centroid = centroid
        keep.weight = total_weight
        keep.count += drop.count
        keep.spread = max(keep.spread, drop.spread)
        keep.updated_at = max(keep.updated_at, drop.updated_at)
