"""Creative ideation engine for Dynamic Capital."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CreativeBlueprint",
    "CreativeContext",
    "CreativeSignal",
    "DynamicCreativeThinking",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class CreativeSignal:
    """Qualitative observation captured during an ideation loop."""

    theme: str
    concept: str
    originality: float = 0.5
    resonance: float = 0.5
    viability: float = 0.5
    risk: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.theme = _normalise_text(self.theme).lower()
        self.concept = _normalise_text(self.concept)
        self.originality = _clamp(float(self.originality))
        self.resonance = _clamp(float(self.resonance))
        self.viability = _clamp(float(self.viability))
        self.risk = _clamp(float(self.risk))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class CreativeContext:
    """Problem framing information for the creative session."""

    challenge: str
    desired_outcome: str
    time_horizon: str
    risk_appetite: float
    ambiguity_level: float
    resource_level: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    inspiration_sources: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.challenge = _normalise_text(self.challenge)
        self.desired_outcome = _normalise_text(self.desired_outcome)
        self.time_horizon = _normalise_text(self.time_horizon)
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.ambiguity_level = _clamp(float(self.ambiguity_level))
        self.resource_level = _clamp(float(self.resource_level))
        self.constraints = tuple(_normalise_text(item) for item in self.constraints if item.strip())
        self.inspiration_sources = tuple(
            _normalise_text(item) for item in self.inspiration_sources if item.strip()
        )

    @property
    def is_exploratory(self) -> bool:
        return self.ambiguity_level >= 0.6

    @property
    def is_resource_constrained(self) -> bool:
        return self.resource_level <= 0.4

    @property
    def is_risk_averse(self) -> bool:
        return self.risk_appetite <= 0.4


@dataclass(slots=True)
class CreativeBlueprint:
    """Structured output describing the creative thinking posture."""

    imagination_score: float
    feasibility_score: float
    momentum: float
    spotlight_themes: tuple[str, ...]
    friction_alerts: tuple[str, ...]
    recommended_methods: tuple[str, ...]
    concept_summary: str
    next_moves: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "imagination_score": self.imagination_score,
            "feasibility_score": self.feasibility_score,
            "momentum": self.momentum,
            "spotlight_themes": list(self.spotlight_themes),
            "friction_alerts": list(self.friction_alerts),
            "recommended_methods": list(self.recommended_methods),
            "concept_summary": self.concept_summary,
            "next_moves": list(self.next_moves),
        }


class DynamicCreativeThinking:
    """Aggregate creative signals and produce a blueprint of the session."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[CreativeSignal] = deque(maxlen=history)

    # ------------------------------------------------------------- signal flow
    def capture(self, signal: CreativeSignal | Mapping[str, object]) -> CreativeSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[CreativeSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: CreativeSignal | Mapping[str, object]) -> CreativeSignal:
        if isinstance(signal, CreativeSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return CreativeSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be CreativeSignal or mapping")

    # -------------------------------------------------------------- computation
    def build_blueprint(self, context: CreativeContext) -> CreativeBlueprint:
        if not self._signals:
            raise RuntimeError("no creative signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("creative signals have zero weight")

        imagination = self._weighted_metric(
            lambda signal: 0.65 * signal.originality + 0.35 * signal.resonance
        )
        feasibility = self._weighted_metric(
            lambda signal: signal.viability * (1.0 - 0.5 * signal.risk)
        )
        momentum = self._weighted_metric(
            lambda signal: 0.5 * signal.originality + 0.5 * signal.viability
        )

        themes = self._spotlight_themes()
        alerts = self._friction_alerts(context, imagination, feasibility, momentum)
        methods = self._recommend_methods(context, imagination, feasibility, momentum)
        summary = self._concept_summary(context, imagination, feasibility, momentum, themes)
        moves = self._next_moves(context, alerts, methods)

        return CreativeBlueprint(
            imagination_score=round(imagination, 3),
            feasibility_score=round(feasibility, 3),
            momentum=round(momentum, 3),
            spotlight_themes=themes,
            friction_alerts=alerts,
            recommended_methods=methods,
            concept_summary=summary,
            next_moves=moves,
        )

    def _weighted_metric(self, selector: Callable[[CreativeSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _spotlight_themes(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            counter[signal.theme] += signal.weight
        if not counter:
            return ()
        ordered = sorted(counter.items(), key=lambda item: (-item[1], item[0]))
        return tuple(theme for theme, _ in ordered[:3])

    def _friction_alerts(
        self,
        context: CreativeContext,
        imagination: float,
        feasibility: float,
        momentum: float,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if imagination <= 0.45:
            alerts.append("Imagination dip: run divergent warm-ups")
        if feasibility <= 0.46:
            alerts.append("Feasibility tension: map constraints with operators")
        if momentum <= 0.4:
            alerts.append("Momentum risk: prototype tiny experiments")
        if context.is_resource_constrained:
            alerts.append("Resource squeeze: adapt concepts to available assets")
        if context.is_risk_averse and imagination >= 0.65:
            alerts.append("Risk appetite mismatch: stage ideas through safe pilots")
        return tuple(alerts)

    def _recommend_methods(
        self,
        context: CreativeContext,
        imagination: float,
        feasibility: float,
        momentum: float,
    ) -> tuple[str, ...]:
        methods: list[str] = []
        if context.is_exploratory:
            methods.append("SCAMPER Remix")
        if imagination <= 0.85:
            methods.append("Brainwriting Burst")
        if feasibility <= 0.5:
            methods.append("Constraint Reversal")
        if momentum <= 0.7:
            methods.append("Design Studio Sprint")
        # Deduplicate while preserving order
        seen: set[str] = set()
        ordered: list[str] = []
        for method in methods:
            if method not in seen:
                seen.add(method)
                ordered.append(method)
        return tuple(ordered)

    def _concept_summary(
        self,
        context: CreativeContext,
        imagination: float,
        feasibility: float,
        momentum: float,
        themes: tuple[str, ...],
    ) -> str:
        theme_summary = ", ".join(themes) if themes else "no dominant themes"
        return (
            f"Challenge: {context.challenge}. Desired outcome: {context.desired_outcome}. "
            f"Imagination at {int(round(imagination * 100))}% with feasibility {int(round(feasibility * 100))}%. "
            f"Momentum at {int(round(momentum * 100))}%. Themes: {theme_summary}."
        )

    def _next_moves(
        self,
        context: CreativeContext,
        alerts: tuple[str, ...],
        methods: tuple[str, ...],
    ) -> tuple[str, ...]:
        moves: list[str] = []
        if alerts:
            moves.extend(f"Stabilise: {alert}" for alert in alerts)
        if methods:
            moves.append("Activate methods: " + ", ".join(methods))
        if context.constraints:
            moves.append("Respect constraints: " + ", ".join(context.constraints))
        if context.inspiration_sources:
            moves.append("Review inspiration: " + ", ".join(context.inspiration_sources))
        if not moves:
            moves.append("Document promising ideas and assign prototype owners")
        return tuple(moves)
