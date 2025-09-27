"""Supercluster level coordination toolkit."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import pstdev
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ClusterPulse",
    "ClusterSnapshot",
    "ClusterProfile",
    "DynamicSuperclusterEngine",
    "SuperclusterSpec",
    "SuperclusterSnapshot",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_identifier(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = value.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(value: Mapping[str, object] | None) -> Mapping[str, object]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(value)


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _decay_weight(index: int, decay: float) -> float:
    if decay <= 0.0:
        return 1.0
    return (1.0 - decay) ** index


@dataclass(slots=True)
class ClusterProfile:
    """Canonical description of a cluster participating in a supercluster."""

    name: str
    mission: str
    weight: float = 1.0
    tags: Sequence[str] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.mission = _normalise_text(self.mission)
        self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class SuperclusterSpec:
    """Defines how clusters are assembled into a higher order constellation."""

    name: str
    narrative: str
    clusters: Sequence[str]
    cohesion_target: float = 0.65
    tags: Sequence[str] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.narrative = _normalise_text(self.narrative)
        if not self.clusters:
            raise ValueError("supercluster must reference at least one cluster")
        normalised: list[str] = []
        seen: set[str] = set()
        for cluster in self.clusters:
            identifier = _normalise_identifier(cluster)
            if identifier not in seen:
                seen.add(identifier)
                normalised.append(identifier)
        self.clusters = tuple(normalised)
        self.cohesion_target = _clamp(float(self.cohesion_target), lower=0.0, upper=1.0)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class ClusterPulse:
    """Measurement emitted by an individual cluster."""

    cluster: str
    alignment: float
    energy: float
    risk: float
    confidence: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.cluster = _normalise_identifier(self.cluster)
        self.alignment = _clamp(float(self.alignment), lower=-1.0, upper=1.0)
        self.energy = _clamp(float(self.energy), lower=0.0, upper=1.0)
        self.risk = _clamp(float(self.risk), lower=0.0, upper=1.0)
        self.confidence = _clamp(float(self.confidence), lower=0.0, upper=1.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class ClusterSnapshot:
    """Aggregated insight for a single cluster inside a supercluster."""

    name: str
    alignment: float
    energy: float
    risk: float
    momentum: float
    confidence: float
    weight: float
    samples: int
    last_seen: datetime
    tags: tuple[str, ...]
    metadata: Mapping[str, object]


@dataclass(slots=True)
class SuperclusterSnapshot:
    """Current state of a supercluster constellation."""

    name: str
    alignment: float
    energy: float
    risk: float
    cohesion: float
    cohesion_target: float
    momentum: float
    readiness: float
    updated_at: datetime
    clusters: tuple[ClusterSnapshot, ...]
    tags: tuple[str, ...]
    narrative: str
    metadata: Mapping[str, object]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "alignment": self.alignment,
            "energy": self.energy,
            "risk": self.risk,
            "cohesion": self.cohesion,
            "cohesion_target": self.cohesion_target,
            "momentum": self.momentum,
            "readiness": self.readiness,
            "updated_at": self.updated_at.isoformat(),
            "clusters": [
                {
                    "name": cluster.name,
                    "alignment": cluster.alignment,
                    "energy": cluster.energy,
                    "risk": cluster.risk,
                    "momentum": cluster.momentum,
                    "confidence": cluster.confidence,
                    "weight": cluster.weight,
                    "samples": cluster.samples,
                    "last_seen": cluster.last_seen.isoformat(),
                    "tags": list(cluster.tags),
                    "metadata": dict(cluster.metadata),
                }
                for cluster in self.clusters
            ],
            "tags": list(self.tags),
            "narrative": self.narrative,
            "metadata": dict(self.metadata),
        }


class DynamicSuperclusterEngine:
    """Manage cluster definitions and derive supercluster level telemetry."""

    def __init__(self, *, window: int = 50, decay: float = 0.12) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = int(window)
        self._decay = _clamp(float(decay), lower=0.0, upper=0.9)
        self._clusters: dict[str, ClusterProfile] = {}
        self._superclusters: dict[str, SuperclusterSpec] = {}
        self._history: dict[str, Deque[ClusterPulse]] = {}

    # ------------------------------------------------------------------
    # registration helpers

    def register_clusters(
        self,
        clusters: Iterable[ClusterProfile | Mapping[str, object]],
    ) -> None:
        for cluster in clusters:
            self.register_cluster(cluster)

    def register_cluster(
        self,
        cluster: ClusterProfile | Mapping[str, object],
    ) -> None:
        profile = (
            cluster
            if isinstance(cluster, ClusterProfile)
            else ClusterProfile(**dict(cluster))
        )
        self._clusters[profile.name] = profile
        self._history.setdefault(profile.name, deque(maxlen=self._window))

    def register_superclusters(
        self,
        superclusters: Iterable[SuperclusterSpec | Mapping[str, object]],
    ) -> None:
        for spec in superclusters:
            self.register_supercluster(spec)

    def register_supercluster(
        self,
        supercluster: SuperclusterSpec | Mapping[str, object],
    ) -> None:
        spec = (
            supercluster
            if isinstance(supercluster, SuperclusterSpec)
            else SuperclusterSpec(**dict(supercluster))
        )
        missing = [cluster for cluster in spec.clusters if cluster not in self._clusters]
        if missing:
            raise KeyError(
                f"cannot register supercluster '{spec.name}' missing clusters: {missing}"
            )
        self._superclusters[spec.name] = spec

    # ------------------------------------------------------------------
    # ingestion

    def ingest(self, pulse: ClusterPulse | Mapping[str, object]) -> None:
        record = (
            pulse
            if isinstance(pulse, ClusterPulse)
            else ClusterPulse(**dict(pulse))
        )
        if record.cluster not in self._clusters:
            raise KeyError(f"unknown cluster '{record.cluster}'")
        history = self._history.setdefault(
            record.cluster,
            deque(maxlen=self._window),
        )
        history.append(record)

    # ------------------------------------------------------------------
    # snapshots

    def snapshot(self, name: str) -> SuperclusterSnapshot:
        identifier = _normalise_identifier(name)
        try:
            spec = self._superclusters[identifier]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown supercluster '{identifier}'") from exc

        cluster_snapshots: list[ClusterSnapshot] = []
        alignment_values: list[float] = []
        momentum_values: list[float] = []
        readiness_weights: list[float] = []
        energy_total = 0.0
        risk_total = 0.0
        weight_total = 0.0

        updated_at = datetime.min.replace(tzinfo=timezone.utc)

        for cluster_name in spec.clusters:
            profile = self._clusters[cluster_name]
            history = self._history.get(cluster_name)
            readiness_weights.append(profile.weight)
            if not history:
                cluster_snapshots.append(
                    ClusterSnapshot(
                        name=cluster_name,
                        alignment=0.0,
                        energy=0.0,
                        risk=0.0,
                        momentum=0.0,
                        confidence=0.0,
                        weight=profile.weight,
                        samples=0,
                        last_seen=datetime.min.replace(tzinfo=timezone.utc),
                        tags=profile.tags,
                        metadata=profile.metadata,
                    )
                )
                continue

            weighted_alignment = 0.0
            weighted_energy = 0.0
            weighted_risk = 0.0
            weighted_confidence = 0.0
            total_weight = 0.0
            last_alignment = history[-1].alignment
            previous_alignment = history[-2].alignment if len(history) > 1 else last_alignment

            for index, record in enumerate(reversed(history)):
                weight = _decay_weight(index, self._decay) * record.confidence
                total_weight += weight
                weighted_alignment += record.alignment * weight
                weighted_energy += record.energy * weight
                weighted_risk += record.risk * weight
                weighted_confidence += record.confidence * weight

            alignment = weighted_alignment / total_weight if total_weight else 0.0
            energy = weighted_energy / total_weight if total_weight else 0.0
            risk = weighted_risk / total_weight if total_weight else 0.0
            confidence = weighted_confidence / total_weight if total_weight else 0.0
            momentum = last_alignment - previous_alignment
            last_seen = history[-1].timestamp

            alignment_values.append(alignment)
            momentum_values.append(momentum)
            energy_total += energy * profile.weight
            risk_total += risk * profile.weight
            weight_total += profile.weight

            if last_seen > updated_at:
                updated_at = last_seen

            cluster_snapshots.append(
                ClusterSnapshot(
                    name=cluster_name,
                    alignment=alignment,
                    energy=energy,
                    risk=risk,
                    momentum=momentum,
                    confidence=confidence,
                    weight=profile.weight,
                    samples=len(history),
                    last_seen=last_seen,
                    tags=profile.tags,
                    metadata=profile.metadata,
                )
            )

        if not cluster_snapshots:  # pragma: no cover - defensive guard
            raise ValueError("supercluster has no clusters to evaluate")

        alignment_avg = sum(
            snapshot.alignment * snapshot.weight for snapshot in cluster_snapshots
        ) / weight_total if weight_total else 0.0
        energy_avg = energy_total / weight_total if weight_total else 0.0
        risk_avg = risk_total / weight_total if weight_total else 0.0
        momentum_avg = sum(momentum_values) / len(momentum_values) if momentum_values else 0.0

        if len(alignment_values) > 1:
            spread = pstdev(alignment_values)
            cohesion = max(0.0, 1.0 - min(spread, 1.0))
        else:
            cohesion = 1.0 if alignment_values else 0.0

        readiness = 0.0
        if readiness_weights:
            ready_weight = sum(
                snapshot.weight
                for snapshot in cluster_snapshots
                if snapshot.samples > 0
            )
            total_weight = sum(readiness_weights)
            readiness = ready_weight / total_weight if total_weight else 0.0

        updated_at = updated_at if updated_at != datetime.min.replace(tzinfo=timezone.utc) else _utcnow()

        narrative = self._build_narrative(
            alignment=alignment_avg,
            cohesion=cohesion,
            readiness=readiness,
            spec=spec,
        )

        return SuperclusterSnapshot(
            name=spec.name,
            alignment=alignment_avg,
            energy=energy_avg,
            risk=risk_avg,
            cohesion=cohesion,
            cohesion_target=spec.cohesion_target,
            momentum=momentum_avg,
            readiness=readiness,
            updated_at=updated_at,
            clusters=tuple(cluster_snapshots),
            tags=spec.tags,
            narrative=narrative,
            metadata=spec.metadata,
        )

    def snapshot_all(self) -> tuple[SuperclusterSnapshot, ...]:
        return tuple(self.snapshot(name) for name in sorted(self._superclusters))

    # ------------------------------------------------------------------
    # utilities

    @staticmethod
    def _build_narrative(
        *,
        alignment: float,
        cohesion: float,
        readiness: float,
        spec: SuperclusterSpec,
    ) -> str:
        posture = "neutral"
        if alignment >= 0.4:
            posture = "expansive"
        elif alignment <= -0.4:
            posture = "defensive"

        cohesion_state = "cohesive" if cohesion >= spec.cohesion_target else "fractured"
        readiness_state = "ready" if readiness >= 0.7 else "forming"

        return (
            f"Supercluster '{spec.name}' is {posture}, {cohesion_state}, and {readiness_state}. "
            f"Target narrative: {spec.narrative}."
        )
