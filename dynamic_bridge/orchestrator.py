"""Bridge orchestration models for Dynamic Capital integrations."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "BridgeEndpoint",
    "BridgeHealthReport",
    "BridgeIncident",
    "BridgeLink",
    "BridgeOptimizationPlan",
    "DynamicBridgeOrchestrator",
]


_SEVERITY_WEIGHTS: Mapping[str, float] = {
    "critical": 0.7,
    "major": 0.5,
    "minor": 0.2,
    "info": 0.1,
}


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _validate_severity(severity: str) -> str:
    normalised = severity.strip().lower()
    if normalised not in _SEVERITY_WEIGHTS:
        raise ValueError(
            "severity must be one of: " + ", ".join(sorted(_SEVERITY_WEIGHTS))
        )
    return normalised


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class BridgeEndpoint:
    """Definition for a system participating in a bridge."""

    name: str
    kind: str
    environment: str
    protocol: str
    description: str = ""
    criticality: str = "medium"
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.kind = _normalise_lower(self.kind)
        self.environment = _normalise_lower(self.environment)
        self.protocol = _normalise_lower(self.protocol)
        self.description = self.description.strip()
        self.criticality = self.criticality.strip().lower() or "medium"
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class BridgeLink:
    """Bidirectional bridge between two endpoints."""

    name: str
    source: str
    target: str
    protocol: str
    expected_latency_ms: float
    latency_budget_ms: float
    reliability: float
    throughput_per_minute: float
    encryption: bool = True
    transformation: str = ""
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.source = _normalise_identifier(self.source)
        self.target = _normalise_identifier(self.target)
        self.protocol = _normalise_lower(self.protocol)
        self.expected_latency_ms = max(float(self.expected_latency_ms), 0.0)
        self.latency_budget_ms = max(float(self.latency_budget_ms), 1.0)
        self.reliability = _clamp(float(self.reliability))
        self.throughput_per_minute = max(float(self.throughput_per_minute), 0.0)
        self.transformation = self.transformation.strip()
        self.tags = _normalise_tags(self.tags)

    @property
    def latency_margin_ms(self) -> float:
        """Positive value indicates available latency budget, negative means deficit."""

        return self.latency_budget_ms - self.expected_latency_ms

    @property
    def within_latency_budget(self) -> bool:
        return self.expected_latency_ms <= self.latency_budget_ms


@dataclass(slots=True)
class BridgeIncident:
    """Operational incident affecting a specific bridge link."""

    identifier: str
    link: str
    severity: str
    summary: str
    started_at: datetime = field(default_factory=_utcnow)
    resolved_at: datetime | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.link = _normalise_identifier(self.link)
        self.severity = _validate_severity(self.severity)
        self.summary = self.summary.strip()
        if not self.summary:
            raise ValueError("summary must not be empty")
        if self.started_at.tzinfo is None:
            self.started_at = self.started_at.replace(tzinfo=timezone.utc)
        else:
            self.started_at = self.started_at.astimezone(timezone.utc)
        if self.resolved_at is not None:
            if self.resolved_at.tzinfo is None:
                self.resolved_at = self.resolved_at.replace(tzinfo=timezone.utc)
            else:
                self.resolved_at = self.resolved_at.astimezone(timezone.utc)
        if self.resolved_at and self.resolved_at < self.started_at:
            raise ValueError("resolved_at cannot be earlier than started_at")
        if self.metadata is None:
            self.metadata = {}
        elif not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")
        else:
            self.metadata = dict(self.metadata)

    @property
    def is_open(self) -> bool:
        return self.resolved_at is None

    def duration_seconds(self, *, reference: datetime | None = None) -> float:
        end_time = self.resolved_at or reference or _utcnow()
        return max((end_time - self.started_at).total_seconds(), 0.0)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "link": self.link,
            "severity": self.severity,
            "summary": self.summary,
            "started_at": self.started_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class BridgeHealthReport:
    """Aggregated health report for the bridge network."""

    generated_at: datetime
    overall_score: float
    link_scores: Mapping[str, float]
    degraded_links: tuple[str, ...]
    open_incidents: tuple[BridgeIncident, ...]
    recommended_actions: tuple[str, ...]
    metadata: Mapping[str, object] = field(default_factory=dict)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "generated_at": self.generated_at.isoformat(),
            "overall_score": self.overall_score,
            "link_scores": dict(self.link_scores),
            "degraded_links": list(self.degraded_links),
            "open_incidents": [incident.as_dict() for incident in self.open_incidents],
            "recommended_actions": list(self.recommended_actions),
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class BridgeOptimizationPlan:
    """Recommended adjustments to raise bridge health."""

    target_overall_score: float
    current_overall_score: float
    projected_overall_score: float
    prioritized_actions: tuple[str, ...]
    link_adjustments: Mapping[str, Mapping[str, float]]
    incident_resolution_ids: tuple[str, ...]
    metadata: Mapping[str, object] = field(default_factory=dict)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "target_overall_score": self.target_overall_score,
            "current_overall_score": self.current_overall_score,
            "projected_overall_score": self.projected_overall_score,
            "prioritized_actions": list(self.prioritized_actions),
            "link_adjustments": {k: dict(v) for k, v in self.link_adjustments.items()},
            "incident_resolution_ids": list(self.incident_resolution_ids),
            "metadata": dict(self.metadata),
        }


# ---------------------------------------------------------------------------
# bridge orchestrator


class DynamicBridgeOrchestrator:
    """Manages bridge endpoints, links, and operational health."""

    def __init__(self) -> None:
        self._endpoints: dict[str, BridgeEndpoint] = {}
        self._links: dict[str, BridgeLink] = {}
        self._incidents: dict[str, BridgeIncident] = {}

    # endpoint management -------------------------------------------------

    def register_endpoint(self, endpoint: BridgeEndpoint) -> None:
        self._endpoints[endpoint.name] = endpoint

    def get_endpoint(self, name: str) -> BridgeEndpoint:
        try:
            return self._endpoints[_normalise_identifier(name)]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"unknown endpoint: {name}") from exc

    # link management -----------------------------------------------------

    def register_link(self, link: BridgeLink) -> None:
        if link.source not in self._endpoints:
            raise KeyError(f"unknown bridge source endpoint: {link.source}")
        if link.target not in self._endpoints:
            raise KeyError(f"unknown bridge target endpoint: {link.target}")
        self._links[link.name] = link

    def get_link(self, name: str) -> BridgeLink:
        try:
            return self._links[_normalise_identifier(name)]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"unknown link: {name}") from exc

    # incident management -------------------------------------------------

    def record_incident(self, incident: BridgeIncident) -> None:
        if incident.link not in self._links:
            raise KeyError(f"unknown bridge link: {incident.link}")
        self._incidents[incident.identifier] = incident

    def resolve_incident(self, identifier: str, *, resolved_at: datetime | None = None) -> None:
        key = _normalise_identifier(identifier)
        try:
            incident = self._incidents[key]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"unknown incident: {identifier}") from exc
        incident.resolved_at = (resolved_at or _utcnow()).astimezone(timezone.utc)
        if incident.resolved_at < incident.started_at:
            raise ValueError("resolved_at cannot be earlier than started_at")

    # evaluation ----------------------------------------------------------

    def _link_penalty_from_latency(self, link: BridgeLink) -> float:
        if link.within_latency_budget:
            return 0.0
        deficit = link.expected_latency_ms - link.latency_budget_ms
        if link.latency_budget_ms <= 0:
            return 1.0
        ratio = deficit / link.latency_budget_ms
        return _clamp(ratio, lower=0.0, upper=1.0)

    def _link_penalty_from_incidents(self, link_name: str) -> float:
        open_incidents = [
            incident
            for incident in self._incidents.values()
            if incident.link == link_name and incident.is_open
        ]
        if not open_incidents:
            return 0.0
        severity_penalty = max(_SEVERITY_WEIGHTS[incident.severity] for incident in open_incidents)
        duration_penalty = 0.0
        for incident in open_incidents:
            hours_open = incident.duration_seconds() / 3600
            duration_penalty = max(duration_penalty, _clamp(hours_open / 12.0))
        return _clamp(severity_penalty + (duration_penalty * 0.3), upper=1.0)

    def _compute_link_score(self, link: BridgeLink) -> float:
        score = link.reliability
        latency_penalty = self._link_penalty_from_latency(link)
        incident_penalty = self._link_penalty_from_incidents(link.name)
        combined_penalty = _clamp(latency_penalty + incident_penalty, upper=1.0)
        score *= 1.0 - combined_penalty
        return round(score, 4)

    def evaluate_health(self) -> BridgeHealthReport:
        if not self._links:
            raise RuntimeError("no bridge links registered")

        link_scores: dict[str, float] = {}
        degraded_links: list[str] = []
        recommendations: list[str] = []

        for link in self._links.values():
            score = self._compute_link_score(link)
            link_scores[link.name] = score
            if score < 0.75 or not link.within_latency_budget:
                degraded_links.append(link.name)
                recommendations.append(
                    f"Stabilise link '{link.name}' between {link.source} and {link.target}: "
                    f"latency margin {link.latency_margin_ms:.0f}ms, reliability {link.reliability:.2f}."
                )

        open_incidents = tuple(
            incident
            for incident in self._incidents.values()
            if incident.is_open
        )
        if open_incidents:
            recommendations.append(
                "Resolve open bridge incidents: "
                + ", ".join(incident.identifier for incident in open_incidents)
            )

        overall_score = round(sum(link_scores.values()) / len(link_scores), 4)

        report = BridgeHealthReport(
            generated_at=_utcnow(),
            overall_score=overall_score,
            link_scores=link_scores,
            degraded_links=tuple(degraded_links),
            open_incidents=open_incidents,
            recommended_actions=tuple(recommendations),
            metadata={
                "total_links": len(link_scores),
                "total_endpoints": len(self._endpoints),
            },
        )
        return report

    # optimisation -------------------------------------------------------

    def generate_optimization_plan(
        self,
        *,
        target_overall_score: float = 0.9,
        minimum_latency_margin_ms: float = 50.0,
        target_throughput_per_minute: float | None = 600.0,
    ) -> BridgeOptimizationPlan:
        """Build an optimisation play that targets improved bridge health."""

        report = self.evaluate_health()

        adjustments: dict[str, dict[str, float]] = {}
        actions: list[str] = []

        degraded_links = {
            name
            for name, score in report.link_scores.items()
            if score < target_overall_score
        }

        for link in self._links.values():
            link_actions: dict[str, float] = {}
            score = report.link_scores[link.name]

            if link.name in degraded_links:
                if link.latency_margin_ms < minimum_latency_margin_ms:
                    target_expected = max(
                        link.latency_budget_ms - minimum_latency_margin_ms,
                        0.0,
                    )
                    if target_expected < link.expected_latency_ms:
                        link_actions["expected_latency_ms"] = round(target_expected, 2)
                        actions.append(
                            "Reduce processing latency on "
                            f"'{link.name}' to {target_expected:.0f}ms target to "
                            "recover latency headroom."
                        )

                    target_budget = max(
                        link.latency_budget_ms,
                        link.expected_latency_ms + minimum_latency_margin_ms,
                    )
                    if target_budget > link.latency_budget_ms:
                        link_actions["latency_budget_ms"] = round(target_budget, 2)
                        actions.append(
                            "Increase latency budget for "
                            f"'{link.name}' to {target_budget:.0f}ms to sustain "
                            "target margin."
                        )

                if link.reliability < target_overall_score:
                    recommended_reliability = round(
                        min(0.999, max(target_overall_score, link.reliability + 0.03)),
                        4,
                    )
                    if recommended_reliability > link.reliability:
                        link_actions["reliability"] = recommended_reliability
                        actions.append(
                            "Improve reliability for "
                            f"'{link.name}' to {recommended_reliability:.3f} via "
                            "redundancy and retry hardening."
                        )

            if (
                target_throughput_per_minute is not None
                and link.throughput_per_minute < target_throughput_per_minute
            ):
                link_actions["throughput_per_minute"] = float(
                    target_throughput_per_minute
                )
                actions.append(
                    "Scale throughput capacity for "
                    f"'{link.name}' to {target_throughput_per_minute:.0f} msgs/min."
                )

            if link_actions:
                adjustments[link.name] = link_actions

        open_incident_ids = tuple(
            incident.identifier for incident in report.open_incidents
        )
        if open_incident_ids:
            actions.append(
                "Resolve open incidents: " + ", ".join(open_incident_ids)
            )

        incidents_resolved = bool(open_incident_ids)
        if adjustments or incidents_resolved:
            projected_scores: list[float] = []
            for link in self._links.values():
                link_adjustment = adjustments.get(link.name, {})
                expected_latency = float(
                    link_adjustment.get("expected_latency_ms", link.expected_latency_ms)
                )
                latency_budget = float(
                    link_adjustment.get("latency_budget_ms", link.latency_budget_ms)
                )
                reliability = float(
                    link_adjustment.get("reliability", link.reliability)
                )

                within_budget = expected_latency <= latency_budget
                if within_budget:
                    latency_penalty = 0.0
                else:
                    deficit = expected_latency - latency_budget
                    baseline = latency_budget if latency_budget > 0 else 1.0
                    latency_penalty = _clamp(deficit / baseline)

                if incidents_resolved:
                    incident_penalty = 0.0
                else:
                    incident_penalty = self._link_penalty_from_incidents(link.name)

                combined_penalty = _clamp(latency_penalty + incident_penalty, upper=1.0)
                projected_score = round(reliability * (1.0 - combined_penalty), 4)
                projected_scores.append(projected_score)

            projected_overall_score = round(
                sum(projected_scores) / len(projected_scores), 4
            )
        else:
            projected_overall_score = report.overall_score

        metadata = {
            "links_considered": len(self._links),
            "degraded_links": len(degraded_links),
            "target_overall_score": target_overall_score,
            "minimum_latency_margin_ms": minimum_latency_margin_ms,
        }
        if target_throughput_per_minute is not None:
            metadata["target_throughput_per_minute"] = target_throughput_per_minute

        plan = BridgeOptimizationPlan(
            target_overall_score=target_overall_score,
            current_overall_score=report.overall_score,
            projected_overall_score=projected_overall_score,
            prioritized_actions=tuple(actions),
            link_adjustments={k: dict(v) for k, v in adjustments.items()},
            incident_resolution_ids=open_incident_ids,
            metadata=metadata,
        )
        return plan


__all__ = [
    "BridgeEndpoint",
    "BridgeHealthReport",
    "BridgeIncident",
    "BridgeLink",
    "BridgeOptimizationPlan",
    "DynamicBridgeOrchestrator",
]
