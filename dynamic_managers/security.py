"""Security management utilities built on the Dynamic Security Engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_security_engine import DynamicSecurityEngine, SecurityPostureSnapshot

__all__ = ["SecurityDomainScore", "DynamicSecurityManager"]


@dataclass(slots=True)
class SecurityDomainScore:
    """Aggregated posture data for managerial scorecards."""

    name: str
    risk_index: float
    coverage: float
    maturity: float
    open_incidents: int
    critical_incidents: int

    def to_dict(self) -> Mapping[str, float | int | str]:
        return {
            "domain": self.name,
            "risk_index": round(self.risk_index, 4),
            "coverage": round(self.coverage, 4),
            "maturity": round(self.maturity, 4),
            "open_incidents": self.open_incidents,
            "critical_incidents": self.critical_incidents,
        }


class DynamicSecurityManager:
    """Prioritise remediation focus across security domains."""

    def __init__(self, *, engine: DynamicSecurityEngine | None = None) -> None:
        self._engine = engine or DynamicSecurityEngine()

    @property
    def engine(self) -> DynamicSecurityEngine:
        return self._engine

    def build_scorecard(
        self,
        *,
        horizon_hours: int = 24,
        limit: int | None = None,
    ) -> tuple[SecurityDomainScore, ...]:
        scores: list[SecurityDomainScore] = []
        for domain in self._engine.domains:
            snapshot = self._engine.posture(domain, horizon_hours=horizon_hours)
            scores.append(self._score_from_snapshot(snapshot))
        scores.sort(key=lambda item: item.risk_index, reverse=True)
        if limit is not None:
            scores = scores[: max(limit, 0)]
        return tuple(scores)

    def summary(self, *, horizon_hours: int = 24) -> Mapping[str, object]:
        aggregate = self._engine.aggregate_posture(horizon_hours=horizon_hours)
        scorecard = self.build_scorecard(horizon_hours=horizon_hours)
        return {
            "aggregate": {
                "risk_index": round(aggregate.risk_index, 4),
                "coverage": round(aggregate.coverage, 4),
                "maturity": round(aggregate.maturity, 4),
                "open_incidents": aggregate.open_incident_count,
                "critical_incidents": aggregate.critical_incident_count,
            },
            "domains": [score.to_dict() for score in scorecard],
        }

    def prioritise_domains(
        self, *, horizon_hours: int = 24, threshold: float = 0.5
    ) -> tuple[str, ...]:
        scorecard = self.build_scorecard(horizon_hours=horizon_hours)
        return tuple(score.name for score in scorecard if score.risk_index >= threshold)

    # ------------------------------------------------------------------
    # helpers

    def _score_from_snapshot(
        self, snapshot: SecurityPostureSnapshot
    ) -> SecurityDomainScore:
        return SecurityDomainScore(
            name=snapshot.domain,
            risk_index=snapshot.risk_index,
            coverage=snapshot.coverage,
            maturity=snapshot.maturity,
            open_incidents=snapshot.open_incident_count,
            critical_incidents=snapshot.critical_incident_count,
        )
