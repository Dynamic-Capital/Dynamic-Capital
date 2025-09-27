"""Dynamic emoticon synthesis heuristics."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "EmoticonSignal",
    "EmoticonContext",
    "EmoticonPalette",
    "EmoticonDesign",
    "DynamicEmoticon",
]


# ---------------------------------------------------------------------------
# palette definitions and lookup tables


_PALETTE_LIBRARY: Mapping[str, tuple[str, str, tuple[str, ...]]] = {
    "vibrant": ("#F97316", "#FACC15", ("#10B981", "#3B82F6")),
    "warm": ("#FB923C", "#FCD34D", ("#F97316", "#D97706")),
    "calm": ("#38BDF8", "#A5B4FC", ("#22D3EE", "#60A5FA")),
    "minimal": ("#1F2937", "#4B5563", ("#9CA3AF", "#F3F4F6")),
    "night": ("#0F172A", "#1E293B", ("#475569", "#E2E8F0")),
}

_GLYPH_LIBRARY: Mapping[str, Mapping[str, str]] = {
    "joy": {
        "vibrant": "^_^",
        "steady": ":)",
        "calm": "(:",
    },
    "serenity": {
        "vibrant": "c:",
        "steady": "^-^",
        "calm": "( o_o )",
    },
    "focus": {
        "vibrant": ">:/",
        "steady": "(•_•)",
        "calm": "-_-",
    },
    "resolve": {
        "vibrant": "(ง •_•)ง",
        "steady": "( •̀_•́ )",
        "calm": "( •̀_• )",
    },
    "playful": {
        "vibrant": "(づ｡◕‿‿◕｡)づ",
        "steady": "(⌒‿⌒)",
        "calm": "(・ω・)",
    },
    "neutral": {
        "vibrant": "(•‿•)",
        "steady": ":|",
        "calm": "(._.)",
    },
}

_DEFAULT_PALETTE_ORDER: tuple[str, ...] = ("vibrant", "warm", "calm", "minimal", "night")


# ---------------------------------------------------------------------------
# normalisation helpers


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


def _normalise_palette_names(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip().lower()
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
class EmoticonSignal:
    """Emotional observation captured for icon synthesis."""

    mood: str
    tone: str
    intensity: float = 0.5
    warmth: float = 0.5
    openness: float = 0.5
    stability: float = 0.5
    complexity: float = 0.5
    clarity: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    motifs: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.mood = _normalise_lower(self.mood)
        self.tone = _normalise_lower(self.tone)
        self.intensity = _clamp(float(self.intensity))
        self.warmth = _clamp(float(self.warmth))
        self.openness = _clamp(float(self.openness))
        self.stability = _clamp(float(self.stability))
        self.complexity = _clamp(float(self.complexity))
        self.clarity = _clamp(float(self.clarity))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.motifs = _normalise_tuple(self.motifs)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class EmoticonContext:
    """Context describing the communication setting for the emoticon."""

    audience: str
    medium: str
    formality: float
    playfulness: float
    urgency: float
    contrast_preference: float
    familiarity_bias: float
    accessibility_priority: float
    allowed_palettes: tuple[str, ...] = field(default_factory=tuple)
    prohibited_motifs: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.audience = _normalise_text(self.audience)
        self.medium = _normalise_text(self.medium)
        self.formality = _clamp(float(self.formality))
        self.playfulness = _clamp(float(self.playfulness))
        self.urgency = _clamp(float(self.urgency))
        self.contrast_preference = _clamp(float(self.contrast_preference))
        self.familiarity_bias = _clamp(float(self.familiarity_bias))
        self.accessibility_priority = _clamp(float(self.accessibility_priority))
        self.allowed_palettes = _normalise_palette_names(self.allowed_palettes)
        self.prohibited_motifs = _normalise_tuple(self.prohibited_motifs)

    @property
    def demands_high_contrast(self) -> bool:
        return self.contrast_preference >= 0.65 or self.accessibility_priority >= 0.7

    @property
    def is_formal(self) -> bool:
        return self.formality >= 0.65

    @property
    def expects_playfulness(self) -> bool:
        return self.playfulness >= 0.6

    @property
    def seeks_familiarity(self) -> bool:
        return self.familiarity_bias >= 0.6

    @property
    def needs_speed(self) -> bool:
        return self.urgency >= 0.6


@dataclass(slots=True)
class EmoticonPalette:
    """Colour palette suggested for the emoticon."""

    name: str
    primary: str
    secondary: str
    accents: tuple[str, ...]
    contrast_ratio: float
    accessibility_ready: bool

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "primary": self.primary,
            "secondary": self.secondary,
            "accents": list(self.accents),
            "contrast_ratio": self.contrast_ratio,
            "accessibility_ready": self.accessibility_ready,
        }


@dataclass(slots=True)
class EmoticonDesign:
    """Structured emoticon description."""

    glyph: str
    mood: str
    tone: str
    motifs: tuple[str, ...]
    palette: EmoticonPalette
    emphasis: tuple[str, ...]
    motion: tuple[str, ...]
    line_weight: str
    symmetry: float
    description: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "glyph": self.glyph,
            "mood": self.mood,
            "tone": self.tone,
            "motifs": list(self.motifs),
            "palette": self.palette.as_dict(),
            "emphasis": list(self.emphasis),
            "motion": list(self.motion),
            "line_weight": self.line_weight,
            "symmetry": self.symmetry,
            "description": self.description,
        }


# ---------------------------------------------------------------------------
# aggregation engine


class DynamicEmoticon:
    """Aggregate emotive signals into a coherent emoticon design."""

    def __init__(self, *, history: int = 120) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[EmoticonSignal] = deque(maxlen=history)

    # ---------------------------------------------------------------- intake
    def capture(self, signal: EmoticonSignal | Mapping[str, object]) -> EmoticonSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[EmoticonSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: EmoticonSignal | Mapping[str, object]) -> EmoticonSignal:
        if isinstance(signal, EmoticonSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return EmoticonSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be EmoticonSignal or mapping")

    # ------------------------------------------------------------- computation
    def design(self, context: EmoticonContext) -> EmoticonDesign:
        if not self._signals:
            raise RuntimeError("no emoticon signals captured")

        total_weight = sum(signal.weight for signal in self._signals if signal.weight > 0)
        if total_weight <= 0:
            raise RuntimeError("emoticon signals have zero weight")

        mood = self._dominant_mood()
        tone = self._dominant_tone()
        warmth = self._weighted_metric(lambda s: s.warmth)
        intensity = self._weighted_metric(lambda s: s.intensity)
        openness = self._weighted_metric(lambda s: s.openness)
        stability = self._weighted_metric(lambda s: s.stability)
        complexity = self._weighted_metric(lambda s: s.complexity)
        clarity = self._weighted_metric(lambda s: s.clarity)

        glyph = self._select_glyph(mood, intensity, openness, stability, context)
        motifs = self._dominant_motifs(context)
        palette = self._build_palette(context, warmth, intensity, clarity)
        emphasis = self._emphasis(openness, complexity, clarity, stability, context)
        motion = self._motion(intensity, stability, context)
        line_weight = self._line_weight(intensity, clarity, context)
        symmetry = round(_clamp((stability + clarity) / 2.0), 3)
        description = self._narrative(
            context,
            mood,
            tone,
            glyph,
            palette,
            intensity,
            warmth,
            symmetry,
            emphasis,
        )

        return EmoticonDesign(
            glyph=glyph,
            mood=mood,
            tone=tone,
            motifs=motifs,
            palette=palette,
            emphasis=emphasis,
            motion=motion,
            line_weight=line_weight,
            symmetry=symmetry,
            description=description,
        )

    def _weighted_metric(self, selector: Callable[[EmoticonSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals if signal.weight > 0)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals if signal.weight > 0)
        return _clamp(aggregate / total_weight)

    def _dominant_mood(self) -> str:
        mood_weights: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            influence = (0.6 * signal.intensity) + (0.4 * signal.warmth)
            mood_weights[signal.mood] += signal.weight * influence
        if not mood_weights:
            return "neutral"
        return mood_weights.most_common(1)[0][0]

    def _dominant_tone(self) -> str:
        tone_weights: Counter[str] = Counter()
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            influence = (0.5 * signal.clarity) + (0.5 * signal.openness)
            tone_weights[signal.tone] += signal.weight * influence
        if not tone_weights:
            return "balanced"
        return tone_weights.most_common(1)[0][0]

    def _dominant_motifs(self, context: EmoticonContext) -> tuple[str, ...]:
        motif_weights: Counter[str] = Counter()
        prohibited = {motif.lower() for motif in context.prohibited_motifs}
        for signal in self._signals:
            if signal.weight <= 0:
                continue
            for motif in signal.motifs:
                if motif.lower() in prohibited:
                    continue
                motif_weights[motif] += signal.weight
        if not motif_weights:
            return ()
        ranked = sorted(motif_weights.items(), key=lambda item: (-item[1], item[0]))
        return tuple(motif for motif, _ in ranked[:3])

    def _select_glyph(
        self,
        mood: str,
        intensity: float,
        openness: float,
        stability: float,
        context: EmoticonContext,
    ) -> str:
        glyphs = _GLYPH_LIBRARY.get(mood, _GLYPH_LIBRARY["neutral"])
        if context.is_formal and mood in {"playful", "joy"}:
            # soften expressiveness for formal contexts
            mood_variant = "steady"
        elif intensity >= 0.65 or openness >= 0.65:
            mood_variant = "vibrant"
        elif stability >= 0.65:
            mood_variant = "steady"
        else:
            mood_variant = "calm"
        return glyphs.get(mood_variant, glyphs.get("steady", glyphs.get("calm", ":|")))

    def _build_palette(
        self,
        context: EmoticonContext,
        warmth: float,
        intensity: float,
        clarity: float,
    ) -> EmoticonPalette:
        candidates = context.allowed_palettes or _DEFAULT_PALETTE_ORDER
        available = [palette for palette in candidates if palette in _PALETTE_LIBRARY]
        if not available:
            available = list(_DEFAULT_PALETTE_ORDER)

        if context.is_formal and "minimal" in available:
            selected = "minimal"
        elif context.demands_high_contrast and "night" in available:
            selected = "night"
        elif warmth >= 0.65 and intensity >= 0.55 and "vibrant" in available:
            selected = "vibrant"
        elif warmth >= 0.55 and "warm" in available:
            selected = "warm"
        elif clarity >= 0.6 and "calm" in available:
            selected = "calm"
        else:
            selected = available[0]

        primary, secondary, accents = _PALETTE_LIBRARY[selected]
        contrast_base = max(context.contrast_preference, clarity)
        contrast_ratio = round(1.8 + (contrast_base * 2.2), 2)
        accessible = contrast_ratio >= 3.0 or context.accessibility_priority >= 0.6
        return EmoticonPalette(
            name=selected,
            primary=primary,
            secondary=secondary,
            accents=accents,
            contrast_ratio=contrast_ratio,
            accessibility_ready=accessible,
        )

    def _emphasis(
        self,
        openness: float,
        complexity: float,
        clarity: float,
        stability: float,
        context: EmoticonContext,
    ) -> tuple[str, ...]:
        emphasis: list[str] = []
        if openness >= 0.6:
            emphasis.append("Expanded eye shapes")
        if context.expects_playfulness:
            emphasis.append("Animated cheek highlights")
        if complexity >= 0.55:
            emphasis.append("Layered accent marks")
        if stability >= 0.6:
            emphasis.append("Centered baseline")
        if clarity < 0.45:
            emphasis.append("Bold outline for legibility")
        if context.seeks_familiarity:
            emphasis.append("Classic mouth curve")
        return tuple(dict.fromkeys(emphasis))

    def _motion(
        self,
        intensity: float,
        stability: float,
        context: EmoticonContext,
    ) -> tuple[str, ...]:
        motions: list[str] = []
        if intensity >= 0.65:
            motions.append("Gentle bounce loop")
        if stability >= 0.65:
            motions.append("Breathing glow cadence")
        if context.needs_speed:
            motions.append("Quick reveal transition")
        if not motions:
            motions.append("Static pose")
        return tuple(dict.fromkeys(motions))

    def _line_weight(
        self,
        intensity: float,
        clarity: float,
        context: EmoticonContext,
    ) -> str:
        if context.demands_high_contrast or clarity <= 0.45:
            return "bold"
        if intensity >= 0.6:
            return "medium"
        return "light"

    def _narrative(
        self,
        context: EmoticonContext,
        mood: str,
        tone: str,
        glyph: str,
        palette: EmoticonPalette,
        intensity: float,
        warmth: float,
        symmetry: float,
        emphasis: tuple[str, ...],
    ) -> str:
        descriptors: list[str] = []
        descriptors.append(
            f"Designed for {context.audience} on {context.medium.lower()} with a {tone} tone"
        )
        descriptors.append(
            f"Captures a {mood} mood using the {palette.name} palette at {palette.contrast_ratio}:1 contrast"
        )
        energy_descriptor = "buoyant" if intensity >= 0.65 else "steady" if symmetry >= 0.6 else "subtle"
        warmth_descriptor = "radiant" if warmth >= 0.65 else "neutral"
        descriptors.append(
            f"Glyph {glyph!r} balances {energy_descriptor} energy with {warmth_descriptor} warmth"
        )
        if emphasis:
            descriptors.append("Emphasis on " + ", ".join(emphasis))
        if palette.accessibility_ready:
            descriptors.append("Palette meets accessibility guardrails")
        return ". ".join(descriptors)
