"""Domain-agnostic Dynamic Core models for DAI, DAGI, and DAGS."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from heapq import nlargest
from math import isfinite
from numbers import Integral, Real
from types import MappingProxyType
from typing import ClassVar, Deque, Iterable, Mapping, Sequence

__all__ = [
    "CoreMetricDefinition",
    "CoreMetricStatus",
    "CoreSnapshot",
    "CoreBlueprint",
    "BlueprintBackedCoreModel",
    "CORE_BLUEPRINTS",
    "CORE_MODEL_FACTORIES",
    "build_core_model",
    "build_all_core_models",
    "DynamicCoreModel",
    "DynamicAICoreModel",
    "DynamicAGICoreModel",
    "DynamicAGSCoreModel",
    "DynamicETLCoreModel",
    "DynamicDCMCoreModel",
    "DynamicDCHCoreModel",
    "DynamicDCRCoreModel",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, allow_empty: bool = False) -> str:
    text = str(value).strip()
    if not text and not allow_empty:
        raise ValueError("value must not be empty")
    return text


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = _normalise_text(tag)
        lower = cleaned.lower()
        if lower not in seen:
            seen.add(lower)
            normalised.append(lower)
    return tuple(normalised)


def _freeze_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if isinstance(mapping, MappingProxyType):
        return mapping
    if not isinstance(mapping, Mapping):
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(mapping))


def _normalise_window(value: object) -> int:
    if isinstance(value, bool):
        raise TypeError("window must be an integer >= 2")
    if isinstance(value, Integral):
        numeric = int(value)
    elif isinstance(value, Real):
        float_value = float(value)
        if not isfinite(float_value) or not float_value.is_integer():
            raise TypeError("window must be an integer >= 2")
        numeric = int(float_value)
    else:
        raise TypeError("window must be an integer >= 2")
    if numeric < 2:
        raise ValueError("window must be >= 2")
    return numeric


def _clamp(value: float, *, floor: float, ceiling: float) -> float:
    if not isfinite(floor) or not isfinite(ceiling):
        raise ValueError("floor and ceiling must be finite numbers")
    if floor > ceiling:
        raise ValueError("floor must be <= ceiling")
    if isinstance(value, bool):
        raise TypeError("metric values must be numeric")
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("metric values must be numeric") from exc
    if not isfinite(numeric):
        raise ValueError("metric values must be finite")
    if numeric < floor:
        return floor
    if numeric > ceiling:
        return ceiling
    return numeric


def _normalise_orientation(value: str) -> str:
    orientation = _normalise_text(value).lower()
    if orientation in {"higher", "high", "up"}:
        return "higher"
    if orientation in {"lower", "low", "down"}:
        return "lower"
    raise ValueError("orientation must be 'higher' or 'lower'")


@dataclass(slots=True, frozen=True)
class CoreMetricDefinition:
    """Static definition describing a Dynamic Core metric."""

    key: str
    label: str
    weight: float = 1.0
    target: float = 0.75
    warning: float = 0.6
    critical: float = 0.45
    floor: float = 0.0
    ceiling: float = 1.0
    orientation: str = "higher"
    description: str = ""
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:  # type: ignore[override]
        object.__setattr__(self, "key", _normalise_text(self.key).lower())
        object.__setattr__(self, "label", _normalise_text(self.label))
        weight = float(self.weight)
        if not isfinite(weight) or weight <= 0:
            raise ValueError("weight must be positive")
        object.__setattr__(self, "weight", weight)
        target = float(self.target)
        warning = float(self.warning)
        critical = float(self.critical)
        floor = float(self.floor)
        ceiling = float(self.ceiling)
        if not all(map(isfinite, (target, warning, critical, floor, ceiling))):
            raise ValueError("core metric thresholds must be finite numbers")
        if floor > ceiling:
            raise ValueError("floor must be <= ceiling")
        if not (floor <= target <= ceiling):
            raise ValueError("target must be within [floor, ceiling]")
        if not (floor <= warning <= ceiling):
            raise ValueError("warning must be within [floor, ceiling]")
        if not (floor <= critical <= ceiling):
            raise ValueError("critical must be within [floor, ceiling]")
        orientation = _normalise_orientation(self.orientation)
        if orientation == "higher":
            if not (critical <= warning <= target):
                raise ValueError(
                    "expected critical <= warning <= target for higher orientation"
                )
        else:
            if not (critical >= warning >= target):
                raise ValueError(
                    "expected critical >= warning >= target for lower orientation"
                )
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "warning", warning)
        object.__setattr__(self, "critical", critical)
        object.__setattr__(self, "floor", floor)
        object.__setattr__(self, "ceiling", ceiling)
        object.__setattr__(self, "orientation", orientation)
        object.__setattr__(self, "description", _normalise_text(self.description, allow_empty=True))
        object.__setattr__(self, "tags", _normalise_tags(self.tags))

    def describe(self) -> Mapping[str, object]:
        """Return a serialisable description of the metric definition."""

        return {
            "key": self.key,
            "label": self.label,
            "weight": self.weight,
            "target": self.target,
            "warning": self.warning,
            "critical": self.critical,
            "floor": self.floor,
            "ceiling": self.ceiling,
            "orientation": self.orientation,
            "description": self.description,
            "tags": self.tags,
        }


@dataclass(slots=True, frozen=True)
class CoreMetricStatus:
    """Runtime view of a Dynamic Core metric with health annotations."""

    key: str
    label: str
    value: float
    delta: float
    gap_to_target: float
    status: str
    weight: float
    target: float
    warning: float
    critical: float
    orientation: str
    tags: tuple[str, ...]
    metadata: Mapping[str, object] | None
    priority: float

    def to_dict(self) -> Mapping[str, object]:
        return {
            "key": self.key,
            "label": self.label,
            "value": self.value,
            "delta": self.delta,
            "gap_to_target": self.gap_to_target,
            "status": self.status,
            "weight": self.weight,
            "target": self.target,
            "warning": self.warning,
            "critical": self.critical,
            "orientation": self.orientation,
            "tags": self.tags,
            "metadata": None if self.metadata is None else dict(self.metadata),
            "priority": self.priority,
        }


@dataclass(slots=True, frozen=True)
class CoreSnapshot:
    """Aggregated snapshot of a Dynamic Core model."""

    domain: str
    timestamp: datetime
    composite: float
    momentum: float
    metrics: tuple[CoreMetricStatus, ...]
    alerts: tuple[str, ...]
    sample_size: int

    def to_dict(self) -> Mapping[str, object]:
        return {
            "domain": self.domain,
            "timestamp": self.timestamp.isoformat(),
            "composite": self.composite,
            "momentum": self.momentum,
            "metrics": [metric.to_dict() for metric in self.metrics],
            "alerts": list(self.alerts),
            "sample_size": self.sample_size,
        }


@dataclass(slots=True, frozen=True)
class CoreBlueprint:
    """Immutable blueprint describing a Dynamic Core configuration."""

    domain: str
    metrics: tuple[CoreMetricDefinition, ...]
    default_window: int = 12

    def __post_init__(self) -> None:  # type: ignore[override]
        object.__setattr__(self, "domain", _normalise_text(self.domain))
        if not self.metrics:
            raise ValueError("a core blueprint must declare at least one metric")
        metrics: list[CoreMetricDefinition] = []
        for definition in self.metrics:
            if not isinstance(definition, CoreMetricDefinition):
                raise TypeError("blueprint metrics must be CoreMetricDefinition instances")
            metrics.append(definition)
        object.__setattr__(self, "metrics", tuple(metrics))
        object.__setattr__(self, "default_window", _normalise_window(self.default_window))

    def instantiate(self, *, window: int | None = None) -> "DynamicCoreModel":
        """Create a :class:`DynamicCoreModel` using the blueprint's defaults."""

        return DynamicCoreModel(
            self.domain,
            self.metrics,
            window=self.default_window if window is None else window,
        )


