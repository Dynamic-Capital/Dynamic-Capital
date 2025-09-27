"""Dynamic quote intelligence primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "QuoteIdea",
    "QuoteContext",
    "QuoteDigest",
    "DynamicQuote",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


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


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class QuoteIdea:
    """Single quote candidate captured by the system."""

    theme: str
    text: str
    author: str
    originality: float = 0.5
    resonance: float = 0.5
    clarity: float = 0.5
    energy: float = 0.5
    longevity: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.theme = _normalise_lower(self.theme)
        self.text = _normalise_text(self.text)
        self.author = _normalise_text(self.author)
        self.originality = _clamp(float(self.originality))
        self.resonance = _clamp(float(self.resonance))
        self.clarity = _clamp(float(self.clarity))
        self.energy = _clamp(float(self.energy))
        self.longevity = _clamp(float(self.longevity))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.sources = _normalise_tuple(self.sources)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def signature_strength(self) -> float:
        base = (
            self.originality * 0.4
            + self.resonance * 0.3
            + self.clarity * 0.2
            + self.longevity * 0.1
        )
        return _clamp(base)

    @property
    def is_signature(self) -> bool:
        return self.signature_strength >= 0.7


@dataclass(slots=True)
class QuoteContext:
    """Context used when composing a quote lineup."""

    campaign: str
    audience: str
    tone: str
    urgency: float
    novelty_pressure: float
    emotional_intensity: float
    preferred_tags: tuple[str, ...] = field(default_factory=tuple)
    avoid_topics: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 3

    def __post_init__(self) -> None:
        self.campaign = _normalise_text(self.campaign)
        self.audience = _normalise_text(self.audience)
        self.tone = _normalise_text(self.tone)
        self.urgency = _clamp(float(self.urgency))
        self.novelty_pressure = _clamp(float(self.novelty_pressure))
        self.emotional_intensity = _clamp(float(self.emotional_intensity))
        self.preferred_tags = _normalise_tags(self.preferred_tags)
        self.avoid_topics = _normalise_tags(self.avoid_topics)
        limit = int(self.highlight_limit)
        if limit <= 0:
            raise ValueError("highlight_limit must be positive")
        self.highlight_limit = limit

    @property
    def is_high_urgency(self) -> bool:
        return self.urgency >= 0.6

    @property
    def seeks_novelty(self) -> bool:
        return self.novelty_pressure >= 0.6

    @property
    def requires_emotional_depth(self) -> bool:
        return self.emotional_intensity >= 0.6


@dataclass(slots=True)
class QuoteDigest:
    """Synthesised output for quote orchestration."""

    signature_index: float
    resonance_pulse: float
    clarity_pulse: float
    energy_momentum: float
    highlight_quotes: tuple[str, ...]
    activation_prompts: tuple[str, ...]
    refinement_actions: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "signature_index": self.signature_index,
            "resonance_pulse": self.resonance_pulse,
            "clarity_pulse": self.clarity_pulse,
            "energy_momentum": self.energy_momentum,
            "highlight_quotes": list(self.highlight_quotes),
            "activation_prompts": list(self.activation_prompts),
            "refinement_actions": list(self.refinement_actions),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# dynamic orchestrator


class DynamicQuote:
    """Aggregate quote ideas and produce a dynamic digest."""

    def __init__(self, *, history: int = 25) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._ideas: Deque[QuoteIdea] = deque(maxlen=history)

    def __len__(self) -> int:
        return len(self._ideas)

    def capture(self, idea: QuoteIdea | Mapping[str, object]) -> QuoteIdea:
        resolved = self._coerce_idea(idea)
        self._ideas.append(resolved)
        return resolved

    def extend(self, ideas: Iterable[QuoteIdea | Mapping[str, object]]) -> None:
        for idea in ideas:
            self.capture(idea)

    def reset(self) -> None:
        self._ideas.clear()

    def _coerce_idea(self, idea: QuoteIdea | Mapping[str, object]) -> QuoteIdea:
        if isinstance(idea, QuoteIdea):
            return idea
        if isinstance(idea, Mapping):
            payload: MutableMapping[str, object] = dict(idea)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return QuoteIdea(**payload)  # type: ignore[arg-type]
        raise TypeError("idea must be QuoteIdea or mapping")

    def _score_quote(self, idea: QuoteIdea, preferred_tags: set[str]) -> float:
        base = (
            idea.originality * 0.3
            + idea.resonance * 0.3
            + idea.clarity * 0.2
            + idea.energy * 0.1
            + idea.longevity * 0.1
        )
        focus_bonus = 0.0
        if preferred_tags and preferred_tags.intersection(idea.tags):
            focus_bonus += 0.1
        if idea.is_signature:
            focus_bonus += 0.05
        return (base + focus_bonus) * max(idea.weight, 0.1)

    def generate_digest(
        self, context: QuoteContext, *, limit: int | None = None
    ) -> QuoteDigest:
        if not self._ideas:
            raise RuntimeError("no quote ideas captured")

        highlight_limit = context.highlight_limit if limit is None else int(limit)
        if highlight_limit <= 0:
            raise ValueError("limit must be positive")

        ideas = list(self._ideas)
        preferred = set(context.preferred_tags)
        avoided = set(context.avoid_topics)

        signature_index = _clamp(fmean(idea.signature_strength for idea in ideas))
        resonance_pulse = _clamp(fmean(idea.resonance for idea in ideas))
        clarity_pulse = _clamp(fmean(idea.clarity for idea in ideas))
        energy_momentum = _clamp(fmean(idea.energy for idea in ideas))

        scored = sorted(
            ideas,
            key=lambda idea: self._score_quote(idea, preferred),
            reverse=True,
        )
        highlight_slice = scored[:highlight_limit]
        highlight_quotes = tuple(idea.text for idea in highlight_slice)

        activation_prompts: list[str] = []
        for idea in highlight_slice:
            activation_prompts.append(
                (
                    f"Deploy the quote '{idea.text}' to energise {context.audience} "
                    f"during the {context.campaign} push."
                )
            )
        if context.seeks_novelty:
            activation_prompts.append(
                "Host a live feedback loop to surface fresh quote riffs from the field."
            )
        if context.requires_emotional_depth and resonance_pulse < context.emotional_intensity:
            activation_prompts.append(
                "Pair the signature line with a vivid customer vignette to lift resonance."
            )

        refinement_actions: list[str] = []
        if context.is_high_urgency:
            refinement_actions.append(
                "Prioritise publishing the highlight quotes within the next activation cycle."
            )
        if context.seeks_novelty and signature_index < 0.75:
            refinement_actions.append(
                "Workshop new metaphors with the narrative squad to satisfy novelty pressure."
            )
        if context.requires_emotional_depth and resonance_pulse < 0.6:
            refinement_actions.append(
                "Layer sensory detail into supporting copy to deepen emotional pull."
            )
        if avoided:
            listed = ", ".join(sorted(avoided))
            refinement_actions.append(
                f"Audit copy to ensure avoided topics stay out of circulation: {listed}."
            )
        if not refinement_actions:
            refinement_actions.append("Maintain cadence of quote curation and monitoring.")

        narrative_parts = [
            f"Dynamic quote lineup for {context.campaign} targeting {context.audience}.",
            f"Tone guidance set to {context.tone.lower()} with signature index {signature_index:.0%}.",
            f"Resonance running at {resonance_pulse:.0%} and clarity at {clarity_pulse:.0%}.",
        ]
        if context.is_high_urgency:
            narrative_parts.append("Urgency is elevated—ship leading lines rapidly.")
        if context.seeks_novelty:
            narrative_parts.append("Novelty pressure is active; refresh metaphors frequently.")
        if context.requires_emotional_depth:
            narrative_parts.append("Emotional intensity expectations remain high.")
        if preferred:
            narrative_parts.append(
                "Prioritised motifs: " + ", ".join(sorted(preferred)) + "."
            )
        if avoided:
            narrative_parts.append(
                "Avoid sensitive motifs: " + ", ".join(sorted(avoided)) + "."
            )

        narrative = " ".join(narrative_parts)

        return QuoteDigest(
            signature_index=signature_index,
            resonance_pulse=resonance_pulse,
            clarity_pulse=clarity_pulse,
            energy_momentum=energy_momentum,
            highlight_quotes=highlight_quotes,
            activation_prompts=tuple(activation_prompts),
            refinement_actions=tuple(refinement_actions),
            narrative=narrative,
        )
