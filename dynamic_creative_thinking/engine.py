"""Creative ideation engine for Dynamic Capital's experimentation loops."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CreativeSignal",
    "CreativeContext",
    "CreativeFrame",
    "DynamicCreativeThinking",
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
class CreativeSignal:
    """Creative observation captured during an ideation loop."""

    motif: str
    concept: str
    originality: float = 0.5
    resonance: float = 0.5
    feasibility: float = 0.5
    energy: float = 0.5
    risk: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    references: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.motif = _normalise_lower(self.motif)
        self.concept = _normalise_text(self.concept)
        self.originality = _clamp(float(self.originality))
        self.resonance = _clamp(float(self.resonance))
        self.feasibility = _clamp(float(self.feasibility))
        self.energy = _clamp(float(self.energy))
        self.risk = _clamp(float(self.risk))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.references = _normalise_tuple(self.references)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class CreativeContext:
    """Context describing the creative challenge."""

    challenge: str
    horizon: str
    cadence_pressure: float
    ambiguity_tolerance: float
    risk_appetite: float
    resource_flexibility: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    inspiration_sources: tuple[str, ...] = field(default_factory=tuple)
    guiding_principles: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.challenge = _normalise_text(self.challenge)
        self.horizon = _normalise_text(self.horizon)
        self.cadence_pressure = _clamp(float(self.cadence_pressure))
        self.ambiguity_tolerance = _clamp(float(self.ambiguity_tolerance))
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.resource_flexibility = _clamp(float(self.resource_flexibility))
        self.constraints = _normalise_tuple(self.constraints)
        self.inspiration_sources = _normalise_tuple(self.inspiration_sources)
        self.guiding_principles = _normalise_tuple(self.guiding_principles)

    @property
    def is_sprint(self) -> bool:
        return self.cadence_pressure >= 0.7

    @property
    def is_high_ambiguity(self) -> bool:
        return self.ambiguity_tolerance >= 0.6

    @property
    def is_resource_constrained(self) -> bool:
        return self.resource_flexibility <= 0.4


@dataclass(slots=True)
class CreativeFrame:
    """Synthesised output describing the creative posture."""

    spark_index: float
    adoption_readiness: float
    exploration_depth: float
    momentum: float
    dominant_motifs: tuple[str, ...]
    friction_points: tuple[str, ...]
    recommended_rituals: tuple[str, ...]
    narrative: str
    suggested_experiments: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "spark_index": self.spark_index,
            "adoption_readiness": self.adoption_readiness,
            "exploration_depth": self.exploration_depth,
            "momentum": self.momentum,
            "dominant_motifs": list(self.dominant_motifs),
            "friction_points": list(self.friction_points),
            "recommended_rituals": list(self.recommended_rituals),
            "narrative": self.narrative,
            "suggested_experiments": list(self.suggested_experiments),
        }


class DynamicCreativeThinking:
    """Aggregate creative signals and produce a structured frame."""

    def __init__(self, *, history: int = 50) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[CreativeSignal] = deque(maxlen=history)

    # ---------------------------------------------------------------- intake
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

    # ------------------------------------------------------------- computation
    def build_frame(self, context: CreativeContext) -> CreativeFrame:
        if not self._signals:
            raise RuntimeError("no creative signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("creative signals have zero weight")

        spark = self._weighted_metric(
            lambda s: (0.6 * s.originality) + (0.4 * s.energy)
        )
        adoption = self._weighted_metric(
            lambda s: (0.6 * ((s.resonance + s.feasibility) / 2.0))
            + (0.4 * (1.0 - s.risk))
        )
        momentum = self._weighted_metric(lambda s: s.energy)
        exploration = self._exploration_depth()

        motifs = self._dominant_motifs()
        friction_points = self._friction_points(spark, adoption, exploration, momentum)
        recommended_rituals = self._recommend_rituals(
            context, spark, adoption, exploration, momentum
        )
        narrative = self._narrative(
            context, spark, adoption, exploration, momentum, motifs
        )
        experiments = self._experiments(
            context, friction_points, recommended_rituals
        )

        return CreativeFrame(
            spark_index=round(_clamp(spark), 3),
            adoption_readiness=round(_clamp(adoption), 3),
            exploration_depth=round(_clamp(exploration), 3),
            momentum=round(_clamp(momentum), 3),
            dominant_motifs=motifs,
            friction_points=friction_points,
            recommended_rituals=recommended_rituals,
            narrative=narrative,
            suggested_experiments=experiments,
        )

    def _weighted_metric(self, selector: Callable[[CreativeSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _exploration_depth(self) -> float:
        entry_count = sum(1 for signal in self._signals if signal.weight > 0)
        if entry_count == 0:
            return 0.0

        motif_weights: Counter[str] = Counter()
        tag_sum = 0
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            motif_weights[signal.motif] += 1
            tag_sum += min(len(signal.tags), 5)

        motif_evenness = _clamp(len(motif_weights) / entry_count)
        tag_diversity = _clamp(tag_sum / (5.0 * entry_count))
        originality_baseline = self._weighted_metric(lambda s: s.originality)

        raw = (0.4 * motif_evenness) + (0.3 * tag_diversity) + (0.3 * originality_baseline)
        return _clamp(raw)

    def _dominant_motifs(self) -> tuple[str, ...]:
        weighted: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            weighted[signal.motif] += signal.weight
        if not weighted:
            return ()
        sorted_motifs = sorted(weighted.items(), key=lambda item: (-item[1], item[0]))
        return tuple(motif for motif, _ in sorted_motifs[:3])

    def _friction_points(
        self,
        spark: float,
        adoption: float,
        exploration: float,
        momentum: float,
    ) -> tuple[str, ...]:
        points: list[str] = []
        if spark <= 0.45:
            points.append("Creative spark is muted—run a divergent warm-up sprint")
        if adoption <= 0.55:
            points.append("Prototype viability is weak—run fast validation loops")
        if exploration <= 0.35:
            points.append("Exploration is narrow—expand inspiration scouting")
        if momentum <= 0.4:
            points.append("Momentum is fading—schedule an energising jam session")
        if spark >= 0.75 and adoption <= 0.6:
            points.append("Balance bold ideas with quick wins to preserve credibility")
        return tuple(dict.fromkeys(points))

    def _recommend_rituals(
        self,
        context: CreativeContext,
        spark: float,
        adoption: float,
        exploration: float,
        momentum: float,
    ) -> tuple[str, ...]:
        rituals: list[str] = []
        if context.is_sprint:
            rituals.append("Lightning Decision Jam")
        if context.is_high_ambiguity:
            rituals.append("What-if Futures Wheel")
        if context.is_resource_constrained:
            rituals.append("Constraint Remix Challenge")
        if spark >= 0.65:
            rituals.append("Storyboarding Sprint")
        if adoption >= 0.6 and momentum >= 0.5:
            rituals.append("Live Prototype Walkthrough")
        if exploration <= 0.35:
            rituals.append("Divergent Research Spike")
        if momentum >= 0.7:
            rituals.append("Momentum Harvest Retro")

        ordered: list[str] = []
        seen: set[str] = set()
        for ritual in rituals:
            if ritual not in seen:
                seen.add(ritual)
                ordered.append(ritual)
        return tuple(ordered)

    def _narrative(
        self,
        context: CreativeContext,
        spark: float,
        adoption: float,
        exploration: float,
        momentum: float,
        motifs: tuple[str, ...],
    ) -> str:
        motif_summary = ", ".join(motifs) if motifs else "no dominant motifs"
        return (
            f"Challenge: {context.challenge}. "
            f"Spark at {int(round(spark * 100))}% with adoption readiness {int(round(adoption * 100))}%. "
            f"Exploration depth at {int(round(exploration * 100))}% and momentum {int(round(momentum * 100))}%. "
            f"Motifs: {motif_summary}."
        )

    def _experiments(
        self,
        context: CreativeContext,
        friction_points: tuple[str, ...],
        rituals: tuple[str, ...],
    ) -> tuple[str, ...]:
        steps: list[str] = []
        if friction_points:
            steps.extend(friction_points)
        if rituals:
            steps.append("Plan rituals: " + ", ".join(rituals))
        if context.constraints:
            steps.append("Reframe constraints with: " + ", ".join(context.constraints))
        if context.inspiration_sources:
            steps.append("Revisit inspiration sources: " + ", ".join(context.inspiration_sources))
        if context.guiding_principles:
            steps.append("Anchor decisions to principles: " + ", ".join(context.guiding_principles))
        if not steps:
            steps.append("Schedule a micro-experiment and capture live reactions")
        return tuple(steps)