class DynamicCoreModel:
    """Maintain weighted Dynamic Core metrics and surface prioritised gaps."""

    def __init__(
        self,
        domain: str,
        definitions: Iterable[CoreMetricDefinition],
        *,
        window: int = 12,
    ) -> None:
        self.domain = _normalise_text(domain)
        definition_list = list(definitions)
        if not definition_list:
            raise ValueError("at least one metric definition is required")
        lookup: dict[str, CoreMetricDefinition] = {}
        for definition in definition_list:
            if not isinstance(definition, CoreMetricDefinition):
                raise TypeError("metric definitions must be CoreMetricDefinition instances")
            if definition.key in lookup:
                raise ValueError(f"duplicate metric definition: {definition.key}")
            lookup[definition.key] = definition
        self._definitions: tuple[CoreMetricDefinition, ...] = tuple(definition_list)
        self._lookup: Mapping[str, CoreMetricDefinition] = MappingProxyType(lookup)
        window_size = _normalise_window(window)
        self._history: Deque[float] = deque(maxlen=window_size)
        self._history_sum: float = 0.0
        self._samples: int = 0
        self._last_snapshot: CoreSnapshot | None = None

    @property
    def definitions(self) -> tuple[CoreMetricDefinition, ...]:
        return self._definitions

    def describe(self) -> Mapping[str, object]:
        return {
            "domain": self.domain,
            "metrics": [definition.describe() for definition in self._definitions],
        }

    def record(
        self,
        values: Mapping[str, float],
        *,
        timestamp: datetime | None = None,
        metadata: Mapping[str, Mapping[str, object] | None] | None = None,
    ) -> CoreSnapshot:
        if not isinstance(values, Mapping):
            raise TypeError("values must be a mapping of metric keys to numbers")
        if not values:
            raise ValueError("values must not be empty")
        unknown = set(values).difference(self._lookup)
        if unknown:
            raise KeyError(f"unknown core metric keys: {sorted(unknown)}")
        previous = {
            metric.key: metric for metric in (self._last_snapshot.metrics if self._last_snapshot else [])
        }
        missing = [
            definition.key
            for definition in self._definitions
            if definition.key not in values and definition.key not in previous
        ]
        if missing:
            raise KeyError(f"missing core metric values: {missing}")
        if timestamp is not None and not isinstance(timestamp, datetime):
            raise TypeError("timestamp must be a datetime instance")
        ts = timestamp if timestamp is not None else _utcnow()
        ts = ts if ts.tzinfo is not None else ts.replace(tzinfo=timezone.utc)
        ts = ts.astimezone(timezone.utc)
        if metadata is not None and not isinstance(metadata, Mapping):
            raise TypeError("metadata must be a mapping")
        if metadata is not None:
            unknown_metadata = set(metadata).difference(self._lookup)
            if unknown_metadata:
                raise KeyError(f"unknown metadata metric keys: {sorted(unknown_metadata)}")
            resolved_metadata: Mapping[str, Mapping[str, object] | None] = MappingProxyType(
                {key: _freeze_mapping(value) for key, value in metadata.items()}
            )
        else:
            resolved_metadata = MappingProxyType({})
        statuses: list[CoreMetricStatus] = []
        alerts: list[str] = []
        weighted_total = 0.0
        weight_sum = 0.0
        for definition in self._definitions:
            raw_value = values.get(definition.key)
            if raw_value is None:
                raw_value = previous[definition.key].value
            value = _clamp(raw_value, floor=definition.floor, ceiling=definition.ceiling)
            delta = value - previous[definition.key].value if definition.key in previous else 0.0
            if definition.orientation == "higher":
                gap = definition.target - value
                if value >= definition.target:
                    status = "healthy"
                elif value >= definition.warning:
                    status = "watch"
                elif value >= definition.critical:
                    status = "risk"
                else:
                    status = "critical"
            else:
                gap = value - definition.target
                if value <= definition.target:
                    status = "healthy"
                elif value <= definition.warning:
                    status = "watch"
                elif value <= definition.critical:
                    status = "risk"
                else:
                    status = "critical"
            priority = max(gap, 0.0) * definition.weight
            metric_metadata = resolved_metadata.get(definition.key)
            metric_status = CoreMetricStatus(
                key=definition.key,
                label=definition.label,
                value=value,
                delta=delta,
                gap_to_target=gap,
                status=status,
                weight=definition.weight,
                target=definition.target,
                warning=definition.warning,
                critical=definition.critical,
                orientation=definition.orientation,
                tags=definition.tags,
                metadata=metric_metadata,
                priority=priority,
            )
            statuses.append(metric_status)
            weighted_total += value * definition.weight
            weight_sum += definition.weight
            if status in {"risk", "critical"}:
                alerts.append(f"{definition.label}: {status.upper()}")
        composite = weighted_total / weight_sum if weight_sum else 0.0
        history_length = len(self._history)
        if history_length:
            baseline = self._history_sum / history_length
            momentum = composite - baseline
        else:
            momentum = 0.0
        oldest = self._history[0] if history_length == self._history.maxlen else 0.0
        if history_length == self._history.maxlen:
            self._history_sum -= oldest
        self._history.append(composite)
        self._history_sum += composite
        self._samples += 1
        snapshot = CoreSnapshot(
            domain=self.domain,
            timestamp=ts,
            composite=composite,
            momentum=momentum,
            metrics=tuple(statuses),
            alerts=tuple(alerts),
            sample_size=self._samples,
        )
        self._last_snapshot = snapshot
        return snapshot

    def snapshot(self) -> CoreSnapshot:
        if self._last_snapshot is None:
            raise RuntimeError("no core snapshot recorded yet")
        return self._last_snapshot

    def priorities(self, *, limit: int = 3) -> tuple[CoreMetricStatus, ...]:
        if self._last_snapshot is None or limit <= 0:
            return ()
        candidates = [metric for metric in self._last_snapshot.metrics if metric.priority > 0]
        if not candidates:
            return ()
        if limit >= len(candidates):
            candidates.sort(key=lambda metric: (metric.priority, metric.weight), reverse=True)
            return tuple(candidates)
        return tuple(nlargest(limit, candidates, key=lambda metric: (metric.priority, metric.weight)))

    def trailing_composite_mean(self) -> float:
        if not self._history:
            raise RuntimeError("no composite history available")
        return self._history_sum / len(self._history)


