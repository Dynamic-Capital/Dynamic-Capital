"""Dynamic supercluster orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_superclusters.engine import (
    ClusterProfile,
    ClusterPulse,
    DynamicSuperclusterEngine,
    SuperclusterSnapshot,
    SuperclusterSpec,
)

__all__ = ["SuperclusterAgentInsight", "DynamicSuperclusterAgent"]


@dataclass(slots=True)
class SuperclusterAgentInsight:
    raw: AgentInsight
    snapshot: SuperclusterSnapshot


class DynamicSuperclusterAgent:
    """Coordinate :class:`DynamicSuperclusterEngine` evaluations."""

    domain = "Dynamic Superclusters"

    def __init__(self, *, engine: DynamicSuperclusterEngine | None = None) -> None:
        self._engine = engine or DynamicSuperclusterEngine()
        self._default_supercluster: str | None = None

    @property
    def engine(self) -> DynamicSuperclusterEngine:
        return self._engine

    def register_cluster(self, cluster: ClusterProfile | Mapping[str, object]) -> None:
        self._engine.register_cluster(cluster)

    def register_supercluster(self, spec: SuperclusterSpec | Mapping[str, object]) -> None:
        self._engine.register_supercluster(spec)
        self._default_supercluster = self._default_supercluster or spec.name

    def ingest(self, pulse: ClusterPulse | Mapping[str, object]) -> None:
        self._engine.ingest(pulse)

    def _resolve_target(self, target: str | None) -> str:
        name = target or self._default_supercluster
        if not name:
            raise ValueError("no supercluster registered; call register_supercluster first")
        return name

    def generate_insight(self, *, supercluster: str | None = None) -> AgentInsight:
        name = self._resolve_target(supercluster)
        snapshot = self._engine.snapshot(name)
        metrics = {
            "alignment": float(snapshot.alignment),
            "energy": float(snapshot.energy),
            "risk": float(snapshot.risk),
            "cohesion": float(snapshot.cohesion),
            "readiness": float(snapshot.readiness),
            "momentum": float(snapshot.momentum),
        }
        highlights = [snapshot.narrative]
        details = {"snapshot": snapshot}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title=f"Supercluster {snapshot.name} Overview",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self, *, supercluster: str | None = None) -> SuperclusterAgentInsight:
        raw = self.generate_insight(supercluster=supercluster)
        snapshot = raw.details.get("snapshot") if raw.details else None
        if not isinstance(snapshot, SuperclusterSnapshot):
            snapshot = self._engine.snapshot(self._resolve_target(supercluster))
        return SuperclusterAgentInsight(raw=raw, snapshot=snapshot)
