"""Dynamic rhythm synthesis engine for generative scheduling and music tasks."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, MutableMapping, Sequence

__all__ = [
    "RhythmMotif",
    "RhythmContext",
    "RhythmEvent",
    "RhythmPattern",
    "DynamicRhythmEngine",
]


_EPSILON = 1e-6


# ---------------------------------------------------------------------------
# helpers


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` to the inclusive ``[lower, upper]`` range."""

    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must not be greater than upper bound")
    return max(lower, min(upper, value))


def _ensure_pattern(values: Sequence[float]) -> tuple[float, ...]:
    """Normalise a rhythmic pattern definition."""

    if not values:
        raise ValueError("pattern must define at least one step")
    cleaned: list[float] = []
    for index, raw in enumerate(values):
        duration = float(raw)
        if duration <= 0:
            raise ValueError(f"pattern steps must be positive (index {index})")
        cleaned.append(duration)
    return tuple(cleaned)


def _normalise_accents(pattern: Sequence[float], accents: Sequence[float] | None) -> tuple[float, ...]:
    """Ensure the accent profile matches the pattern length."""

    if accents is None:
        return tuple(0.5 for _ in pattern)
    if len(accents) != len(pattern):
        raise ValueError("accent profile length must match pattern length")
    return tuple(_clamp(float(value)) for value in accents)


# ---------------------------------------------------------------------------
# core data structures


@dataclass(slots=True)
class RhythmMotif:
    """Reusable rhythmic motif description."""

    name: str
    pattern: tuple[float, ...]
    accents: tuple[float, ...]
    density: float = 0.5
    syncopation: float = 0.5
    dynamic_range: float = 0.5
    momentum: float = 0.5

    def __init__(
        self,
        name: str,
        pattern: Sequence[float],
        *,
        accents: Sequence[float] | None = None,
        density: float = 0.5,
        syncopation: float = 0.5,
        dynamic_range: float = 0.5,
        momentum: float = 0.5,
    ) -> None:
        self.name = name.strip()
        if not self.name:
            raise ValueError("motif name must not be empty")
        self.pattern = _ensure_pattern(pattern)
        self.accents = _normalise_accents(self.pattern, accents)
        self.density = _clamp(float(density))
        self.syncopation = _clamp(float(syncopation))
        self.dynamic_range = _clamp(float(dynamic_range))
        self.momentum = _clamp(float(momentum))

    def pulses_per_bar(self) -> float:
        """Return the total number of pulses in a single iteration of the motif."""

        return sum(self.pattern)


@dataclass(slots=True)
class RhythmContext:
    """Context configuration for rhythm generation."""

    tempo_bpm: float
    beats_per_bar: int
    subdivision: int
    intensity: float = 0.5
    syncopation: float = 0.5
    swing: float = 0.5
    humanise: float = 0.25
    variation: float = 0.35

    def __post_init__(self) -> None:
        if self.tempo_bpm <= 0:
            raise ValueError("tempo must be positive")
        if self.beats_per_bar <= 0:
            raise ValueError("beats per bar must be positive")
        if self.subdivision not in (1, 2, 4, 8, 16):
            raise ValueError("subdivision must be a common power-of-two value")
        self.intensity = _clamp(float(self.intensity))
        self.syncopation = _clamp(float(self.syncopation))
        self.swing = _clamp(float(self.swing))
        self.humanise = _clamp(float(self.humanise))
        self.variation = _clamp(float(self.variation))

    @property
    def seconds_per_beat(self) -> float:
        return 60.0 / self.tempo_bpm


@dataclass(slots=True)
class RhythmEvent:
    """Concrete rhythmic hit produced by the engine."""

    bar: int
    beat: float
    duration: float
    velocity: float
    accent: str
    time_seconds: float

    def as_dict(self) -> MutableMapping[str, float | int | str]:
        return {
            "bar": self.bar,
            "beat": self.beat,
            "duration": self.duration,
            "velocity": self.velocity,
            "accent": self.accent,
            "time_seconds": self.time_seconds,
        }