class BlueprintBackedCoreModel(DynamicCoreModel):
    """`DynamicCoreModel` that is constructed from a static blueprint."""

    blueprint: ClassVar[CoreBlueprint]

    def __init__(self, *, window: int | None = None) -> None:
        if not isinstance(getattr(self, "blueprint", None), CoreBlueprint):
            raise TypeError(
                f"{self.__class__.__name__} must define a 'blueprint' class attribute"
            )
        blueprint = self.blueprint
        resolved_window = blueprint.default_window if window is None else window
        super().__init__(blueprint.domain, blueprint.metrics, window=resolved_window)


CORE_BLUEPRINTS: Mapping[str, CoreBlueprint] = MappingProxyType(
    {
        "dynamic_ai": CoreBlueprint(
            domain="Dynamic AI",
            metrics=(
                CoreMetricDefinition(
                    key="analysis_accuracy",
                    label="Analysis Accuracy",
                    weight=1.3,
                    target=0.86,
                    warning=0.72,
                    critical=0.6,
                    description="Agreement between fused lobes and validation harnesses.",
                    tags=("analysis", "quality"),
                ),
                CoreMetricDefinition(
                    key="fusion_cohesion",
                    label="Fusion Cohesion",
                    weight=1.1,
                    target=0.82,
                    warning=0.7,
                    critical=0.55,
                    description="Cross-lobe narrative alignment and rationale completeness.",
                    tags=("fusion", "narrative"),
                ),
                CoreMetricDefinition(
                    key="risk_alignment",
                    label="Risk Alignment",
                    weight=1.2,
                    target=0.88,
                    warning=0.74,
                    critical=0.62,
                    description="Consistency between signals and treasury guardrails.",
                    tags=("risk", "treasury"),
                ),
                CoreMetricDefinition(
                    key="automation_readiness",
                    label="Automation Readiness",
                    weight=1.0,
                    target=0.8,
                    warning=0.68,
                    critical=0.5,
                    description="Downstream execution readiness and routing coverage.",
                    tags=("execution", "automation"),
                ),
                CoreMetricDefinition(
                    key="auditability",
                    label="Auditability",
                    weight=0.9,
                    target=0.9,
                    warning=0.78,
                    critical=0.65,
                    description="Traceability of rationale, telemetry, and observability artifacts.",
                    tags=("observability", "governance"),
                ),
            ),
        ),
        "dynamic_agi": CoreBlueprint(
            domain="Dynamic AGI",
            metrics=(
                CoreMetricDefinition(
                    key="orchestration_depth",
                    label="Orchestration Depth",
                    weight=1.25,
                    target=0.85,
                    warning=0.72,
                    critical=0.58,
                    description="Breadth of agent coordination and task graph coverage.",
                    tags=("orchestration", "agents"),
                ),
                CoreMetricDefinition(
                    key="mentorship_feedback",
                    label="Mentorship Feedback",
                    weight=1.05,
                    target=0.83,
                    warning=0.7,
                    critical=0.56,
                    description="Quality of mentorship loops and human-in-the-loop feedback.",
                    tags=("mentorship", "feedback"),
                ),
                CoreMetricDefinition(
                    key="self_improvement_velocity",
                    label="Self-Improvement Velocity",
                    weight=1.15,
                    target=0.8,
                    warning=0.66,
                    critical=0.5,
                    description="Cadence of DAGI self-improvement experiments landing in production.",
                    tags=("improvement", "experiments"),
                ),
                CoreMetricDefinition(
                    key="memory_cohesion",
                    label="Memory Cohesion",
                    weight=1.0,
                    target=0.82,
                    warning=0.68,
                    critical=0.54,
                    description="Continuity between STM, MTM, and knowledge graph state.",
                    tags=("memory", "knowledge"),
                ),
                CoreMetricDefinition(
                    key="governance_compliance",
                    label="Governance Compliance",
                    weight=0.95,
                    target=0.9,
                    warning=0.78,
                    critical=0.65,
                    description="Adherence to DAGI guardrails, policy audits, and approvals.",
                    tags=("governance", "policy"),
                ),
            ),
        ),
        "dynamic_ags": CoreBlueprint(
            domain="Dynamic AGS",
            metrics=(
                CoreMetricDefinition(
                    key="policy_maturity",
                    label="Policy Maturity",
                    weight=1.2,
                    target=0.88,
                    warning=0.74,
                    critical=0.6,
                    description="Depth of codified policies, approvals, and escalation paths.",
                    tags=("policy", "governance"),
                ),
                CoreMetricDefinition(
                    key="oversight_coverage",
                    label="Oversight Coverage",
                    weight=1.1,
                    target=0.84,
                    warning=0.7,
                    critical=0.55,
                    description="Operator, owner, and reviewer coverage across governance routines.",
                    tags=("oversight", "roles"),
                ),
                CoreMetricDefinition(
                    key="incident_response",
                    label="Incident Response",
                    weight=1.0,
                    target=0.8,
                    warning=0.66,
                    critical=0.52,
                    description="Time-to-triage and resolution quality for AGS incidents.",
                    tags=("reliability", "incident"),
                ),
                CoreMetricDefinition(
                    key="automation_safety",
                    label="Automation Safety",
                    weight=1.15,
                    target=0.86,
                    warning=0.72,
                    critical=0.58,
                    description="Guardrail adherence and critic coverage for automated actions.",
                    tags=("safety", "automation"),
                ),
                CoreMetricDefinition(
                    key="telemetry_visibility",
                    label="Telemetry Visibility",
                    weight=0.95,
                    target=0.9,
                    warning=0.78,
                    critical=0.65,
                    description="Observability of events, approvals, and mirrored artefacts.",
                    tags=("telemetry", "observability"),
                ),
            ),
        ),
        "dynamic_etl": CoreBlueprint(
            domain="Dynamic ETL",
            metrics=(
                CoreMetricDefinition(
                    key="pipeline_success_rate",
                    label="Pipeline Success Rate",
                    weight=1.2,
                    target=0.9,
                    warning=0.78,
                    critical=0.65,
                    description="Proportion of scheduled ETL jobs completing without retries or failures.",
                    tags=("reliability", "pipelines"),
                ),
                CoreMetricDefinition(
                    key="data_freshness",
                    label="Data Freshness",
                    weight=1.1,
                    target=0.87,
                    warning=0.74,
                    critical=0.6,
                    description="Timeliness of ingested datasets relative to upstream service level objectives.",
                    tags=("freshness", "latency"),
                ),
                CoreMetricDefinition(
                    key="schema_resilience",
                    label="Schema Resilience",
                    weight=1.0,
                    target=0.84,
                    warning=0.7,
                    critical=0.56,
                    description="Ability to absorb schema drift via contracts, validation, and automated migrations.",
                    tags=("schema", "quality"),
                ),
                CoreMetricDefinition(
                    key="throughput_efficiency",
                    label="Throughput Efficiency",
                    weight=1.05,
                    target=0.82,
                    warning=0.68,
                    critical=0.54,
                    description="Utilisation of compute, I/O, and scheduling windows relative to expected throughput.",
                    tags=("performance", "throughput"),
                ),
                CoreMetricDefinition(
                    key="recovery_velocity",
                    label="Recovery Velocity",
                    weight=0.95,
                    target=0.85,
                    warning=0.72,
                    critical=0.58,
                    description="Speed of detecting, triaging, and restoring ETL services after incidents.",
                    tags=("resilience", "incidents"),
                ),
            ),
        ),
        "dynamic_dcm": CoreBlueprint(
            domain="Dynamic Core Maiden",
            metrics=(
                CoreMetricDefinition(
                    key="data_processing",
                    label="DCM1 · Data Processing",
                    weight=1.0,
                    target=0.85,
                    warning=0.72,
                    critical=0.58,
                    description="Quality of raw ingestion, normalization, and lineage control.",
                    tags=("ingestion", "lineage"),
                ),
                CoreMetricDefinition(
                    key="pattern_recognition",
                    label="DCM2 · Pattern Recognition",
                    weight=1.0,
                    target=0.83,
                    warning=0.7,
                    critical=0.56,
                    description="Accuracy of feature discovery and anomaly detection meshes.",
                    tags=("features", "detection"),
                ),
                CoreMetricDefinition(
                    key="predictive_modeling",
                    label="DCM3 · Predictive Modeling",
                    weight=1.1,
                    target=0.84,
                    warning=0.71,
                    critical=0.57,
                    description="Strength of ensemble forecasts and stress-path simulations.",
                    tags=("forecasting", "modeling"),
                ),
                CoreMetricDefinition(
                    key="risk_assessment",
                    label="DCM4 · Risk Assessment",
                    weight=1.2,
                    target=0.87,
                    warning=0.74,
                    critical=0.6,
                    description="Coverage of guardrails, mitigations, and risk attestation loops.",
                    tags=("risk", "guardrails"),
                ),
                CoreMetricDefinition(
                    key="optimization",
                    label="DCM5 · Optimization",
                    weight=0.95,
                    target=0.82,
                    warning=0.69,
                    critical=0.55,
                    description="Efficiency of tuning cycles across execution and allocation targets.",
                    tags=("optimization", "execution"),
                ),
                CoreMetricDefinition(
                    key="adaptive_learning",
                    label="DCM6 · Adaptive Learning",
                    weight=1.05,
                    target=0.83,
                    warning=0.7,
                    critical=0.56,
                    description="Cadence of retraining, feedback assimilation, and policy refresh.",
                    tags=("learning", "feedback"),
                ),
                CoreMetricDefinition(
                    key="decision_logic",
                    label="DCM7 · Decision Logic",
                    weight=1.1,
                    target=0.85,
                    warning=0.72,
                    critical=0.58,
                    description="Rigor of rule engines, exception playbooks, and escalation flows.",
                    tags=("decisioning", "policy"),
                ),
                CoreMetricDefinition(
                    key="memory_management",
                    label="DCM8 · Memory Management",
                    weight=0.9,
                    target=0.81,
                    warning=0.68,
                    critical=0.54,
                    description="Health of retention ledgers, embeddings, and recall preparedness.",
                    tags=("memory", "retention"),
                ),
                CoreMetricDefinition(
                    key="context_analysis",
                    label="DCM9 · Context Analysis",
                    weight=0.92,
                    target=0.82,
                    warning=0.69,
                    critical=0.55,
                    description="Timeliness and completeness of situational awareness packages.",
                    tags=("context", "situational"),
                ),
                CoreMetricDefinition(
                    key="validation",
                    label="DCM10 · Validation",
                    weight=1.15,
                    target=0.88,
                    warning=0.75,
                    critical=0.61,
                    description="Depth of compliance, accuracy, and latency gates prior to release.",
                    tags=("validation", "compliance"),
                ),
                CoreMetricDefinition(
                    key="integration",
                    label="DCM11 · Integration",
                    weight=1.0,
                    target=0.86,
                    warning=0.73,
                    critical=0.59,
                    description="Success of cross-core hand-offs, release trains, and staging syncs.",
                    tags=("integration", "handoff"),
                ),
            ),
        ),
        "dynamic_dch": CoreBlueprint(
            domain="Dynamic Core Hollow",
            metrics=(
                CoreMetricDefinition(
                    key="natural_language_processing",
                    label="DCH1 · Natural Language Processing",
                    weight=1.0,
                    target=0.84,
                    warning=0.71,
                    critical=0.57,
                    description="Coverage of multilingual comprehension, prompting, and corpus curation.",
                    tags=("language", "corpus"),
                ),
                CoreMetricDefinition(
                    key="strategic_planning",
                    label="DCH2 · Strategic Planning",
                    weight=1.1,
                    target=0.86,
                    warning=0.73,
                    critical=0.59,
                    description="Fidelity of long-horizon roadmaps, constraints, and dependency models.",
                    tags=("planning", "strategy"),
                ),
                CoreMetricDefinition(
                    key="problem_solving",
                    label="DCH3 · Problem Solving",
                    weight=1.05,
                    target=0.83,
                    warning=0.7,
                    critical=0.56,
                    description="Effectiveness of structured reasoning and multi-step solver routines.",
                    tags=("reasoning", "solver"),
                ),
                CoreMetricDefinition(
                    key="knowledge_synthesis",
                    label="DCH4 · Knowledge Synthesis",
                    weight=0.98,
                    target=0.82,
                    warning=0.69,
                    critical=0.55,
                    description="Speed and clarity of research consolidation into actionable briefs.",
                    tags=("synthesis", "research"),
                ),
                CoreMetricDefinition(
                    key="creative_generation",
                    label="DCH5 · Creative Generation",
                    weight=0.9,
                    target=0.8,
                    warning=0.67,
                    critical=0.53,
                    description="Novelty and policy-aligned ideation output across campaigns and strategies.",
                    tags=("creative", "ideation"),
                ),
                CoreMetricDefinition(
                    key="ethical_reasoning",
                    label="DCH6 · Ethical Reasoning",
                    weight=1.15,
                    target=0.88,
                    warning=0.75,
                    critical=0.61,
                    description="Compliance of moral adjudications, guardrails, and audit evidence.",
                    tags=("ethics", "governance"),
                ),
                CoreMetricDefinition(
                    key="social_intelligence",
                    label="DCH7 · Social Intelligence",
                    weight=0.95,
                    target=0.82,
                    warning=0.69,
                    critical=0.55,
                    description="Consistency of collaboration, stakeholder alignment, and comms loops.",
                    tags=("collaboration", "comms"),
                ),
                CoreMetricDefinition(
                    key="self_reflection",
                    label="DCH8 · Self-Reflection",
                    weight=1.0,
                    target=0.83,
                    warning=0.7,
                    critical=0.56,
                    description="Cadence of retrospectives, capability tuning, and improvement plans.",
                    tags=("metacognition", "improvement"),
                ),
                CoreMetricDefinition(
                    key="cross_domain_transfer",
                    label="DCH9 · Cross-Domain Transfer",
                    weight=1.1,
                    target=0.85,
                    warning=0.72,
                    critical=0.58,
                    description="Success of rollout packets, replication hooks, and adoption telemetry.",
                    tags=("transfer", "rollout"),
                ),
            ),
        ),
        "dynamic_dcr": CoreBlueprint(
            domain="Dynamic Core Revenant",
            metrics=(
                CoreMetricDefinition(
                    key="governance",
                    label="DCR1 · Governance",
                    weight=1.2,
                    target=0.9,
                    warning=0.78,
                    critical=0.65,
                    description="Policy enforcement strength, compliance coverage, and audit readiness.",
                    tags=("governance", "policy"),
                ),
                CoreMetricDefinition(
                    key="sync",
                    label="DCR2 · Sync",
                    weight=1.0,
                    target=0.86,
                    warning=0.74,
                    critical=0.6,
                    description="Precision of scheduling, dependency coordination, and release cadences.",
                    tags=("synchronization", "planning"),
                ),
                CoreMetricDefinition(
                    key="memory",
                    label="DCR3 · Memory",
                    weight=1.05,
                    target=0.88,
                    warning=0.76,
                    critical=0.62,
                    description="Integrity of knowledge vaults, restoration drills, and journaling.",
                    tags=("memory", "retention"),
                ),
                CoreMetricDefinition(
                    key="observability",
                    label="DCR4 · Observability",
                    weight=0.95,
                    target=0.87,
                    warning=0.75,
                    critical=0.61,
                    description="Latency and completeness of telemetry, tracing, and alerting surfaces.",
                    tags=("observability", "telemetry"),
                ),
                CoreMetricDefinition(
                    key="reliability",
                    label="DCR5 · Reliability",
                    weight=1.1,
                    target=0.89,
                    warning=0.77,
                    critical=0.63,
                    description="Readiness of incident response, failover playbooks, and resilience drills.",
                    tags=("reliability", "resilience"),
                ),
            ),
        ),
    }
)


