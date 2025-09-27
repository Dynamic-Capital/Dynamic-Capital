"""Implicit memory capture and integration heuristics."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ImplicitMemoryTrace",
    "MemoryContext",
    "ImplicitMemoryReport",
    "DynamicImplicitMemory",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


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


@dataclass(slots=True)
class ImplicitMemoryTrace:
    """Snapshot of an implicit memory imprint."""

    cue: str
    modality: str = "general"
    emotional_valence: float = 0.0
    salience: float = 0.5
    body_activation: float = 0.5
    safety_signal: float = 0.5
    integration_success: float = 0.0
    repetitions: int = 1
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    notes: str | None = None

    def __post_init__(self) -> None:
        cue = self.cue.strip()
        if not cue:
            raise ValueError("cue must not be empty")
        self.cue = cue
        self.modality = self.modality.strip().lower() or "general"
        self.emotional_valence = _clamp(float(self.emotional_valence), lower=-1.0, upper=1.0)
        self.salience = _clamp(float(self.salience))
        self.body_activation = _clamp(float(self.body_activation))
        self.safety_signal = _clamp(float(self.safety_signal))
        self.integration_success = _clamp(float(self.integration_success))
        self.repetitions = max(int(self.repetitions), 0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        if self.notes is not None:
            cleaned = self.notes.strip()
            self.notes = cleaned if cleaned else None


@dataclass(slots=True)
class MemoryContext:
    """Context describing the practitioner's present state."""

    intention: str
    physiological_regulation: float
    stress_level: float
    novelty: float
    relational_support: float
    environmental_safety: float
    sleep_quality: float = 0.5
    practice_time: float = 0.5
    anchors: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        intention = self.intention.strip()
        if not intention:
            raise ValueError("intention must not be empty")
        self.intention = intention
        self.physiological_regulation = _clamp(float(self.physiological_regulation))
        self.stress_level = _clamp(float(self.stress_level))
        self.novelty = _clamp(float(self.novelty))
        self.relational_support = _clamp(float(self.relational_support))
        self.environmental_safety = _clamp(float(self.environmental_safety))
        self.sleep_quality = _clamp(float(self.sleep_quality))
        self.practice_time = _clamp(float(self.practice_time))
        self.anchors = tuple(anchor.strip() for anchor in self.anchors if anchor.strip())

    @property
    def is_overloaded(self) -> bool:
        return self.stress_level >= 0.7 or self.novelty >= 0.75


@dataclass(slots=True)
class ImplicitMemoryReport:
    """Summary of implicit memory priming and integration support."""

    priming_index: float
    integration_readiness: float
    regulation_need: float
    dominant_modalities: tuple[str, ...]
    reconsolidation_strategies: tuple[str, ...]
    supportive_actions: tuple[str, ...]
    narrative: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "priming_index": self.priming_index,
            "integration_readiness": self.integration_readiness,
            "regulation_need": self.regulation_need,
            "dominant_modalities": list(self.dominant_modalities),
            "reconsolidation_strategies": list(self.reconsolidation_strategies),
            "supportive_actions": list(self.supportive_actions),
            "narrative": self.narrative,
        }


