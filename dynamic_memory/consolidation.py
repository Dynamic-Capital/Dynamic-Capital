"""Memory consolidation synthesiser for Dynamic Capital."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MemoryFragment",
    "ConsolidationContext",
    "MemoryConsolidationReport",
    "DynamicMemoryConsolidator",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str, *, default: str = "") -> str:
    cleaned = value.strip().lower()
    return cleaned or default


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
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


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class MemoryFragment:
    """Single captured memory fragment awaiting consolidation."""

    domain: str
    summary: str
    recency: float = 0.5
    relevance: float = 0.5
    novelty: float = 0.5
    emotional_intensity: float = 0.5
    confidence: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    source: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.domain = _normalise_lower(self.domain, default="general")
        self.summary = _normalise_text(self.summary)
        self.recency = _clamp(float(self.recency))
        self.relevance = _clamp(float(self.relevance))
        self.novelty = _clamp(float(self.novelty))
        self.emotional_intensity = _clamp(float(self.emotional_intensity))
        self.confidence = _clamp(float(self.confidence))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.source = _normalise_optional_text(self.source)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class ConsolidationContext:
    """Ambient factors influencing how memory is consolidated."""

    mission: str
    retention_horizon: str
    operational_tempo: float
    cognitive_bandwidth: float
    archive_pressure: float
    environmental_volatility: float
    support_level: float
    fatigue_level: float
    retrieval_pressure: float
    focus_theme: str | None = None

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.retention_horizon = _normalise_text(self.retention_horizon)
        self.operational_tempo = _clamp(float(self.operational_tempo))
        self.cognitive_bandwidth = _clamp(float(self.cognitive_bandwidth))
        self.archive_pressure = _clamp(float(self.archive_pressure))
        self.environmental_volatility = _clamp(float(self.environmental_volatility))
        self.support_level = _clamp(float(self.support_level))
        self.fatigue_level = _clamp(float(self.fatigue_level))
        self.retrieval_pressure = _clamp(float(self.retrieval_pressure))
        self.focus_theme = _normalise_optional_text(self.focus_theme)

    @property
    def is_stretched(self) -> bool:
        return self.operational_tempo > 0.7 or self.archive_pressure > 0.7

    @property
    def is_fatigued(self) -> bool:
        return self.fatigue_level >= 0.6


@dataclass(slots=True)
class MemoryConsolidationReport:
    """Structured report describing consolidation priorities."""

    retention_strength: float
    clarity_index: float
    loss_risk: float
    anchor_topics: tuple[str, ...]
    integration_actions: tuple[str, ...]
    reflection_prompts: tuple[str, ...]
    archival_actions: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "retention_strength": self.retention_strength,
            "clarity_index": self.clarity_index,
            "loss_risk": self.loss_risk,
            "anchor_topics": list(self.anchor_topics),
            "integration_actions": list(self.integration_actions),
            "reflection_prompts": list(self.reflection_prompts),
            "archival_actions": list(self.archival_actions),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# consolidation engine


class DynamicMemoryConsolidator:
    """Aggregate fragments and produce a consolidation report."""

    def __init__(self, *, history: int = 100) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._fragments: Deque[MemoryFragment] = deque(maxlen=history)

    # ------------------------------------------------------------------ intake
    def capture(self, fragment: MemoryFragment | Mapping[str, object]) -> MemoryFragment:
        resolved = self._coerce_fragment(fragment)
        self._fragments.append(resolved)
        return resolved

    def extend(self, fragments: Iterable[MemoryFragment | Mapping[str, object]]) -> None:
        for fragment in fragments:
            self.capture(fragment)

    def reset(self) -> None:
        self._fragments.clear()

    def _coerce_fragment(
        self, fragment: MemoryFragment | Mapping[str, object]
    ) -> MemoryFragment:
        if isinstance(fragment, MemoryFragment):
            return fragment
        if isinstance(fragment, Mapping):
            payload: MutableMapping[str, object] = dict(fragment)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return MemoryFragment(**payload)  # type: ignore[arg-type]
        raise TypeError("fragment must be MemoryFragment or mapping")

    # ---------------------------------------------------------------- reporting
    def generate_report(self, context: ConsolidationContext) -> MemoryConsolidationReport:
        if not self._fragments:
            raise RuntimeError("no memory fragments captured")

        retention = self._retention_strength(context)
        clarity = self._clarity_index(context)
        loss_risk = self._loss_risk(context)
        anchors = self._anchor_topics()
        integration = self._integration_actions(context, retention, clarity, anchors)
        prompts = self._reflection_prompts(context, anchors, loss_risk)
        archival = self._archival_actions(context, loss_risk)
        narrative = self._narrative(context, retention, clarity, loss_risk, anchors)

        return MemoryConsolidationReport(
            retention_strength=round(retention, 3),
            clarity_index=round(clarity, 3),
            loss_risk=round(loss_risk, 3),
            anchor_topics=anchors,
            integration_actions=integration,
            reflection_prompts=prompts,
            archival_actions=archival,
            narrative=narrative,
        )

    # ----------------------------------------------------------------- helpers
    def _weighted_metric(self, selector: Callable[[MemoryFragment], float]) -> float:
        total_weight = sum(fragment.weight for fragment in self._fragments)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(fragment) * fragment.weight for fragment in self._fragments)
        return _clamp(aggregate / total_weight)

    def _retention_strength(self, context: ConsolidationContext) -> float:
        recency = self._weighted_metric(lambda fragment: fragment.recency)
        relevance = self._weighted_metric(lambda fragment: fragment.relevance)
        confidence = self._weighted_metric(lambda fragment: fragment.confidence)
        emotional = self._weighted_metric(lambda fragment: fragment.emotional_intensity)
        base = 0.35 * recency + 0.3 * relevance + 0.2 * confidence + 0.15 * emotional
        modifier = 0.1 * context.support_level - 0.08 * context.environmental_volatility
        modifier += 0.05 * (1.0 - context.fatigue_level)
        return _clamp(base + modifier)

    def _clarity_index(self, context: ConsolidationContext) -> float:
        confidence = self._weighted_metric(lambda fragment: fragment.confidence)
        novelty = self._weighted_metric(lambda fragment: 1.0 - fragment.novelty)
        base = 0.45 * confidence + 0.2 * novelty
        base += 0.2 * context.cognitive_bandwidth + 0.1 * (1.0 - context.operational_tempo)
        base += 0.05 * (1.0 - context.retrieval_pressure)
        base -= 0.05 * context.fatigue_level
        return _clamp(base)

    def _loss_risk(self, context: ConsolidationContext) -> float:
        novelty = self._weighted_metric(lambda fragment: fragment.novelty)
        recency_gap = 1.0 - self._weighted_metric(lambda fragment: fragment.recency)
        base = 0.45 * novelty + 0.3 * recency_gap
        base += 0.2 * context.environmental_volatility
        base += 0.1 * context.archive_pressure
        base += 0.05 * context.fatigue_level
        base -= 0.1 * context.support_level
        return _clamp(base)

    def _anchor_topics(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for fragment in self._fragments:
            weight = fragment.weight if fragment.weight > 0 else 1.0
            if fragment.tags:
                for tag in fragment.tags:
                    counter[tag] += weight
            else:
                counter[fragment.domain] += weight * 0.5
        if not counter:
            counter.update(fragment.domain for fragment in self._fragments)
        anchors = tuple(tag for tag, _ in counter.most_common(5))
        return anchors

    def _integration_actions(
        self,
        context: ConsolidationContext,
        retention: float,
        clarity: float,
        anchors: tuple[str, ...],
    ) -> tuple[str, ...]:
        actions: list[str] = []
        primary_anchor = anchors[0] if anchors else context.mission.lower()
        if retention < 0.55:
            actions.append(
                f"Schedule spaced review on '{primary_anchor}' within {context.retention_horizon}."
            )
        if clarity < 0.6:
            actions.append(
                "Create synthesis brief highlighting key evidence and counterfactuals."
            )
        if context.retrieval_pressure > 0.6:
            actions.append("Prepare quick-reference card for imminent decisions.")
        if not actions:
            actions.append("Log consolidation complete; maintain existing review cadence.")
        return tuple(actions)

    def _reflection_prompts(
        self,
        context: ConsolidationContext,
        anchors: tuple[str, ...],
        loss_risk: float,
    ) -> tuple[str, ...]:
        prompts: list[str] = []
        if anchors:
            prompts.append(
                f"What new signals reinforce the '{anchors[0]}' pattern and which conflict with it?"
            )
        if loss_risk >= 0.6:
            prompts.append("What redundancy can we build so this insight persists under stress?")
        if context.focus_theme:
            prompts.append(
                f"How does this consolidation advance the focus theme '{context.focus_theme}'?"
            )
        if not prompts:
            prompts.append("What adjacent knowledge should be linked to strengthen recall?")
        return tuple(prompts)

    def _archival_actions(
        self, context: ConsolidationContext, loss_risk: float
    ) -> tuple[str, ...]:
        actions: list[str] = []
        if loss_risk > 0.7:
            actions.append("Escalate to redundant storage with priority tagging.")
        elif loss_risk > 0.45:
            actions.append("Archive with enhanced metadata and scheduled validation.")
        else:
            actions.append("Archive to standard knowledge base taxonomy.")
        if context.archive_pressure > 0.6 and loss_risk < 0.6:
            actions.append("Batch low-risk fragments for deferred processing window.")
        return tuple(actions)

    def _narrative(
        self,
        context: ConsolidationContext,
        retention: float,
        clarity: float,
        loss_risk: float,
        anchors: tuple[str, ...],
    ) -> str:
        anchor_text = ", ".join(anchors[:3]) if anchors else "core themes"
        tempo_descriptor = "compressed" if context.is_stretched else "steady"
        fatigue_descriptor = "fatigued" if context.is_fatigued else "energised"
        return (
            f"Consolidation cadence remains {tempo_descriptor} and {fatigue_descriptor}. "
            f"Retention strength sits at {retention:.0%} with clarity at {clarity:.0%}. "
            f"Loss risk is {loss_risk:.0%}, anchored on {anchor_text}."
        )