class DynamicAICoreModel(BlueprintBackedCoreModel):
    """Optimised Dynamic Core model tuned for the Dynamic AI stack."""

    blueprint = CORE_BLUEPRINTS["dynamic_ai"]


class DynamicAGICoreModel(BlueprintBackedCoreModel):
    """Optimised Dynamic Core model for Dynamic AGI orchestration."""

    blueprint = CORE_BLUEPRINTS["dynamic_agi"]


class DynamicAGSCoreModel(BlueprintBackedCoreModel):
    """Optimised Dynamic Core model for the AGS governance program."""

    blueprint = CORE_BLUEPRINTS["dynamic_ags"]


class DynamicETLCoreModel(BlueprintBackedCoreModel):
    """Dynamic Core model focusing on ETL reliability and throughput."""

    blueprint = CORE_BLUEPRINTS["dynamic_etl"]


class DynamicDCMCoreModel(BlueprintBackedCoreModel):
    """Dynamic Core model codifying the eleven DCM micro-core stages."""

    blueprint = CORE_BLUEPRINTS["dynamic_dcm"]


class DynamicDCHCoreModel(BlueprintBackedCoreModel):
    """Dynamic Core model encapsulating the nine DCH capability lanes."""

    blueprint = CORE_BLUEPRINTS["dynamic_dch"]