@dataclass(slots=True)
class RhythmPattern:
    """Output container with all generated rhythmic information."""

    motif: str
    tempo_bpm: float
    beats_per_bar: int
    subdivision: int
    bars: int
    events: tuple[RhythmEvent, ...]
    bar_intensity: tuple[float, ...]
    summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "motif": self.motif,
            "tempo_bpm": self.tempo_bpm,
            "beats_per_bar": self.beats_per_bar,
            "subdivision": self.subdivision,
            "bars": self.bars,
            "events": [event.as_dict() for event in self.events],
            "bar_intensity": list(self.bar_intensity),
            "summary": self.summary,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicRhythmEngine:
    """Generate rhythmic sequences from a catalogue of motifs."""

    def __init__(self) -> None:
        self._motifs: list[RhythmMotif] = []

    # -------------------------------------------------------------- intake API
    def add(self, motif: RhythmMotif) -> None:
        if not isinstance(motif, RhythmMotif):  # pragma: no cover - defensive guard
            raise TypeError("motif must be a RhythmMotif instance")
        self._motifs.append(motif)

    def extend(self, motifs: Iterable[RhythmMotif]) -> None:
        for motif in motifs:
            self.add(motif)

    def clear(self) -> None:
        self._motifs.clear()

    # ----------------------------------------------------------- core planner
    @property
    def motifs(self) -> tuple[RhythmMotif, ...]:
        """Return the registered motifs in insertion order."""

        return tuple(self._motifs)

    def generate(self, context: RhythmContext, *, bars: int = 4) -> RhythmPattern:
        if bars <= 0:
            raise ValueError("bars must be positive")
        if not self._motifs:
            raise RuntimeError("no motifs registered")

        chosen = max(self._motifs, key=lambda motif: self._score(motif, context))

        events = self._render_events(chosen, context, bars)
        bar_intensity = self._bar_intensity(events, bars, context.beats_per_bar)
        summary = self._summary(chosen, context, bars, bar_intensity)

        return RhythmPattern(
            motif=chosen.name,
            tempo_bpm=context.tempo_bpm,
            beats_per_bar=context.beats_per_bar,
            subdivision=context.subdivision,
            bars=bars,
            events=events,
            bar_intensity=bar_intensity,
            summary=summary,
        )

    # ------------------------------------------------------------- heuristics
    def _score(self, motif: RhythmMotif, context: RhythmContext) -> float:
        density_alignment = 1.0 - abs(motif.density - context.intensity)
        syncopation_alignment = 1.0 - abs(motif.syncopation - context.syncopation)
        momentum_alignment = 1.0 - abs(motif.momentum - context.variation)
        dynamic_alignment = 1.0 - abs(motif.dynamic_range - context.intensity)
        return density_alignment * 0.35 + syncopation_alignment * 0.3 + momentum_alignment * 0.2 + dynamic_alignment * 0.15

    def _render_events(
        self, motif: RhythmMotif, context: RhythmContext, bars: int
    ) -> tuple[RhythmEvent, ...]:
        events: list[RhythmEvent] = []
        pulses_per_bar = motif.pulses_per_bar()
        scale = context.beats_per_bar / pulses_per_bar
        swing_strength = (context.swing - 0.5) * 0.4
        seconds_per_beat = context.seconds_per_beat

        running_index = 0
        for bar in range(bars):
            beat_position = 0.0
            for step, (duration_units, accent_value) in enumerate(zip(motif.pattern, motif.accents)):
                duration_beats = duration_units * scale
                base_start = beat_position
                beat_position += duration_beats

                swing_offset = 0.0
                if duration_beats <= 0:  # pragma: no cover - defensive guard
                    continue
                if context.swing != 0.5 and step % 2 == 1:
                    swing_offset = duration_beats * swing_strength

                jitter = math.sin((running_index + 1) * math.pi / 4) * context.humanise * 0.08 * duration_beats
                start = max(0.0, min(context.beats_per_bar - _EPSILON, base_start + swing_offset + jitter))
                velocity = _clamp((accent_value * 0.6) + (context.intensity * 0.4))
                accent = self._accent_label(accent_value, context.intensity)

                global_beat = bar * context.beats_per_bar + start
                time_seconds = global_beat * seconds_per_beat

                events.append(
                    RhythmEvent(
                        bar=bar + 1,
                        beat=round(start, 4),
                        duration=round(duration_beats, 4),
                        velocity=round(velocity, 4),
                        accent=accent,
                        time_seconds=round(time_seconds, 4),
                    )
                )

                running_index += 1

            if beat_position < context.beats_per_bar:
                running_index += 1  # keep jitter evolution moving even if motif shorter than bar

        variation_applied = self._apply_variation(events, context)
        return tuple(variation_applied)

    def _accent_label(self, accent_value: float, intensity: float) -> str:
        power = (accent_value + intensity) / 2
        if power >= 0.75:
            return "accented"
        if power <= 0.3:
            return "ghost"
        return "normal"

    def _apply_variation(self, events: Sequence[RhythmEvent], context: RhythmContext) -> list[RhythmEvent]:
        if not events:
            return []
        variation_strength = context.variation * 0.12
        if variation_strength == 0:
            return list(events)
        adjusted: list[RhythmEvent] = []
        for index, event in enumerate(events):
            curve = math.cos(index * math.pi / 6)
            velocity_adjust = _clamp(event.velocity + variation_strength * curve)
            accent = event.accent
            if velocity_adjust >= 0.85:
                accent = "accented"
            elif velocity_adjust <= 0.25:
                accent = "ghost"
            adjusted.append(
                RhythmEvent(
                    bar=event.bar,
                    beat=event.beat,
                    duration=event.duration,
                    velocity=round(velocity_adjust, 4),
                    accent=accent,
                    time_seconds=event.time_seconds,
                )
            )
        return adjusted

    def _bar_intensity(
        self, events: Sequence[RhythmEvent], bars: int, beats_per_bar: int
    ) -> tuple[float, ...]:
        if bars <= 0:
            return tuple()
        accumulator = [0.0 for _ in range(bars)]
        counts = [0 for _ in range(bars)]
        for event in events:
            index = max(0, min(bars - 1, event.bar - 1))
            accumulator[index] += event.velocity * (event.duration / beats_per_bar)
            counts[index] += 1
        intensities = []
        for idx, (total, count) in enumerate(zip(accumulator, counts)):
            if count == 0:
                intensities.append(0.0)
            else:
                intensities.append(round(_clamp(total / count), 4))
        return tuple(intensities)

    def _summary(
        self,
        motif: RhythmMotif,
        context: RhythmContext,
        bars: int,
        bar_intensity: Sequence[float],
    ) -> str:
        average = 0.0 if not bar_intensity else sum(bar_intensity) / len(bar_intensity)
        intensity_pct = int(round(average * 100))
        feel = "straight" if context.swing <= 0.5 else "swung"
        return (
            f"Motif '{motif.name}' at {context.tempo_bpm:.1f} BPM over {bars} bars in {context.beats_per_bar}/"
            f"{context.subdivision} feel {feel}. Avg intensity {intensity_pct}%"
        )
