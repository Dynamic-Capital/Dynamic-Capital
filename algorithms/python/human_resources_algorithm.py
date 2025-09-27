"""Dynamic HR alignment algorithms for workforce operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Literal, Mapping, Optional, Sequence, Tuple

from .desk_sync import TeamRolePlaybook
from .human_resources_playbooks import build_human_resources_playbooks

Severity = Literal["low", "medium", "high"]
Priority = Literal["low", "medium", "high"]

DEFAULT_ROLE_MAP: Mapping[str, Tuple[str, ...]] = {
    "attrition_rate": ("People Operations", "People Development"),
    "retention_risk": ("People Development",),
    "headcount_gap": ("Talent Acquisition", "People Operations"),
    "offer_acceptance_rate": ("Talent Acquisition",),
    "time_to_fill": ("Talent Acquisition",),
    "payroll_variance": ("Total Rewards", "People Operations"),
    "compensation_budget": ("Total Rewards",),
    "engagement_index": ("People Development",),
    "onboarding_sla": ("People Operations",),
}


def _slugify(value: str) -> str:
    slug = "".join(ch.lower() if ch.isalnum() else "_" for ch in value)
    parts = [part for part in slug.split("_") if part]
    return "_".join(parts) or value.lower()


@dataclass(slots=True)
class HRMetricSnapshot:
    """Point-in-time reading for a workforce metric."""

    name: str
    value: float
    target: float
    unit: str = ""
    favourable_direction: Literal["above", "below", "within"] = "above"
    tolerance: Optional[float] = None
    description: Optional[str] = None
    key: Optional[str] = None

    def identifier(self) -> str:
        return self.key or _slugify(self.name)

    def delta(self) -> float:
        return self.value - self.target

    def delta_pct(self) -> float:
        denominator = self.target if self.target else (abs(self.value) or 1.0)
        return self.delta() / denominator if denominator else 0.0

    def gap_ratio(self) -> float:
        ratio = self.delta_pct()

        if self.favourable_direction == "above":
            return max(0.0, -ratio)
        if self.favourable_direction == "below":
            return max(0.0, ratio)
        return abs(ratio)

    def direction(self) -> str:
        return "above" if self.delta() >= 0 else "below"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "target": self.target,
            "unit": self.unit,
            "favourable_direction": self.favourable_direction,
            "tolerance": self.tolerance,
            "description": self.description,
            "key": self.key,
        }


@dataclass(slots=True)
class HRInsight:
    """Diagnostic narrative for an HR metric."""

    metric: HRMetricSnapshot
    severity: Severity
    gap_ratio: float
    delta: float
    delta_pct: float
    narrative: str
    drivers: list[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric": self.metric.to_dict(),
            "severity": self.severity,
            "gap_ratio": self.gap_ratio,
            "delta": self.delta,
            "delta_pct": self.delta_pct,
            "narrative": self.narrative,
            "drivers": list(self.drivers),
        }


@dataclass(slots=True)
class HRAction:
    """Actionable step assigned to an HR playbook owner."""

    owner: str
    description: str
    priority: Priority
    related_metrics: Tuple[str, ...] = ()
    tags: Tuple[str, ...] = ()
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "owner": self.owner,
            "description": self.description,
            "priority": self.priority,
            "related_metrics": list(self.related_metrics),
            "tags": list(self.tags),
            "notes": self.notes,
        }


@dataclass(slots=True)
class HRAlignmentPlan:
    """Composite view of HR insights and recommended actions."""

    summary: str
    insights: list[HRInsight]
    actions: list[HRAction]
    playbooks: Dict[str, TeamRolePlaybook]
    metrics: list[HRMetricSnapshot]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary,
            "insights": [insight.to_dict() for insight in self.insights],
            "actions": [action.to_dict() for action in self.actions],
            "playbooks": {
                name: {
                    "objectives": list(playbook.objectives),
                    "workflow": list(playbook.workflow),
                    "outputs": list(playbook.outputs),
                    "kpis": list(playbook.kpis),
                }
                for name, playbook in self.playbooks.items()
            },
            "metrics": [metric.to_dict() for metric in self.metrics],
            "metadata": dict(self.metadata),
        }


class DynamicHRAlignmentAlgorithm:
    """Analyses HR metrics and maps actions to human resources playbooks."""

    def __init__(
        self,
        playbooks: Optional[Mapping[str, TeamRolePlaybook]] = None,
        *,
        default_tolerance: float = 0.05,
        severity_overrides: Optional[Mapping[str, Tuple[float, float]]] = None,
        metric_role_map: Optional[Mapping[str, Sequence[str]]] = None,
    ) -> None:
        self._playbooks = dict(playbooks or build_human_resources_playbooks())
        self._default_tolerance = default_tolerance
        self._severity_overrides = {
            key: (max(0.0, warn), max(max(0.0, warn), crit))
            for key, (warn, crit) in (severity_overrides or {}).items()
        }
        self._metric_role_map = {
            key: tuple(value)
            for key, value in (metric_role_map or DEFAULT_ROLE_MAP).items()
        }

    @property
    def playbooks(self) -> Mapping[str, TeamRolePlaybook]:
        return dict(self._playbooks)

    def generate(
        self,
        metrics: Sequence[HRMetricSnapshot],
        *,
        focus_roles: Optional[Iterable[str]] = None,
        incidents: Optional[Sequence[str]] = None,
        commitments: Optional[Mapping[str, Sequence[str]]] = None,
    ) -> HRAlignmentPlan:
        """Return an alignment plan describing HR priorities."""

        selected = self._select_playbooks(focus_roles)
        focus_names = tuple(selected)

        insights: list[HRInsight] = []
        severity_counts = {"low": 0, "medium": 0, "high": 0}

        for metric in metrics:
            severity, gap_ratio, delta, delta_pct = self._classify_metric(metric)
            severity_counts[severity] += 1
            narrative = self._build_narrative(metric, severity, delta_pct)
            insights.append(
                HRInsight(
                    metric=metric,
                    severity=severity,
                    gap_ratio=gap_ratio,
                    delta=delta,
                    delta_pct=delta_pct,
                    narrative=narrative,
                )
            )

        actions = self._build_actions(
            insights,
            selected,
            commitments or {},
            incidents or (),
        )

        summary = self._summarise(severity_counts, actions)
        metadata: Dict[str, Any] = {
            "metric_count": len(metrics),
            "focus_roles": list(focus_names),
            "severe_count": severity_counts["high"],
            "warning_count": severity_counts["medium"],
        }
        if incidents:
            metadata["incidents"] = list(incidents)
        if commitments:
            metadata["commitments"] = {
                name: list(notes) for name, notes in commitments.items()
            }

        return HRAlignmentPlan(
            summary=summary,
            insights=insights,
            actions=actions,
            playbooks=selected,
            metrics=list(metrics),
            metadata=metadata,
        )

    def _select_playbooks(
        self, focus_roles: Optional[Iterable[str]]
    ) -> Dict[str, TeamRolePlaybook]:
        if focus_roles is None:
            return dict(sorted(self._playbooks.items()))

        focus_tuple = tuple(focus_roles)
        missing = [name for name in focus_tuple if name not in self._playbooks]
        if missing:
            raise KeyError(f"Unknown playbook(s): {', '.join(sorted(missing))}")

        return {name: self._playbooks[name] for name in focus_tuple}

    def _classify_metric(
        self, metric: HRMetricSnapshot
    ) -> Tuple[Severity, float, float, float]:
        metric_id = metric.identifier()
        warn, critical = self._resolve_thresholds(metric_id, metric)
        gap_ratio = metric.gap_ratio()
        delta = metric.delta()
        delta_pct = metric.delta_pct()

        if gap_ratio >= critical:
            return "high", gap_ratio, delta, delta_pct
        if gap_ratio >= warn:
            return "medium", gap_ratio, delta, delta_pct
        return "low", gap_ratio, delta, delta_pct

    def _resolve_thresholds(
        self, metric_id: str, metric: HRMetricSnapshot
    ) -> Tuple[float, float]:
        if metric_id in self._severity_overrides:
            return self._severity_overrides[metric_id]

        tolerance = metric.tolerance if metric.tolerance is not None else self._default_tolerance
        return max(0.0, tolerance), max(0.0, tolerance * 2)

    def _build_narrative(
        self, metric: HRMetricSnapshot, severity: Severity, delta_pct: float
    ) -> str:
        direction = metric.direction()
        magnitude = abs(delta_pct)

        if metric.favourable_direction == "within":
            if severity == "low":
                return f"{metric.name} is operating within the agreed tolerance band."
            return (
                f"{metric.name} is {magnitude:.1%} outside the acceptable range "
                f"({direction} target)."
            )

        verb = "ahead of" if direction == "above" else "behind"
        if metric.favourable_direction == "below":
            verb = "exceeding" if direction == "above" else "below"

        if severity == "low":
            return f"{metric.name} is {verb} the target by {magnitude:.1%}."

        qualifier = "critical" if severity == "high" else "elevated"
        return (
            f"{metric.name} shows a {qualifier} variance of {magnitude:.1%} {direction} the target."
        )

    def _build_actions(
        self,
        insights: Sequence[HRInsight],
        playbooks: Mapping[str, TeamRolePlaybook],
        commitments: Mapping[str, Sequence[str]],
        incidents: Sequence[str],
    ) -> list[HRAction]:
        priority_order = {"high": 0, "medium": 1, "low": 2}
        actions: list[HRAction] = []

        for insight in insights:
            if insight.severity == "low":
                continue

            roles = self._metric_role_map.get(
                insight.metric.identifier(), tuple(playbooks)
            )
            related_roles = [role for role in roles if role in playbooks]
            if not related_roles:
                related_roles = list(playbooks)

            description_suffix = insight.narrative
            for role in related_roles:
                workflow_hint = next(iter(playbooks[role].workflow), None)
                description = description_suffix
                if workflow_hint:
                    description = f"{description_suffix} Activate: {workflow_hint}."

                actions.append(
                    HRAction(
                        owner=role,
                        description=description,
                        priority="high" if insight.severity == "high" else "medium",
                        related_metrics=(insight.metric.name,),
                    )
                )

        for role, notes in commitments.items():
            if role not in playbooks:
                continue
            for note in notes:
                actions.append(
                    HRAction(
                        owner=role,
                        description=note,
                        priority="medium",
                        related_metrics=(),
                        tags=("commitment",),
                    )
                )

        if incidents:
            owner = next(iter(playbooks), "People Operations")
            incident_text = ", ".join(incidents)
            actions.append(
                HRAction(
                    owner=owner,
                    description=f"Coordinate triage for incidents: {incident_text}.",
                    priority="high",
                    related_metrics=(),
                    tags=("incident",),
                )
            )

        actions.sort(key=lambda action: (priority_order[action.priority], action.owner))
        return actions

    def _summarise(self, severity_counts: Mapping[str, int], actions: Sequence[HRAction]) -> str:
        if severity_counts["high"]:
            owners = sorted({action.owner for action in actions if action.priority == "high"})
            owner_text = ", ".join(owners) if owners else "HR"
            return (
                f"Resolve {severity_counts['high']} critical HR variance(s) led by {owner_text}."
            )

        if severity_counts["medium"]:
            owners = sorted({action.owner for action in actions if action.priority == "medium"})
            owner_text = ", ".join(owners) if owners else "HR"
            return (
                f"Address {severity_counts['medium']} elevated HR warning(s) with {owner_text}."
            )

        return "HR metrics are operating within agreed tolerances."


__all__ = [
    "DynamicHRAlignmentAlgorithm",
    "HRAlignmentPlan",
    "HRAction",
    "HRInsight",
    "HRMetricSnapshot",
]
