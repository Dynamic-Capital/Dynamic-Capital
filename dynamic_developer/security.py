"""Developer-style planning utilities for security improvements."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_security_engine import DynamicSecurityEngine, SecurityPostureSnapshot

__all__ = ["SecurityImprovementPlan", "DynamicSecurityDeveloper"]


@dataclass(slots=True)
class SecurityImprovementPlan:
    """Structured improvement backlog for a security domain."""

    domain: str
    objectives: tuple[str, ...]
    tasks: tuple[str, ...]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "domain": self.domain,
            "objectives": list(self.objectives),
            "tasks": list(self.tasks),
        }


class DynamicSecurityDeveloper:
    """Generate actionable hardening tasks based on posture signals."""

    def __init__(self, *, engine: DynamicSecurityEngine | None = None) -> None:
        self._engine = engine or DynamicSecurityEngine()

    def plan_iteration(
        self,
        domain: str,
        *,
        horizon_hours: int = 24,
        max_tasks: int = 6,
    ) -> SecurityImprovementPlan:
        snapshot = self._engine.posture(domain, horizon_hours=horizon_hours)
        objectives = self._derive_objectives(snapshot)
        tasks = self._derive_tasks(snapshot, max_tasks=max_tasks)
        return SecurityImprovementPlan(
            domain=snapshot.domain,
            objectives=tuple(objectives),
            tasks=tuple(tasks),
        )

    # ------------------------------------------------------------------
    # helpers

    def _derive_objectives(self, snapshot: SecurityPostureSnapshot) -> list[str]:
        objectives: list[str] = []
        if snapshot.coverage < 0.7:
            objectives.append("Increase telemetry coverage to >=70%")
        if snapshot.maturity < 0.6:
            objectives.append("Raise control maturity via automation and testing")
        if snapshot.mean_time_to_resolve_hours > 24:
            objectives.append("Shorten mean time to resolve below 24h")
        if snapshot.open_incident_count:
            objectives.append("Close remaining open incidents with RCA")
        if not objectives:
            objectives.append("Sustain current posture and automate reporting")
        return objectives

    def _derive_tasks(
        self,
        snapshot: SecurityPostureSnapshot,
        *,
        max_tasks: int,
    ) -> list[str]:
        tasks: list[str] = []
        if snapshot.coverage < 0.7:
            tasks.append("Deploy missing detections in priority attack paths")
        if snapshot.maturity < 0.6:
            tasks.append("Schedule purple-team exercise to validate controls")
        if snapshot.mean_time_to_detect_hours > 6:
            tasks.append("Tune alert thresholds to reduce detection latency")
        if snapshot.mean_time_to_resolve_hours > 24:
            tasks.append("Automate containment playbooks for top incidents")
        if snapshot.critical_incident_count:
            tasks.append("Run post-incident review on critical cases")
        if not tasks:
            tasks.append("Review dashboards and document current security posture")
        if max_tasks >= 0:
            tasks = tasks[:max_tasks]
        return tasks
