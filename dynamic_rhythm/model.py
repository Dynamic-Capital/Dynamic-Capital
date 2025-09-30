"""Dynamic rhythm profiling model for analysing generated grooves."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Deque, MutableMapping, Sequence, TYPE_CHECKING

__all__ = [
    "RhythmObservation",
    "RhythmProfile",
    "DynamicRhythmModel",
]

if TYPE_CHECKING:  # pragma: no cover - typing helpers
    from .engine import RhythmEvent, RhythmPattern


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _accent_to_strength(label: str) -> float:
    mapping = {
        "accented": 1.0,
        "normal": 0.6,
        "ghost": 0.25,
    }
    return mapping.get(label.lower().strip(), 0.6)


@dataclass(slots=True)
class RhythmObservation:
    """Single rhythmic event captured for modelling."""

    timestamp: datetime
    bar: int
    beat: float
    duration: float
    velocity: float
    accent_strength: float
    beats_per_bar: float

    def __post_init__(self) -> None:
        self.timestamp = _ensure_timestamp(self.timestamp)
        self.bar = max(int(self.bar), 1)
        self.beat = float(self.beat)
        self.duration = max(float(self.duration), 1e-6)
        self.velocity = _clamp(float(self.velocity))
        self.accent_strength = _clamp(float(self.accent_strength))
        self.beats_per_bar = max(float(self.beats_per_bar), 1e-6)

    @property
    def fractional_beat(self) -> float:
        fractional = self.beat - int(self.beat)
        if fractional < 0:
            fractional += 1.0
        return fractional

    @property
    def offbeat_weight(self) -> float:
        fractional = self.fractional_beat
        distance = min(fractional, 1.0 - fractional)
        return _clamp(distance * 2.0)

    @property
    def energy(self) -> float:
        return self.velocity * (0.5 + 0.5 * self.accent_strength)


@dataclass(slots=True)
class RhythmProfile:
    """Summary metrics describing recent rhythmic observations."""

    pulse_density: float
    syncopation: float
    swing: float
    dynamic_range: float
    accent_balance: float
    energy: float
    events_considered: int
    summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "pulse_density": self.pulse_density,
            "syncopation": self.syncopation,
            "swing": self.swing,
            "dynamic_range": self.dynamic_range,
            "accent_balance": self.accent_balance,
            "energy": self.energy,
            "events_considered": self.events_considered,
            "summary": self.summary,
        }


class DynamicRhythmModel:
    """Blend rhythmic events into a stable profile for downstream systems."""

    def __init__(self, *, window: int = 128) -> None:
        if window <= 1:
            raise ValueError("window must be greater than one")
        self._observations: Deque[RhythmObservation] = deque(maxlen=int(window))

    def reset(self) -> None:
        self._observations.clear()

    def add_observation(
        self,
        observation: RhythmObservation | None = None,
        /,
        **kwargs: float | datetime,
    ) -> RhythmObservation:
        if observation is not None:
            if kwargs:
                raise TypeError("cannot provide kwargs when supplying an observation instance")
            self._observations.append(observation)
            return observation

        required = {"bar", "beat", "duration", "velocity", "accent_strength"}
        missing = required.difference(kwargs)
        if missing:
            raise TypeError(f"missing required observation fields: {', '.join(sorted(missing))}")

        beats_per_bar = float(kwargs.get("beats_per_bar", 4.0))
        timestamp = kwargs.get("timestamp")
        observation = RhythmObservation(
            timestamp=_ensure_timestamp(timestamp if isinstance(timestamp, datetime) else None),
            bar=int(kwargs["bar"]),
            beat=float(kwargs["beat"]),
            duration=float(kwargs["duration"]),
            velocity=float(kwargs["velocity"]),
            accent_strength=float(kwargs["accent_strength"]),
            beats_per_bar=beats_per_bar,
        )
        self._observations.append(observation)
        return observation

    def observe_event(
        self,
        event: "RhythmEvent",
        *,
        beats_per_bar: float,
        timestamp: datetime | None = None,
    ) -> RhythmObservation:
        return self.add_observation(
            bar=event.bar,
            beat=event.beat,
            duration=event.duration,
            velocity=event.velocity,
            accent_strength=_accent_to_strength(event.accent),
            beats_per_bar=beats_per_bar,
            timestamp=timestamp,
        )

    def observe_pattern(
        self,
        pattern: "RhythmPattern",
        *,
        start_timestamp: datetime | None = None,
    ) -> RhythmProfile:
        self.reset()
        base = _ensure_timestamp(start_timestamp)
        for event in pattern.events:
            timestamp = base + timedelta(seconds=event.time_seconds)
            self.observe_event(event, beats_per_bar=pattern.beats_per_bar, timestamp=timestamp)
        return self.profile()

    def profile(self) -> RhythmProfile:
        if not self._observations:
            raise RuntimeError("no rhythm observations available")

        observations = list(self._observations)
        first = observations[0]
        bars_min = bars_max = first.bar
        beats_per_bar_total = 0.0
        offbeat_total = 0.0
        accent_total = 0.0
        energy_total = 0.0
        velocities_min = first.velocity
        velocities_max = first.velocity
        even_duration_total = 0.0
        odd_duration_total = 0.0
        even_count = 0
        odd_count = 0

        for index, observation in enumerate(observations):
            bars_min = min(bars_min, observation.bar)
            bars_max = max(bars_max, observation.bar)
            beats_per_bar_total += observation.beats_per_bar
            offbeat_total += observation.offbeat_weight
            accent_total += observation.accent_strength
            energy_total += observation.energy
            velocities_min = min(velocities_min, observation.velocity)
            velocities_max = max(velocities_max, observation.velocity)

            if index % 2 == 0:
                even_duration_total += observation.duration
                even_count += 1
            else:
                odd_duration_total += observation.duration
                odd_count += 1

        bars_span = max(1, bars_max - bars_min + 1)
        beats_per_bar = beats_per_bar_total / len(observations)

        pulse_density_raw = len(observations) / (bars_span * beats_per_bar)
        pulse_density = round(_clamp(pulse_density_raw * 4.0), 4)

        syncopation = round(_clamp(offbeat_total / len(observations)), 4)

        if even_count and odd_count:
            even_avg = even_duration_total / even_count
            odd_avg = odd_duration_total / odd_count
            total = even_avg + odd_avg
            if total == 0:
                swing_value = 0.5
            else:
                swing_value = 0.5 + ((odd_avg - even_avg) / total) * 0.5
        else:
            swing_value = 0.5
        swing = round(_clamp(swing_value), 4)

        dynamic_range = round(_clamp(velocities_max - velocities_min), 4)

        accent_mean = accent_total / len(observations)
        accent_balance = round(_clamp(1.0 - abs(accent_mean - 0.5) * 2.0), 4)

        energy = round(_clamp(energy_total / len(observations)), 4)

        density_desc = "dense" if pulse_density > 0.7 else "open" if pulse_density < 0.4 else "balanced"
        sync_desc = "syncopated" if syncopation > 0.6 else "grounded"
        swing_desc = "swung" if swing >= 0.6 else "straight" if swing <= 0.4 else "fluid"
        energy_desc = "high-energy" if energy >= 0.65 else "restrained" if energy <= 0.35 else "dynamic"
        summary = (
            f"{density_desc.title()} and {sync_desc} groove with {swing_desc} feel; "
            f"{energy_desc} profile ({int(round(energy * 100))}% energy)."
        )

        return RhythmProfile(
            pulse_density=pulse_density,
            syncopation=syncopation,
            swing=swing,
            dynamic_range=dynamic_range,
            accent_balance=accent_balance,
            energy=energy,
            events_considered=len(observations),
            summary=summary,
        )

    def observations(self) -> Sequence[RhythmObservation]:
        return tuple(self._observations)

    def __len__(self) -> int:  # pragma: no cover - convenience
        return len(self._observations)
