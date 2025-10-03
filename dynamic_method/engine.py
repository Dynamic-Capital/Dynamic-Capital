"""Method design intelligence engine used across Dynamic Capital rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, Sequence

__all__ = [
    "MethodSignal",
    "MethodContext",
    "MethodBlueprint",
    "DynamicMethodEngine",
]


_METRIC_FIELDS: tuple[str, ...] = (
    "urgency",
    "ambiguity",
    "risk",
    "effort",
    "leverage",
    "discipline",
)


@dataclass(slots=True)
class _SignalAggregation:
    metrics: Mapping[str, float]
    dominant_drivers: tuple[str, ...]
    dominant_tags: tuple[str, ...]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    normalised = value.strip()
    if not normalised:
        raise ValueError("text must not be empty")
    return normalised


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class MethodSignal:
    """Field intelligence about how a method is landing in practice."""

    driver: str
    observation: str
    urgency: float = 0.5
    ambiguity: float = 0.5
    risk: float = 0.5
    effort: float = 0.5
    leverage: float = 0.5
    discipline: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.driver = _normalise_lower(self.driver)
        self.observation = _normalise_text(self.observation)
        self.urgency = _clamp(float(self.urgency))
        self.ambiguity = _clamp(float(self.ambiguity))
        self.risk = _clamp(float(self.risk))
        self.effort = _clamp(float(self.effort))
        self.leverage = _clamp(float(self.leverage))
        self.discipline = _clamp(float(self.discipline))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class MethodContext:
    """Parameters describing the environment the method must operate within."""

    mission: str
    horizon: str
    urgency_bias: float
    compliance_pressure: float
    innovation_pull: float
    ops_maturity: float
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    stakeholders: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.horizon = _normalise_text(self.horizon)
        self.urgency_bias = _clamp(float(self.urgency_bias))
        self.compliance_pressure = _clamp(float(self.compliance_pressure))
        self.innovation_pull = _clamp(float(self.innovation_pull))
        self.ops_maturity = _clamp(float(self.ops_maturity))
        self.dependencies = _normalise_tuple(self.dependencies)
        self.stakeholders = _normalise_tuple(self.stakeholders)

    @property
    def is_high_compliance(self) -> bool:
        return self.compliance_pressure >= 0.6

    @property
    def is_high_urgency(self) -> bool:
        return self.urgency_bias >= 0.65

    @property
    def is_low_maturity(self) -> bool:
        return self.ops_maturity <= 0.4

    @property
    def is_innovation_led(self) -> bool:
        return self.innovation_pull >= 0.55


@dataclass(slots=True)
class MethodBlueprint:
    """Synthesised operating system for the evolving method."""

    method_archetype: str
    cadence: str
    pillars: tuple[str, ...]
    governance_focus: tuple[str, ...]
    experiments: tuple[str, ...]
    success_metrics: tuple[str, ...]
    dominant_drivers: tuple[str, ...]
    dominant_tags: tuple[str, ...]
    narrative: str


class DynamicMethodEngine:
    """Aggregates method signals into an actionable operating blueprint."""

    def __init__(self, *, window: int = 180) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._signals: Deque[MethodSignal] = deque(maxlen=window)

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._signals)

    def register(self, signal: MethodSignal) -> None:
        self._signals.append(signal)

    def extend(self, signals: Iterable[MethodSignal]) -> None:
        for signal in signals:
            self.register(signal)

    def clear(self) -> None:
        self._signals.clear()

    def signals(self) -> tuple[MethodSignal, ...]:
        return tuple(self._signals)

    def build_blueprint(self, context: MethodContext) -> MethodBlueprint:
        if not isinstance(context, MethodContext):  # pragma: no cover - defensive guard
            raise TypeError("context must be a MethodContext instance")

        aggregation = self._aggregate_signals()
        metrics = aggregation.metrics
        dominant_drivers = aggregation.dominant_drivers
        dominant_tags = aggregation.dominant_tags

        method_archetype = self._method_archetype(context, metrics)
        cadence = self._cadence(context, metrics)
        pillars = self._pillars(context, metrics, dominant_drivers)
        governance_focus = self._governance_focus(context, metrics)
        experiments = self._experiments(context, metrics, dominant_drivers)
        success_metrics = self._success_metrics(context, metrics)
        narrative = self._narrative(
            context,
            metrics,
            method_archetype,
            dominant_drivers,
        )

        return MethodBlueprint(
            method_archetype=method_archetype,
            cadence=cadence,
            pillars=pillars,
            governance_focus=governance_focus,
            experiments=experiments,
            success_metrics=success_metrics,
            dominant_drivers=dominant_drivers,
            dominant_tags=dominant_tags,
            narrative=narrative,
        )

    def _aggregate_signals(self) -> _SignalAggregation:
        total_weight = 0.0
        metric_totals = {field: 0.0 for field in _METRIC_FIELDS}
        driver_counter: Counter[str] = Counter()
        tag_counter: Counter[str] = Counter()

        for signal in self._signals:
            weight = signal.weight
            if weight <= 0:
                continue

            total_weight += weight
            for field in _METRIC_FIELDS:
                metric_totals[field] += getattr(signal, field) * weight

            driver_counter[signal.driver] += weight
            for tag in signal.tags:
                tag_counter[tag.lower()] += weight

        if total_weight > 0.0:
            metrics = {
                field: _clamp(total / total_weight)
                for field, total in metric_totals.items()
            }
        else:
            metrics = {field: 0.0 for field in metric_totals}

        dominant_drivers: tuple[str, ...]
        if driver_counter:
            ranked_drivers = sorted(
                driver_counter.items(), key=lambda item: (-item[1], item[0])
            )
            dominant_drivers = tuple(driver for driver, _ in ranked_drivers[:3])
        else:
            dominant_drivers = ()

        dominant_tags: tuple[str, ...]
        if tag_counter:
            ranked_tags = sorted(
                tag_counter.items(), key=lambda item: (-item[1], item[0])
            )
            dominant_tags = tuple(tag for tag, _ in ranked_tags[:5])
        else:
            dominant_tags = ()

        return _SignalAggregation(
            metrics=metrics,
            dominant_drivers=dominant_drivers,
            dominant_tags=dominant_tags,
        )

    def _method_archetype(self, context: MethodContext, metrics: Mapping[str, float]) -> str:
        ambiguity = metrics["ambiguity"]
        discipline = metrics["discipline"]
        risk = metrics["risk"]

        if ambiguity >= 0.65 or context.is_innovation_led:
            if context.is_high_compliance:
                return "Regulated discovery loop"
            return "Exploratory discovery loop"
        if discipline >= 0.6 and context.ops_maturity >= 0.6 and risk <= 0.5:
            return "Governed delivery playbook"
        if context.is_low_maturity:
            return "Capability uplift sprint"
        return "Adaptive learning cadence"

    def _cadence(self, context: MethodContext, metrics: Mapping[str, float]) -> str:
        urgency = max(context.urgency_bias, metrics["urgency"])
        ambiguity = metrics["ambiguity"]

        if urgency >= 0.7:
            return "Daily alignment with rolling retros"
        if ambiguity >= 0.6 or context.is_innovation_led:
            return "Twice-weekly synthesis workshop"
        if context.ops_maturity >= 0.65 and metrics["discipline"] >= 0.55:
            return "Weekly checkpoint and monthly deep-dive"
        return "Weekly checkpoint with mid-week async pulse"

    def _pillars(
        self,
        context: MethodContext,
        metrics: Mapping[str, float],
        dominant_drivers: Sequence[str],
    ) -> tuple[str, ...]:
        base_pillars: list[str] = [
            "Mission clarity & stakeholder alignment",
            "Hypothesis-driven discovery loops",
            "Capability and playbook uplift",
            "Measured execution discipline",
            "Compounding leverage amplification",
            "Embedded governance & risk sensing",
        ]

        priority: list[str] = []
        if context.is_innovation_led or metrics["ambiguity"] >= 0.6:
            priority.append("Hypothesis-driven discovery loops")
        if context.is_low_maturity:
            priority.append("Capability and playbook uplift")
        if context.ops_maturity >= 0.6 and metrics["discipline"] >= 0.55:
            priority.append("Measured execution discipline")
        if metrics["leverage"] >= 0.6:
            priority.append("Compounding leverage amplification")
        if metrics["risk"] >= 0.6 or context.is_high_compliance:
            priority.append("Embedded governance & risk sensing")

        ordered: list[str] = []
        seen: set[str] = set()
        for pillar in [*priority, *base_pillars]:
            if pillar not in seen:
                seen.add(pillar)
                ordered.append(pillar)

        if dominant_drivers:
            driver_focus = "Driver focus: " + ", ".join(dominant_drivers)
            if driver_focus not in seen:
                ordered.append(driver_focus)

        return tuple(ordered)

    def _governance_focus(
        self,
        context: MethodContext,
        metrics: Mapping[str, float],
    ) -> tuple[str, ...]:
        focus: list[str] = []
        if metrics["risk"] >= 0.6:
            focus.append("Tighten decision and risk reviews")
        if context.is_high_compliance:
            focus.append("Embed compliance partner in cadence")
        if metrics["ambiguity"] >= 0.6:
            focus.append("Maintain decision framing logs")
        if metrics["effort"] >= 0.6:
            focus.append("Rebalance load and capacity plans")
        if metrics["leverage"] >= 0.55:
            focus.append("Track leverage experiments weekly")
        if not focus:
            focus.append("Standard governance health-check")
        return tuple(focus)

    def _experiments(
        self,
        context: MethodContext,
        metrics: Mapping[str, float],
        dominant_drivers: Sequence[str],
    ) -> tuple[str, ...]:
        experiments: list[str] = []
        if metrics["ambiguity"] >= 0.6:
            experiments.append("Run discovery spike to collapse ambiguity")
        if metrics["leverage"] >= 0.6:
            experiments.append("Scale proven pattern into adjacent pods")
        if context.is_low_maturity:
            experiments.append("Pair high-skill operators with new squads")
        if context.is_innovation_led:
            experiments.append("Prototype bold bets with rapid validation")
        if metrics["discipline"] <= 0.45:
            experiments.append("Install lightweight rituals to stabilise execution")
        if not experiments:
            experiments.append("Maintain baseline improvement backlog")
        if dominant_drivers:
            experiments.append(
                "Deep-dive drivers: " + ", ".join(dominant_drivers)
            )
        return tuple(experiments)

    def _success_metrics(
        self,
        context: MethodContext,
        metrics: Mapping[str, float],
    ) -> tuple[str, ...]:
        metrics_view: list[str] = []
        clarity_target = int(round((1.0 - metrics["ambiguity"]) * 100))
        discipline_target = int(round(max(metrics["discipline"], context.ops_maturity) * 100))
        metrics_view.append(f"Clarity index >= {clarity_target}%")
        metrics_view.append(f"Execution discipline >= {discipline_target}%")
        if context.is_high_urgency or metrics["urgency"] >= 0.6:
            metrics_view.append("Cycle time <= 1 week per iteration")
        if metrics["leverage"] >= 0.55:
            metrics_view.append("Leverage experiments delivering measurable uplift")
        if metrics["risk"] >= 0.55 or context.is_high_compliance:
            metrics_view.append("Zero unreviewed critical-risk exceptions")
        if context.dependencies:
            metrics_view.append("Dependencies met on committed cadence")
        return tuple(metrics_view)

    def _narrative(
        self,
        context: MethodContext,
        metrics: Mapping[str, float],
        archetype: str,
        dominant_drivers: Sequence[str],
    ) -> str:
        driver_summary = ", ".join(dominant_drivers) if dominant_drivers else "no dominant drivers yet"
        return (
            f"Mission '{context.mission}' on a {context.horizon} horizon is operating through a {archetype}. "
            f"Urgency at {int(round(max(context.urgency_bias, metrics['urgency']) * 100))}% with "
            f"ambiguity at {int(round(metrics['ambiguity'] * 100))}%. "
            f"Risk posture scores {int(round(metrics['risk'] * 100))}% while leverage potential is {int(round(metrics['leverage'] * 100))}%. "
            f"Drivers in focus: {driver_summary}."
        )