class DynamicDCRCoreModel(BlueprintBackedCoreModel):
    """Dynamic Core model representing the five DCR governance pillars."""

    blueprint = CORE_BLUEPRINTS["dynamic_dcr"]


CORE_MODEL_FACTORIES: Mapping[str, type[BlueprintBackedCoreModel]] = MappingProxyType(
    {
        "dynamic_ai": DynamicAICoreModel,
        "dynamic_agi": DynamicAGICoreModel,
        "dynamic_ags": DynamicAGSCoreModel,
        "dynamic_etl": DynamicETLCoreModel,
        "dynamic_dcm": DynamicDCMCoreModel,
        "dynamic_dch": DynamicDCHCoreModel,
        "dynamic_dcr": DynamicDCRCoreModel,
    }
)


def build_core_model(domain_key: str, *, window: int | None = None) -> DynamicCoreModel:
    """Construct a Dynamic Core model for ``domain_key``.

    Parameters
    ----------
    domain_key:
        Identifier referencing an entry in :data:`CORE_MODEL_FACTORIES`.
    window:
        Optional override for the trailing momentum window used by the
        constructed model. Defaults to the blueprint's window when omitted.
    """

    try:
        model_cls = CORE_MODEL_FACTORIES[domain_key]
    except KeyError:  # pragma: no cover - defensive guard
        raise KeyError(f"unknown core domain '{domain_key}'") from None
    return model_cls(window=window)


def build_all_core_models(*, window: int | None = None) -> Mapping[str, DynamicCoreModel]:
    """Return instantiated models for every registered Dynamic Core domain."""

    return {
        domain_key: build_core_model(domain_key, window=window)
        for domain_key in CORE_MODEL_FACTORIES
    }
