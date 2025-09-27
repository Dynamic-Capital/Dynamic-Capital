"""State telemetry aggregation for Dynamic Capital rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "StateSignal",
    "StateDefinition",
    "StateSnapshot",
    "DynamicStateEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_state_key(value: str) -> str:
    normalised = value.strip().lower()
    if not normalised:
        raise ValueError("state name must not be empty")
    return normalised


def _normalise_display_name(value: str) -> str:
    display = value.strip()
    if not display:
        raise ValueError("state name must not be empty")
    return display


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class StateSignal:
    """Qualitative or quantitative observation influencing a state."""

    state: str
    intensity: float
    confidence: float = 0.5
    momentum: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.state = _normalise_state_key(self.state)
        self.intensity = _clamp(float(self.intensity), lower=-1.0, upper=1.0)
        self.confidence = _clamp(float(self.confidence), lower=0.0, upper=1.0)
        self.momentum = _clamp(float(self.momentum), lower=-1.0, upper=1.0)
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class StateDefinition:
    """Description and guardrails for a state."""

    name: str
    description: str = ""
    baseline: float = 0.0
    floor: float = -1.0
    ceiling: float = 1.0
    warmup: int = 3

    def __post_init__(self) -> None:
        self.name = _normalise_display_name(self.name)
        if self.floor >= self.ceiling:
            raise ValueError("floor must be less than ceiling")
        self.baseline = _clamp(float(self.baseline), lower=self.floor, upper=self.ceiling)
        self.floor = float(self.floor)
        self.ceiling = float(self.ceiling)
        self.description = self.description.strip()
        self.warmup = max(int(self.warmup), 0)


@dataclass(slots=True)
class StateSnapshot:
    """Aggregated view of a state's current posture."""

    state: str
    value: float
    change: float
    trend: float
    baseline: float
    ready: bool
    signals: tuple[StateSignal, ...]
    tags: tuple[str, ...]
    summary: str
    metadata: Mapping[str, object]
    definition: StateDefinition

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "state": self.state,
            "value": self.value,
            "change": self.change,
            "trend": self.trend,
            "baseline": self.baseline,
            "ready": self.ready,
            "signals": [asdict(signal) for signal in self.signals],
            "tags": list(self.tags),
            "summary": self.summary,
            "metadata": dict(self.metadata),
        }


class DynamicStateEngine:
    """Capture signals and compute blended state posture metrics."""

    def __init__(
        self,
        *,
        history: int = 60,
        decay: float = 0.15,
        definitions: Iterable[StateDefinition | Mapping[str, object]] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._decay = _clamp(float(decay), lower=0.0, upper=0.5)
        self._definitions: dict[str, StateDefinition] = {}
        self._signals: dict[str, Deque[StateSignal]] = {}
        if definitions:
            for definition in definitions:
                self.register(definition)

    # ---------------------------------------------------------------- register
    def register(self, definition: StateDefinition | Mapping[str, object]) -> StateDefinition:
        resolved = self._coerce_definition(definition)
        key = _normalise_state_key(resolved.name)
        self._definitions[key] = resolved
        self._signals.setdefault(key, deque(maxlen=self._history))
        return resolved

    # ----------------------------------------------------------------- capture
    def capture(self, signal: StateSignal | Mapping[str, object]) -> StateSignal:
        resolved = self._coerce_signal(signal)
        definition = self._definitions.get(resolved.state)
        if definition is None:
            display = resolved.state.replace("_", " ").title()
            definition = StateDefinition(
                name=display,
                description=f"Auto-generated state for '{display}'.",
            )
            self._definitions[resolved.state] = definition
            self._signals[resolved.state] = deque(maxlen=self._history)
        self._signals.setdefault(resolved.state, deque(maxlen=self._history)).append(resolved)
        return resolved

    def extend(self, signals: Iterable[StateSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    # ---------------------------------------------------------------- snapshot
    def snapshot(self, state: str) -> StateSnapshot:
        key = _normalise_state_key(state)
        definition = self._definitions.get(key)
        if definition is None:
            definition = StateDefinition(
                name=state,
                description=f"Auto-generated state for '{_normalise_display_name(state)}'.",
            )
            self.register(definition)
        history = tuple(self._signals.get(key, ()))
        weighted_value = self._weighted_value(history)
        value = _clamp(definition.baseline + weighted_value, lower=definition.floor, upper=definition.ceiling)
        previous_value = definition.baseline
        if len(history) > 1:
            prior_weight = self._weighted_value(history[:-1])
            previous_value = _clamp(
                definition.baseline + prior_weight,
                lower=definition.floor,
                upper=definition.ceiling,
            )
        change = value - definition.baseline
        trend = value - previous_value
        ready = len(history) >= definition.warmup
        tags = self._aggregate_tags(history)
        summary = self._summarise(definition, value, change, trend, ready)
        metadata: MutableMapping[str, object] = {
            "state": definition.name,
            "signal_count": len(history),
            "baseline": definition.baseline,
            "floor": definition.floor,
            "ceiling": definition.ceiling,
            "decay": self._decay,
            "warmup": definition.warmup,
        }
        snapshot = StateSnapshot(
            state=definition.name,
            value=value,
            change=change,
            trend=trend,
            baseline=definition.baseline,
            ready=ready,
            signals=history,
            tags=tags,
            summary=summary,
            metadata=metadata,
            definition=definition,
        )
        return snapshot

    def overview(self) -> Mapping[str, StateSnapshot]:
        return {key: self.snapshot(key) for key in sorted(self._definitions)}

    # --------------------------------------------------------------- internals
    def _coerce_signal(self, signal: StateSignal | Mapping[str, object]) -> StateSignal:
        if isinstance(signal, StateSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            payload.setdefault("timestamp", _utcnow())
            return StateSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be StateSignal or mapping")

    def _coerce_definition(self, definition: StateDefinition | Mapping[str, object]) -> StateDefinition:
        if isinstance(definition, StateDefinition):
            return definition
        if isinstance(definition, Mapping):
            payload: MutableMapping[str, object] = dict(definition)
            return StateDefinition(**payload)  # type: ignore[arg-type]
        raise TypeError("definition must be StateDefinition or mapping")

    def _weighted_value(self, signals: Sequence[StateSignal]) -> float:
        if not signals:
            return 0.0
        total_weight = 0.0
        accumulator = 0.0
        for index, signal in enumerate(reversed(signals)):
            decay_factor = (1.0 - self._decay) ** index
            weight = signal.confidence * signal.weight * decay_factor
            total_weight += weight
            adjusted = signal.intensity + 0.25 * signal.momentum
            accumulator += adjusted * weight
        if total_weight == 0.0:
            return 0.0
        return accumulator / total_weight

    def _aggregate_tags(self, signals: Sequence[StateSignal]) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in signals:
            counter.update(signal.tags)
        ordered = sorted(counter.items(), key=lambda item: (-item[1], item[0]))
        return tuple(tag for tag, _ in ordered)

    def _summarise(
        self,
        definition: StateDefinition,
        value: float,
        change: float,
        trend: float,
        ready: bool,
    ) -> str:
        if change > 0.25:
            posture = "elevated"
        elif change < -0.25:
            posture = "suppressed"
        else:
            posture = "stable"

        if trend > 0.1:
            direction = "improving"
        elif trend < -0.1:
            direction = "deteriorating"
        else:
            direction = "holding"

        readiness = "calibrated" if ready else "warming"
        return (
            f"{definition.name} state is {posture} and {direction} at {value:.2f} "
            f"(baseline {definition.baseline:.2f}, {readiness})."
        )
