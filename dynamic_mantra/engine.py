"""Dynamic mantra orchestration primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MantraSeed",
    "MantraContext",
    "MantraSequence",
    "DynamicMantra",
]


# ---------------------------------------------------------------------------
# helpers


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


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            lowered = cleaned.lower()
            if lowered not in seen:
                seen.add(lowered)
                normalised.append(lowered)
    return tuple(normalised)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class MantraSeed:
    """Source mantra used when composing sequences."""

    phrase: str
    theme: str
    qualities: tuple[str, ...]
    intensity: float = 0.5
    grounding: float = 0.5
    elevation: float = 0.5
    keywords: tuple[str, ...] = field(default_factory=tuple)
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.phrase = _normalise_text(self.phrase)
        self.theme = _normalise_lower(self.theme)
        self.qualities = _normalise_tuple(self.qualities)
        if not self.qualities:
            raise ValueError("qualities must contain at least one entry")
        self.intensity = _clamp(float(self.intensity))
        self.grounding = _clamp(float(self.grounding))
        self.elevation = _clamp(float(self.elevation))
        self.keywords = _normalise_tuple(self.keywords)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class MantraContext:
    """Contextual signals for composing a mantra sequence."""

    intention: str
    focus_theme: str
    mood: str
    energy_level: float
    cycle_length: int
    desired_qualities: tuple[str, ...] = field(default_factory=tuple)
    emphasis_keywords: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.intention = _normalise_text(self.intention)
        self.focus_theme = _normalise_lower(self.focus_theme)
        self.mood = _normalise_lower(self.mood)
        self.energy_level = _clamp(float(self.energy_level))
        length = int(self.cycle_length)
        if length <= 0:
            raise ValueError("cycle_length must be positive")
        self.cycle_length = length
        self.desired_qualities = _normalise_tuple(self.desired_qualities)
        self.emphasis_keywords = _normalise_tuple(self.emphasis_keywords)

    @property
    def is_grounding(self) -> bool:
        return self.mood in {"grounded", "calm", "steady"}

    @property
    def is_elevating(self) -> bool:
        return self.mood in {"elevated", "energised", "energized", "uplifted"}

    @property
    def seeks_expansion(self) -> bool:
        return "expand" in self.desired_qualities or "expansion" in self.desired_qualities


@dataclass(slots=True)
class MantraSequence:
    """Composed mantra delivery."""

    primary_mantra: str
    support_mantras: tuple[str, ...]
    breath_pattern: str
    cadence: str
    visualization: str
    integration_prompts: tuple[str, ...]
    tonic_keywords: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "primary_mantra": self.primary_mantra,
            "support_mantras": list(self.support_mantras),
            "breath_pattern": self.breath_pattern,
            "cadence": self.cadence,
            "visualization": self.visualization,
            "integration_prompts": list(self.integration_prompts),
            "tonic_keywords": list(self.tonic_keywords),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicMantra:
    """Mantra generation engine driven by qualitative seeds."""

    def __init__(self, *, history: int = 120) -> None:
        self._seeds: Deque[MantraSeed] = deque(maxlen=history)

    # ------------------------------------------------------------------ intake
    def ingest(self, seed: MantraSeed | Mapping[str, object]) -> MantraSeed:
        resolved = self._coerce_seed(seed)
        self._seeds.append(resolved)
        return resolved

    def extend(self, seeds: Iterable[MantraSeed | Mapping[str, object]]) -> None:
        for seed in seeds:
            self.ingest(seed)

    def _coerce_seed(self, seed: MantraSeed | Mapping[str, object]) -> MantraSeed:
        if isinstance(seed, MantraSeed):
            return seed
        if isinstance(seed, Mapping):
            payload = dict(seed)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return MantraSeed(**payload)  # type: ignore[arg-type]
        raise TypeError("seed must be MantraSeed or mapping")

    # --------------------------------------------------------------- generation
    def generate(self, context: MantraContext, *, support_count: int = 3) -> MantraSequence:
        pool = self._candidate_pool()
        ranked = sorted(pool, key=lambda seed: self._score_seed(seed, context), reverse=True)
        if not ranked:  # pragma: no cover - defensive guard
            raise ValueError("no mantra seeds available")

        primary = ranked[0]
        unique_support: list[str] = []
        for seed in ranked[1:]:
            if seed.phrase != primary.phrase and seed.phrase not in unique_support:
                unique_support.append(seed.phrase)
            if len(unique_support) >= max(0, support_count):
                break

        if not unique_support:
            unique_support = [seed.phrase for seed in ranked[1:4] if seed.phrase != primary.phrase]

        breath_pattern = self._breath_pattern(context)
        cadence = self._cadence(context)
        visualization = self._visualization(context)
        integration_prompts = self._integration_prompts(context, primary)
        tonic_keywords = self._tonic_keywords(context, ranked)

        return MantraSequence(
            primary_mantra=primary.phrase,
            support_mantras=tuple(unique_support),
            breath_pattern=breath_pattern,
            cadence=cadence,
            visualization=visualization,
            integration_prompts=integration_prompts,
            tonic_keywords=tonic_keywords,
        )

    # ----------------------------------------------------------------- utilities
    def _candidate_pool(self) -> list[MantraSeed]:
        pool = list(self._seeds)
        if len(pool) < 3:
            pool.extend(_DEFAULT_SEEDS)
        return pool

    def _score_seed(self, seed: MantraSeed, context: MantraContext) -> float:
        focus_score = 1.0 if seed.theme == context.focus_theme else 0.6 if context.focus_theme in seed.theme else 0.2
        quality_overlap = len(set(seed.qualities) & set(context.desired_qualities))
        quality_score = quality_overlap / max(len(context.desired_qualities) or 1, 1)
        keyword_overlap = len(set(seed.keywords) & set(context.emphasis_keywords))
        keyword_score = keyword_overlap / max(len(context.emphasis_keywords) or 1, 1)
        energy_alignment = 1.0 - abs(seed.intensity - context.energy_level)
        mood_modifier = self._mood_modifier(seed, context)
        base_score = (
            focus_score * 0.35
            + quality_score * 0.25
            + keyword_score * 0.15
            + energy_alignment * 0.15
            + mood_modifier * 0.10
        )
        return _clamp(base_score, lower=0.0, upper=1.5)

    def _mood_modifier(self, seed: MantraSeed, context: MantraContext) -> float:
        if context.is_grounding:
            return seed.grounding
        if context.is_elevating:
            return seed.elevation
        if context.seeks_expansion:
            return (seed.elevation + seed.grounding) / 2
        return 0.5 + (seed.grounding + seed.elevation) / 4

    def _breath_pattern(self, context: MantraContext) -> str:
        if context.is_grounding or context.energy_level >= 0.7:
            return "4-2-6 grounding breath"
        if context.is_elevating:
            return "6-2-4 heart expansion breath"
        if context.energy_level <= 0.3:
            return "5-5 coherent breath"
        return "box breath 4-4-4-4"

    def _cadence(self, context: MantraContext) -> str:
        if context.is_grounding:
            return f"steady cadence every {context.cycle_length} breaths"
        if context.is_elevating:
            return f"rising cadence pulsing every {max(1, context.cycle_length - 1)} breaths"
        return f"balanced cadence across {context.cycle_length} cycles"

    def _visualization(self, context: MantraContext) -> str:
        focus = context.focus_theme.replace("_", " ")
        return f"Visualise {focus} as you hold the intention '{context.intention.lower()}'."

    def _integration_prompts(self, context: MantraContext, primary: MantraSeed) -> tuple[str, ...]:
        prompts = [
            f"How does '{primary.phrase.lower()}' shift your presence right now?",
            f"Where can the intention '{context.intention.lower()}' express after practice?",
        ]
        if context.desired_qualities:
            joined = ", ".join(context.desired_qualities)
            prompts.append(f"Notice moments today where {joined} naturally arise.")
        return tuple(prompts)

    def _tonic_keywords(self, context: MantraContext, ranked: Sequence[MantraSeed]) -> tuple[str, ...]:
        keywords: list[str] = []
        for seed in ranked[:4]:
            keywords.extend(seed.keywords)
        keywords.extend(context.emphasis_keywords)
        if context.focus_theme not in keywords:
            keywords.append(context.focus_theme)
        seen: set[str] = set()
        ordered: list[str] = []
        for keyword in keywords:
            if keyword and keyword not in seen:
                seen.add(keyword)
                ordered.append(keyword)
        return tuple(ordered)


_DEFAULT_SEEDS: tuple[MantraSeed, ...] = (
    MantraSeed(
        phrase="I breathe clarity through every moment.",
        theme="clarity",
        qualities=("clarity", "focus"),
        intensity=0.4,
        grounding=0.7,
        elevation=0.5,
        keywords=("clarity", "breath"),
    ),
    MantraSeed(
        phrase="Calm strength carries me forward.",
        theme="resilience",
        qualities=("resilience", "calm"),
        intensity=0.5,
        grounding=0.8,
        elevation=0.4,
        keywords=("calm", "strength"),
    ),
    MantraSeed(
        phrase="Radiant focus guides my actions.",
        theme="focus",
        qualities=("focus", "confidence"),
        intensity=0.6,
        grounding=0.5,
        elevation=0.7,
        keywords=("focus", "radiant"),
    ),
)
