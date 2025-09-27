"""Adaptive awareness synthesiser for Dynamic Consciousness."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ConsciousnessSignal",
    "ConsciousnessContext",
    "ConsciousnessState",
    "DynamicConsciousness",
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


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


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


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class ConsciousnessSignal:
    """Snapshot of sensory or reflective awareness."""

    modality: str
    observation: str
    salience: float = 0.5
    novelty: float = 0.5
    emotional_tone: float = 0.5
    clarity: float = 0.5
    stability: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.modality = _normalise_lower(self.modality)
        self.observation = _normalise_text(self.observation)
        self.salience = _clamp(float(self.salience))
        self.novelty = _clamp(float(self.novelty))
        self.emotional_tone = _clamp(float(self.emotional_tone))
        self.clarity = _clamp(float(self.clarity))
        self.stability = _clamp(float(self.stability))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class ConsciousnessContext:
    """Ambient mission and regulation state for a decision cycle."""

    mission: str
    time_horizon: str
    cognitive_load: float
    emotional_regulation: float
    threat_level: float
    opportunity_level: float
    support_network: float
    environmental_complexity: float
    stabilising_rituals: tuple[str, ...] = field(default_factory=tuple)
    future_snapshot: str | None = None

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.time_horizon = _normalise_text(self.time_horizon)
        self.cognitive_load = _clamp(float(self.cognitive_load))
        self.emotional_regulation = _clamp(float(self.emotional_regulation))
        self.threat_level = _clamp(float(self.threat_level))
        self.opportunity_level = _clamp(float(self.opportunity_level))
        self.support_network = _clamp(float(self.support_network))
        self.environmental_complexity = _clamp(float(self.environmental_complexity))
        self.stabilising_rituals = _normalise_tuple(self.stabilising_rituals)
        self.future_snapshot = _normalise_optional_text(self.future_snapshot)

    @property
    def is_overloaded(self) -> bool:
        return self.cognitive_load > 0.65 or (
            self.threat_level > 0.55 and self.emotional_regulation < 0.5
        )

    @property
    def is_high_opportunity(self) -> bool:
        return self.opportunity_level >= 0.6


@dataclass(slots=True)
class ConsciousnessState:
    """Synthesised state that guides situational awareness."""

    awareness_index: float
    readiness_index: float
    stability_index: float
    modal_dominance: tuple[str, ...]
    critical_signals: tuple[str, ...]
    recommended_focus: tuple[str, ...]
    stabilisation_rituals: tuple[str, ...]
    narrative_summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "awareness_index": self.awareness_index,
            "readiness_index": self.readiness_index,
            "stability_index": self.stability_index,
            "modal_dominance": list(self.modal_dominance),
            "critical_signals": list(self.critical_signals),
            "recommended_focus": list(self.recommended_focus),
            "stabilisation_rituals": list(self.stabilisation_rituals),
            "narrative_summary": self.narrative_summary,
        }


class DynamicConsciousness:
    """Aggregate awareness signals into an adaptive consciousness state."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[ConsciousnessSignal] = deque(maxlen=history)

    # ------------------------------------------------------------------ intake
    def capture(self, signal: ConsciousnessSignal | Mapping[str, object]) -> ConsciousnessSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[ConsciousnessSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    @property
    def signal_count(self) -> int:
        """Return the number of captured signals currently in memory."""

        return len(self._signals)

    def latest_signal(self) -> ConsciousnessSignal | None:
        """Return the most recently captured signal if available."""

        if not self._signals:
            return None
        return self._signals[-1]

    def _coerce_signal(
        self, signal: ConsciousnessSignal | Mapping[str, object]
    ) -> ConsciousnessSignal:
        if isinstance(signal, ConsciousnessSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return ConsciousnessSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be ConsciousnessSignal or mapping")

    # --------------------------------------------------------------- computation
    def build_state(self, context: ConsciousnessContext) -> ConsciousnessState:
        if not self._signals:
            raise RuntimeError("no consciousness signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("consciousness signals have zero weight")

        salience = self._weighted_metric(lambda s: s.salience, total_weight)
        novelty = self._weighted_metric(lambda s: s.novelty, total_weight)
        clarity = self._weighted_metric(lambda s: s.clarity, total_weight)
        emotional_tone = self._weighted_metric(lambda s: s.emotional_tone, total_weight)
        stability = self._weighted_metric(lambda s: s.stability, total_weight)

        awareness_index = _clamp(
            0.28 * (1.0 - context.cognitive_load)
            + 0.24 * clarity
            + 0.24 * salience
            + 0.24 * novelty
        )
        readiness_index = _clamp(
            0.3 * context.emotional_regulation
            + 0.2 * (1.0 - context.threat_level)
            + 0.2 * context.support_network
            + 0.15 * emotional_tone
            + 0.15 * context.opportunity_level
        )
        stability_index = _clamp(
            0.4 * stability
            + 0.3 * (1.0 - context.environmental_complexity)
            + 0.3 * context.emotional_regulation
        )

        modal_dominance = self._modalities()
        critical_signals = self._critical_summaries()
        recommended_focus = self._recommended_focus(context, readiness_index)
        stabilisation_rituals = self._stabilisation_rituals(context, stability_index)
        narrative_summary = self._narrative_summary(
            context,
            awareness_index,
            readiness_index,
            stability_index,
        )

        return ConsciousnessState(
            awareness_index=awareness_index,
            readiness_index=readiness_index,
            stability_index=stability_index,
            modal_dominance=modal_dominance,
            critical_signals=critical_signals,
            recommended_focus=recommended_focus,
            stabilisation_rituals=stabilisation_rituals,
            narrative_summary=narrative_summary,
        )

    # ------------------------------------------------------------- helper logic
    def _weighted_metric(
        self, metric: Callable[[ConsciousnessSignal], float], total_weight: float
    ) -> float:
        aggregate = sum(metric(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight if total_weight else 0.0)

    def _modalities(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter(signal.modality for signal in self._signals)
        most_common = counter.most_common(3)
        return tuple(modality for modality, _ in most_common)

    def _critical_summaries(self) -> tuple[str, ...]:
        ranked = sorted(
            self._signals,
            key=lambda signal: signal.weight * (signal.salience + signal.novelty) / 2,
            reverse=True,
        )
        highlights: list[str] = []
        for signal in ranked[:3]:
            highlights.append(f"{signal.modality}: {signal.observation}")
        return tuple(highlights)

    def _recommended_focus(
        self, context: ConsciousnessContext, readiness_index: float
    ) -> tuple[str, ...]:
        focus: list[str] = []
        if context.is_overloaded:
            focus.append("Run grounding loop before next strategic move.")
        if readiness_index < 0.45:
            focus.append("Delay irreversible decisions until state stabilises.")
        if context.is_high_opportunity and readiness_index >= 0.55:
            focus.append("Allocate bandwidth to high-leverage opportunity windows.")
        if not focus:
            focus.append("Maintain current cadence while monitoring signal drift.")
        return tuple(focus)

    def _stabilisation_rituals(
        self, context: ConsciousnessContext, stability_index: float
    ) -> tuple[str, ...]:
        rituals = list(context.stabilising_rituals)
        if context.emotional_regulation < 0.45:
            rituals.append("Box breathing: 4-4-4-4 cycle for five minutes.")
        if context.environmental_complexity > 0.6:
            rituals.append("Externalise priorities with a three-point capture.")
        if stability_index < 0.5:
            rituals.append("Run a two-minute sensory scan to reset baseline.")
        if context.future_snapshot:
            rituals.append(f"Visualise future state: {context.future_snapshot}.")
        return tuple(dict.fromkeys(rituals))  # preserve order, remove duplicates

    def _narrative_summary(
        self,
        context: ConsciousnessContext,
        awareness_index: float,
        readiness_index: float,
        stability_index: float,
    ) -> str:
        segments = [
            f"Mission '{context.mission}' on {context.time_horizon} horizon.",
            f"Awareness {awareness_index:.2f}, readiness {readiness_index:.2f}, stability {stability_index:.2f}.",
        ]
        if context.is_overloaded:
            segments.append("System overloaded: prioritise regulation and clarity resets.")
        elif context.is_high_opportunity:
            segments.append("Window of opportunity: orient focus toward expansion moves.")
        else:
            segments.append("State steady: continue adaptive monitoring.")
        if context.future_snapshot:
            segments.append(f"Anchor to future snapshot: {context.future_snapshot}.")
        return " ".join(segments)