class DynamicImplicitMemory:
    """Capture implicit memory traces and recommend integration protocols."""

    def __init__(self, *, history: int = 80) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._traces: Deque[ImplicitMemoryTrace] = deque(maxlen=history)

    # --------------------------------------------------------------- intake
    def capture(self, trace: ImplicitMemoryTrace | Mapping[str, object]) -> ImplicitMemoryTrace:
        resolved = self._coerce_trace(trace)
        self._traces.append(resolved)
        return resolved

    def extend(self, traces: Iterable[ImplicitMemoryTrace | Mapping[str, object]]) -> None:
        for trace in traces:
            self.capture(trace)

    def reset(self) -> None:
        self._traces.clear()

    def _coerce_trace(self, trace: ImplicitMemoryTrace | Mapping[str, object]) -> ImplicitMemoryTrace:
        if isinstance(trace, ImplicitMemoryTrace):
            return trace
        if isinstance(trace, Mapping):
            payload: MutableMapping[str, object] = dict(trace)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return ImplicitMemoryTrace(**payload)  # type: ignore[arg-type]
        raise TypeError("trace must be ImplicitMemoryTrace or mapping")

    # -------------------------------------------------------------- reporting
    def generate_report(self, context: MemoryContext) -> ImplicitMemoryReport:
        if not self._traces:
            raise RuntimeError("no implicit memory traces captured")

        priming = self._priming_index(context)
        readiness = self._integration_readiness(context)
        regulation = self._regulation_need(context)
        modalities = self._dominant_modalities()
        strategies = self._reconsolidation_strategies(context, readiness, priming)
        actions = self._supportive_actions(context, regulation)
        narrative = self._narrative(context, priming, readiness, regulation, modalities)

        return ImplicitMemoryReport(
            priming_index=round(priming, 3),
            integration_readiness=round(readiness, 3),
            regulation_need=round(regulation, 3),
            dominant_modalities=modalities,
            reconsolidation_strategies=strategies,
            supportive_actions=actions,
            narrative=narrative,
        )

    # --------------------------------------------------------------- helpers
    def _trace_weight(self, trace: ImplicitMemoryTrace) -> float:
        base = trace.salience * (1.0 + 0.25 * trace.repetitions)
        return max(base, 0.0)

    def _weighted_metric(self, selector: str | callable[[ImplicitMemoryTrace], float]) -> float:
        if isinstance(selector, str):
            extractor = lambda trace: getattr(trace, selector)  # type: ignore[misc]
        else:
            extractor = selector
        total_weight = sum(self._trace_weight(trace) for trace in self._traces)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(extractor(trace) * self._trace_weight(trace) for trace in self._traces)
        return aggregate / total_weight

    def _priming_index(self, context: MemoryContext) -> float:
        salience = self._weighted_metric("salience")
        body = self._weighted_metric("body_activation")
        emotional = self._weighted_metric(lambda trace: abs(trace.emotional_valence))
        safety = self._weighted_metric("safety_signal")
        base = 0.4 * salience + 0.3 * body + 0.2 * emotional - 0.25 * safety
        modifier = 0.15 * context.novelty + 0.1 * context.stress_level
        modifier -= 0.1 * context.environmental_safety
        modifier -= 0.05 * context.physiological_regulation
        return _clamp(base + modifier)

    def _integration_readiness(self, context: MemoryContext) -> float:
        safety = self._weighted_metric("safety_signal")
        integration = self._weighted_metric("integration_success")
        regulation = context.physiological_regulation
        support = context.relational_support
        base = 0.35 * safety + 0.25 * integration + 0.2 * regulation + 0.15 * support
        base += 0.1 * context.practice_time + 0.05 * context.sleep_quality
        base -= 0.2 * context.stress_level
        return _clamp(base)

    def _regulation_need(self, context: MemoryContext) -> float:
        arousal = self._weighted_metric("body_activation")
        threat = self._weighted_metric(lambda trace: 1.0 - trace.safety_signal)
        negative_valence = self._weighted_metric(lambda trace: max(-trace.emotional_valence, 0.0))
        base = 0.45 * arousal + 0.35 * negative_valence + 0.25 * threat
        modifier = 0.2 * context.stress_level + 0.1 * (1.0 - context.environmental_safety)
        modifier -= 0.2 * context.physiological_regulation + 0.1 * context.relational_support
        return _clamp(base + modifier)

    def _dominant_modalities(self) -> tuple[str, ...]:
        counts: Counter[str] = Counter()
        for trace in self._traces:
            counts[trace.modality] += self._trace_weight(trace)
        if not counts:
            return ()
        return tuple(modality for modality, _ in counts.most_common(3))

    def _reconsolidation_strategies(
        self,
        context: MemoryContext,
        readiness: float,
        priming: float,
    ) -> tuple[str, ...]:
        strategies: list[str] = []
        if readiness < 0.5:
            strategies.append("Establish safety cues before deep recall work")
        else:
            strategies.append("Invite gentle exposure with grounding anchors")
        if priming >= 0.6:
            strategies.append("Pair dominant cues with new neutral associations")
        else:
            strategies.append("Reinforce neutral associations through spaced rehearsal")
        if context.practice_time < 0.4:
            strategies.append("Schedule brief daily integration reps")
        if context.relational_support < 0.5:
            strategies.append("Enlist trusted support for co-regulation while revisiting cues")
        if context.is_overloaded:
            strategies.append("Limit recall intensity until novelty pressure eases")
        deduplicated = []
        for strategy in strategies:
            if strategy not in deduplicated:
                deduplicated.append(strategy)
        return tuple(deduplicated)

    def _supportive_actions(self, context: MemoryContext, regulation: float) -> tuple[str, ...]:
        actions: list[str] = []
        if regulation >= 0.6:
            actions.append("Engage in down-regulation breathwork before cue exposure")
        else:
            actions.append("Maintain light body scans to track subtle shifts")
        if context.stress_level >= 0.5:
            actions.append("Plan micro-recoveries around demanding blocks")
        if context.physiological_regulation < 0.5:
            actions.append("Reinforce hydration and nourishment routines")
        if context.relational_support < 0.4:
            actions.append("Signal the need for co-regulation check-ins")
        if context.sleep_quality < 0.5:
            actions.append("Prioritise extended sleep hygiene this evening")
        deduplicated = []
        for action in actions:
            if action not in deduplicated:
                deduplicated.append(action)
        return tuple(deduplicated)

    def _narrative(
        self,
        context: MemoryContext,
        priming: float,
        readiness: float,
        regulation: float,
        modalities: tuple[str, ...],
    ) -> str:
        modalities_text = ", ".join(modalities) if modalities else "general"
        narrative_parts = [
            f"Implicit memory priming sits near {priming:.0%} with dominant modalities {modalities_text}.",
            f"Integration readiness is tracking at {readiness:.0%} while regulation need is {regulation:.0%}.",
            f"Intention: {context.intention}.",
        ]
        if context.is_overloaded:
            narrative_parts.append("System appears overloaded; pace reconsolidation efforts conservatively.")
        elif readiness > regulation:
            narrative_parts.append("You can lean into integration reps while maintaining steady supports.")
        else:
            narrative_parts.append("Prioritise nervous system settling before deep integration work.")
        if context.anchors:
            anchors = ", ".join(context.anchors)
            narrative_parts.append(f"Available anchors: {anchors}.")
        return " ".join(narrative_parts)
