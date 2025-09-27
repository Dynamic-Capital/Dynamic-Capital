"""Wisdom orchestration engine for Dynamic Capital's reflective rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "WisdomSignal",
    "WisdomContext",
    "WisdomFrame",
    "DynamicWisdomEngine",
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


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
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
class WisdomSignal:
    """Signal capturing embodied wisdom from a reflective dialogue."""

    lineage: str
    insight: str
    clarity: float = 0.5
    humility: float = 0.5
    empathy: float = 0.5
    foresight: float = 0.5
    prudence: float = 0.5
    stakes: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    references: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.lineage = _normalise_lower(self.lineage)
        self.insight = _normalise_text(self.insight)
        self.clarity = _clamp(float(self.clarity))
        self.humility = _clamp(float(self.humility))
        self.empathy = _clamp(float(self.empathy))
        self.foresight = _clamp(float(self.foresight))
        self.prudence = _clamp(float(self.prudence))
        self.stakes = _clamp(float(self.stakes))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.references = _normalise_tuple(self.references)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class WisdomContext:
    """Context describing the decision canvas for wisdom evaluation."""

    situation: str
    horizon: str
    uncertainty: float
    reversibility: float
    moral_weight: float
    alignment: float
    stewardship: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    values: tuple[str, ...] = field(default_factory=tuple)
    learning_agenda: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.situation = _normalise_text(self.situation)
        self.horizon = _normalise_text(self.horizon)
        self.uncertainty = _clamp(float(self.uncertainty))
        self.reversibility = _clamp(float(self.reversibility))
        self.moral_weight = _clamp(float(self.moral_weight))
        self.alignment = _clamp(float(self.alignment))
        self.stewardship = _clamp(float(self.stewardship))
        self.constraints = _normalise_tuple(self.constraints)
        self.values = _normalise_tuple(self.values)
        self.learning_agenda = _normalise_tuple(self.learning_agenda)

    @property
    def is_high_uncertainty(self) -> bool:
        return self.uncertainty >= 0.6

    @property
    def is_high_stakes(self) -> bool:
        return self.moral_weight >= 0.6 or self.reversibility <= 0.3

    @property
    def is_alignment_fragile(self) -> bool:
        return self.alignment <= 0.4

    @property
    def is_stewardship_mandate(self) -> bool:
        return self.stewardship >= 0.7


@dataclass(slots=True)
class WisdomFrame:
    """Synthesised posture for wise decision-making."""

    discernment_index: float
    ethical_alignment: float
    temporal_balance: float
    stakeholder_resonance: float
    dominant_lineages: tuple[str, ...]
    tension_alerts: tuple[str, ...]
    recommended_practices: tuple[str, ...]
    narrative: str
    reflection_prompts: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "discernment_index": self.discernment_index,
            "ethical_alignment": self.ethical_alignment,
            "temporal_balance": self.temporal_balance,
            "stakeholder_resonance": self.stakeholder_resonance,
            "dominant_lineages": self.dominant_lineages,
            "tension_alerts": self.tension_alerts,
            "recommended_practices": self.recommended_practices,
            "narrative": self.narrative,
            "reflection_prompts": self.reflection_prompts,
        }


class DynamicWisdomEngine:
    """Aggregates wisdom signals into actionable guidance."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[WisdomSignal] = deque(maxlen=history)

    # ---------------------------------------------------------------- intake
    def capture(self, signal: WisdomSignal | Mapping[str, object]) -> WisdomSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[WisdomSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: WisdomSignal | Mapping[str, object]) -> WisdomSignal:
        if isinstance(signal, WisdomSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return WisdomSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be WisdomSignal or mapping")

    # ------------------------------------------------------------- computation
    def build_frame(self, context: WisdomContext) -> WisdomFrame:
        if not self._signals:
            raise RuntimeError("no wisdom signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("wisdom signals have zero weight")

        discernment = self._weighted_metric(lambda s: (s.clarity * 0.6) + (s.prudence * 0.4))
        integrity = self._weighted_metric(lambda s: (s.empathy + s.humility + s.prudence) / 3.0)
        foresight_depth = self._weighted_metric(lambda s: s.foresight)
        impact_pressure = self._weighted_metric(lambda s: s.stakes)
        resonance = self._weighted_metric(lambda s: (s.empathy * 0.6) + (s.humility * 0.4))

        temporal_balance = _clamp((foresight_depth * 0.7) + ((1.0 - impact_pressure) * 0.3))
        ethical_alignment = _clamp(integrity)
        discernment_index = _clamp(discernment)
        stakeholder_resonance = _clamp(resonance)

        lineages = self._dominant_lineages()
        tensions = self._tension_alerts(
            context,
            discernment_index,
            ethical_alignment,
            temporal_balance,
            impact_pressure,
        )
        practices = self._recommend_practices(
            context,
            ethical_alignment,
            temporal_balance,
            impact_pressure,
        )
        narrative = self._compose_narrative(
            context,
            discernment_index,
            ethical_alignment,
            temporal_balance,
            stakeholder_resonance,
            impact_pressure,
            lineages,
        )
        prompts = self._reflection_prompts(context, tensions, practices)

        return WisdomFrame(
            discernment_index=round(discernment_index, 3),
            ethical_alignment=round(ethical_alignment, 3),
            temporal_balance=round(temporal_balance, 3),
            stakeholder_resonance=round(stakeholder_resonance, 3),
            dominant_lineages=lineages,
            tension_alerts=tensions,
            recommended_practices=practices,
            narrative=narrative,
            reflection_prompts=prompts,
        )

    def _weighted_metric(self, selector: Callable[[WisdomSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _dominant_lineages(self) -> tuple[str, ...]:
        weighted: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            weighted[signal.lineage] += signal.weight
        if not weighted:
            return ()
        sorted_lineages = sorted(
            weighted.items(),
            key=lambda item: (-item[1], item[0]),
        )
        return tuple(lineage for lineage, _ in sorted_lineages[:3])

    def _tension_alerts(
        self,
        context: WisdomContext,
        discernment: float,
        ethical_alignment: float,
        temporal_balance: float,
        impact_pressure: float,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if context.is_high_uncertainty and discernment <= 0.5:
            alerts.append("Clarity gap under high uncertainty: slow decisions and test assumptions")
        if context.is_high_stakes and ethical_alignment <= 0.6:
            alerts.append("Integrity risk on high stakes choice: surface dissent and values checks")
        if context.is_stewardship_mandate and temporal_balance <= 0.55:
            alerts.append("Long-term mandate underweighted: expand future scenario exploration")
        if impact_pressure >= 0.7 and context.reversibility <= 0.4:
            alerts.append("High impact with limited reversibility: establish guardrails and exit ramps")
        if context.is_alignment_fragile and ethical_alignment <= 0.7:
            alerts.append("Fragile stakeholder alignment: convene listening circle before commitment")
        return tuple(alerts)

    def _recommend_practices(
        self,
        context: WisdomContext,
        ethical_alignment: float,
        temporal_balance: float,
        impact_pressure: float,
    ) -> tuple[str, ...]:
        practices: list[str] = []
        if context.is_high_uncertainty:
            practices.append("Run multi-order consequence mapping")
        if context.is_high_stakes:
            practices.append("Host an ethical pre-mortem with diverse council")
        if ethical_alignment <= 0.65:
            practices.append("Invite lived experience testimony to challenge assumptions")
        if temporal_balance <= 0.5:
            practices.append("Layer near, mid, and far-horizon options")
        if context.is_alignment_fragile:
            practices.append("Document shared principles and clarify non-negotiables")
        if impact_pressure >= 0.75:
            practices.append("Define fail-safes and monitoring cadence")
        if not practices:
            practices.append("Archive insights and schedule wisdom integration review")
        seen: set[str] = set()
        ordered: list[str] = []
        for practice in practices:
            if practice not in seen:
                seen.add(practice)
                ordered.append(practice)
        return tuple(ordered)

    def _compose_narrative(
        self,
        context: WisdomContext,
        discernment: float,
        ethical_alignment: float,
        temporal_balance: float,
        stakeholder_resonance: float,
        impact_pressure: float,
        lineages: tuple[str, ...],
    ) -> str:
        lineage_summary = ", ".join(lineages) if lineages else "no dominant lineages"
        return (
            f"Situation: {context.situation}. "
            f"Discernment at {int(round(discernment * 100))}%. "
            f"Ethical alignment at {int(round(ethical_alignment * 100))}%. "
            f"Temporal balance at {int(round(temporal_balance * 100))}%. "
            f"Stakeholder resonance at {int(round(stakeholder_resonance * 100))}%. "
            f"Impact pressure {int(round(impact_pressure * 100))}%. "
            f"Lineages: {lineage_summary}."
        )

    def _reflection_prompts(
        self,
        context: WisdomContext,
        tensions: Sequence[str],
        practices: Sequence[str],
    ) -> tuple[str, ...]:
        prompts: list[str] = []
        for tension in tensions:
            prompts.append(f"What would resolve: {tension}?")
        if context.learning_agenda:
            prompts.append("Revisit learning agenda: " + ", ".join(context.learning_agenda))
        if practices:
            prompts.append("Which practice unlocks the next wise move?" )
        if context.values:
            prompts.append("How do we honour: " + ", ".join(context.values))
        if not prompts:
            prompts.append("Capture emerging wisdom and share with the stewardship circle")
        seen: set[str] = set()
        ordered: list[str] = []
        for prompt in prompts:
            if prompt not in seen:
                seen.add(prompt)
                ordered.append(prompt)
        return tuple(ordered)
