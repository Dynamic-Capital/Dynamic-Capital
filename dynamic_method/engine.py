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

        metrics = {
            "urgency": self._weighted_metric(lambda s: s.urgency),
            "ambiguity": self._weighted_metric(lambda s: s.ambiguity),
            "risk": self._weighted_metric(lambda s: s.risk),
            "effort": self._weighted_metric(lambda s: s.effort),
            "leverage": self._weighted_metric(lambda s: s.leverage),
            "discipline": self._weighted_metric(lambda s: s.discipline),
        }
        dominant_drivers = self._dominant_drivers()
        dominant_tags = self._dominant_tags()

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

    def _weighted_metric(self, selector) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _dominant_drivers(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            counter[signal.driver] += signal.weight
        if not counter:
            return ()
        ranked = sorted(counter.items(), key=lambda item: (-item[1], item[0]))
        return tuple(driver for driver, _ in ranked[:3])

    def _dominant_tags(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            for tag in signal.tags:
                counter[tag.lower()] += signal.weight
        if not counter:
            return ()
        ranked = sorted(counter.items(), key=lambda item: (-item[1], item[0]))
        return tuple(tag for tag, _ in ranked[:5])

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
        pillars: list[str] = ["Mission clarity & stakeholder alignment"]
        if context.is_innovation_led or metrics["ambiguity"] >= 0.6:
            pillars.append("Hypothesis-driven discovery loops")
        if context.is_low_maturity:
            pillars.append("Capability and playbook uplift")
        if context.ops_maturity >= 0.6 and metrics["discipline"] >= 0.55:
            pillars.append("Measured execution discipline")
        if metrics["leverage"] >= 0.6:
            pillars.append("Compounding leverage amplification")
        if metrics["risk"] >= 0.6 or context.is_high_compliance:
            pillars.append("Embedded governance & risk sensing")
        if dominant_drivers:
            pillars.append("Driver focus: " + ", ".join(dominant_drivers))

        seen: set[str] = set()
        ordered: list[str] = []
        for pillar in pillars:
            if pillar not in seen:
                seen.add(pillar)
                ordered.append(pillar)
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
