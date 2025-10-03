"""Builder that packages security posture data into deployment blueprints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_security_engine import DynamicSecurityEngine, SecurityPostureSnapshot

__all__ = ["SecurityBlueprint", "DynamicSecurityBuilder"]


@dataclass(slots=True)
class SecurityBlueprint:
    """Serializable description of the security posture and next actions."""

    domain: str
    summary: str
    metrics: Mapping[str, float]
    actions: tuple[str, ...]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "domain": self.domain,
            "summary": self.summary,
            "metrics": dict(self.metrics),
            "actions": list(self.actions),
        }


class DynamicSecurityBuilder:
    """Compile security posture snapshots into a rollout blueprint."""

    def __init__(self, *, engine: DynamicSecurityEngine | None = None) -> None:
        self._engine = engine or DynamicSecurityEngine()

    def build(
        self,
        domain: str,
        *,
        horizon_hours: int = 24,
    ) -> SecurityBlueprint:
        snapshot = self._engine.posture(domain, horizon_hours=horizon_hours)
        summary = self._summarise(snapshot)
        metrics = {
            "coverage": snapshot.coverage,
            "maturity": snapshot.maturity,
            "risk_index": snapshot.risk_index,
            "open_incidents": float(snapshot.open_incident_count),
        }
        actions = self._recommend_actions(snapshot)
        return SecurityBlueprint(
            domain=snapshot.domain,
            summary=summary,
            metrics=metrics,
            actions=tuple(actions),
        )

    # ------------------------------------------------------------------
    # helpers

    def _summarise(self, snapshot: SecurityPostureSnapshot) -> str:
        return (
            f"Risk {snapshot.risk_index:.2f} with {snapshot.open_incident_count} open incidents; "
            f"coverage {snapshot.coverage:.0%}, maturity {snapshot.maturity:.0%}"
        )

    def _recommend_actions(self, snapshot: SecurityPostureSnapshot) -> list[str]:
        actions: list[str] = []
        if snapshot.coverage < 0.7:
            actions.append("Roll out missing detections in critical systems")
        if snapshot.maturity < 0.6:
            actions.append("Automate manual response steps and add QA checks")
        if snapshot.open_incident_count:
            actions.append("Complete remediation and verification for open incidents")
        if snapshot.mean_time_to_detect_hours > 6:
            actions.append("Tune monitoring thresholds to tighten detection time")
        if not actions:
            actions.append("Maintain current controls and schedule quarterly review")
        return actions
