"""Dynamic energy modelling and insights generation."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicEnergyEngine",
    "EnergyEvent",
    "EnergyProfile",
    "EnergyVector",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_text(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text



def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


def _normalise_tags(tags: Sequence[str] | str | None) -> tuple[str, ...]:
    if tags is None:
        return ()
    if isinstance(tags, str):
        candidates = [part.strip() for part in tags.split(",")]
    else:
        candidates = tags
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in candidates:
        cleaned = str(tag).strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _weighted_mean(pairs: Sequence[tuple[float, float]] | None, *, default: float) -> float:
    if not pairs:
        return default
    numerator = 0.0
    denominator = 0.0
    for value, weight in pairs:
        if weight <= 0:
            continue
        numerator += value * weight
        denominator += weight
    if denominator <= 0:
        return default
    return numerator / denominator


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class EnergyVector:
    """Energy distribution across key dimensions."""

    physical: float = 0.5
    mental: float = 0.5
    emotional: float = 0.5
    creative: float = 0.5
    dark: float = 0.5

    def __post_init__(self) -> None:
        self.physical = _clamp(self.physical)
        self.mental = _clamp(self.mental)
        self.emotional = _clamp(self.emotional)
        self.creative = _clamp(self.creative)
        self.dark = _clamp(self.dark)

    @property
    def overall(self) -> float:
        return fmean((self.physical, self.mental, self.emotional, self.creative, self.dark))

    def as_dict(self) -> MutableMapping[str, float]:
        return {
            "physical": self.physical,
            "mental": self.mental,
            "emotional": self.emotional,
            "creative": self.creative,
            "dark": self.dark,
        }

    def scaled(self, factor: float) -> "EnergyVector":
        return EnergyVector(
            physical=_clamp(self.physical * factor),
            mental=_clamp(self.mental * factor),
            emotional=_clamp(self.emotional * factor),
            creative=_clamp(self.creative * factor),
            dark=_clamp(self.dark * factor),
        )


@dataclass(slots=True)
class EnergyEvent:
    """Single energy shift observation."""

    kind: str
    description: str
    vector: EnergyVector
    magnitude: float = 1.0
    recovery_time: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.kind = _normalise_text(self.kind).lower()
        self.description = _normalise_text(self.description)
        self.magnitude = max(float(self.magnitude), 0.0)
        self.recovery_time = _clamp(self.recovery_time)
        self.timestamp = _ensure_tzaware(self.timestamp) or _utcnow()
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)
        if not isinstance(self.vector, EnergyVector):
            raise TypeError("vector must be an EnergyVector instance")


@dataclass(slots=True)
class EnergyProfile:
    """Summary of the energy landscape."""

    overall_energy: float
    physical: float
    mental: float
    emotional: float
    creative: float
    dark: float
    stability: float
    momentum: float
    pressure: float
    signals: tuple[str, ...]
    recommended_actions: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "overall_energy": self.overall_energy,
            "physical": self.physical,
            "mental": self.mental,
            "emotional": self.emotional,
            "creative": self.creative,
            "dark": self.dark,
            "stability": self.stability,
            "momentum": self.momentum,
            "pressure": self.pressure,
            "signals": list(self.signals),
            "recommended_actions": list(self.recommended_actions),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicEnergyEngine:
    """Track and synthesise dynamic energy signals."""

    def __init__(self, *, history: int = 240) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._events: Deque[EnergyEvent] = deque(maxlen=history)

    # intake ---------------------------------------------------------------
    def record(self, event: EnergyEvent | Mapping[str, object]) -> EnergyEvent:
        resolved = self._coerce_event(event)
        self._events.append(resolved)
        return resolved

    def extend(self, events: Iterable[EnergyEvent | Mapping[str, object]]) -> None:
        for event in events:
            self.record(event)

    def reset(self) -> None:
        self._events.clear()

    # evaluation -----------------------------------------------------------
    def evaluate(self, *, baseline: EnergyVector | None = None) -> EnergyProfile:
        baseline_vector = baseline or EnergyVector()
        pairs: list[tuple[float, float]] = []
        physical_pairs: list[tuple[float, float]] = []
        mental_pairs: list[tuple[float, float]] = []
        emotional_pairs: list[tuple[float, float]] = []
        creative_pairs: list[tuple[float, float]] = []
        dark_pairs: list[tuple[float, float]] = []
        recovery_pairs: list[tuple[float, float]] = []

        for event in self._events:
            weight = event.magnitude or 0.0
            pairs.append((event.vector.overall, weight))
            physical_pairs.append((event.vector.physical, weight))
            mental_pairs.append((event.vector.mental, weight))
            emotional_pairs.append((event.vector.emotional, weight))
            creative_pairs.append((event.vector.creative, weight))
            dark_pairs.append((event.vector.dark, weight))
            recovery_pairs.append((event.recovery_time, weight))

        overall = _weighted_mean(pairs, default=baseline_vector.overall)
        physical = _weighted_mean(physical_pairs, default=baseline_vector.physical)
        mental = _weighted_mean(mental_pairs, default=baseline_vector.mental)
        emotional = _weighted_mean(emotional_pairs, default=baseline_vector.emotional)
        creative = _weighted_mean(creative_pairs, default=baseline_vector.creative)
        dark = _weighted_mean(dark_pairs, default=baseline_vector.dark)
        recovery = _weighted_mean(recovery_pairs, default=0.5)

        stability = 1.0 - abs(overall - recovery)
        momentum = _clamp((overall - baseline_vector.overall) * 0.5 + 0.5)
        pressure = 1.0 - recovery

        signals = self._derive_signals(
            overall=overall,
            physical=physical,
            mental=mental,
            emotional=emotional,
            creative=creative,
            dark=dark,
            stability=stability,
            pressure=pressure,
        )
        actions = self._suggest_actions(
            physical=physical,
            mental=mental,
            emotional=emotional,
            creative=creative,
            dark=dark,
            pressure=pressure,
        )
        narrative = self._compose_narrative(
            overall=overall,
            momentum=momentum,
            stability=stability,
            pressure=pressure,
            signals=signals,
            dark=dark,
        )

        return EnergyProfile(
            overall_energy=_clamp(overall),
            physical=_clamp(physical),
            mental=_clamp(mental),
            emotional=_clamp(emotional),
            creative=_clamp(creative),
            dark=_clamp(dark),
            stability=_clamp(stability),
            momentum=_clamp(momentum),
            pressure=_clamp(pressure),
            signals=signals,
            recommended_actions=actions,
            narrative=narrative,
        )

    # internals -----------------------------------------------------------
    def _coerce_event(self, value: EnergyEvent | Mapping[str, object]) -> EnergyEvent:
        if isinstance(value, EnergyEvent):
            return value
        if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("event must be EnergyEvent or mapping")
        mapping = dict(value)
        vector_value = mapping.get("vector")
        if isinstance(vector_value, Mapping):
            vector = EnergyVector(**vector_value)
        elif isinstance(vector_value, EnergyVector):
            vector = vector_value
        else:
            vector = EnergyVector()
        return EnergyEvent(
            kind=mapping.get("kind", "observation"),
            description=mapping.get("description", "Energy observation"),
            vector=vector,
            magnitude=mapping.get("magnitude", 1.0),
            recovery_time=mapping.get("recovery_time", 0.5),
            timestamp=_ensure_tzaware(mapping.get("timestamp")) or _utcnow(),
            tags=_normalise_tags(mapping.get("tags")),
            metadata=mapping.get("metadata"),
        )

    def _derive_signals(
        self,
        *,
        overall: float,
        physical: float,
        mental: float,
        emotional: float,
        creative: float,
        dark: float,
        stability: float,
        pressure: float,
    ) -> tuple[str, ...]:
        signals: list[str] = []
        if overall >= 0.75:
            signals.append("Energy reserves are vibrant and expansive.")
        elif overall <= 0.35:
            signals.append("Energy reserves are critically depleted.")

        if physical <= 0.4:
            signals.append("Physical stamina requires immediate restoration.")
        elif physical >= 0.7:
            signals.append("Physical capacity supports ambitious execution.")

        if mental <= 0.4:
            signals.append("Mental bandwidth is constrained; reduce cognitive load.")
        elif mental >= 0.7:
            signals.append("Mental clarity enables strategic synthesis.")

        if emotional <= 0.4:
            signals.append("Emotional reserves are thin; prioritise supportive rituals.")
        elif emotional >= 0.7:
            signals.append("Emotional tone is buoyant and stabilising.")

        if creative <= 0.4:
            signals.append("Creative spark fading; engage curiosity catalysts.")
        elif creative >= 0.7:
            signals.append("Creative energy primed for exploration and invention.")

        if dark <= 0.4:
            signals.append("Dark energy lattice thinning; reinforce restorative stillness.")
        elif dark >= 0.7:
            signals.append("Dark energy field stabilised; latent capacity expanding.")

        if stability <= 0.45:
            signals.append("Energy volatility high; anchor in recovery routines.")
        elif stability >= 0.75:
            signals.append("Energy pattern steady and sustainable.")

        if pressure >= 0.6:
            signals.append("System under heavy demand; schedule decompression intervals.")

        return tuple(signals)

    def _suggest_actions(
        self,
        *,
        physical: float,
        mental: float,
        emotional: float,
        creative: float,
        dark: float,
        pressure: float,
    ) -> tuple[str, ...]:
        actions: list[str] = []
        if physical < 0.5:
            actions.append("Activate restorative movement and sleep protocols.")
        if mental < 0.5:
            actions.append("Batch decision-making and protect focus blocks.")
        if emotional < 0.5:
            actions.append("Reinforce connection rituals and reflective practices.")
        if creative < 0.5:
            actions.append("Schedule exploratory sessions to re-ignite creativity.")
        if dark < 0.5:
            actions.append("Practice deep stillness rituals to recharge dark energy reserves.")
        if pressure > 0.55:
            actions.append("Introduce strategic pauses to relieve energetic pressure.")
        if not actions:
            actions.append("Maintain current cadence while honouring micro-recovery.")
        return tuple(actions)

    def _compose_narrative(
        self,
        *,
        overall: float,
        momentum: float,
        stability: float,
        pressure: float,
        signals: Sequence[str],
        dark: float,
    ) -> str:
        fragments: list[str] = []
        if overall >= 0.7:
            fragments.append("Momentum strong and generative.")
        elif overall <= 0.4:
            fragments.append("Momentum fragile; energy debt accumulating.")
        else:
            fragments.append("Momentum balanced but requires conscious stewardship.")

        if momentum >= 0.6:
            fragments.append("Trajectory trending upward.")
        elif momentum <= 0.4:
            fragments.append("Trajectory tilting downward; apply stabilisers.")

        if stability >= 0.7:
            fragments.append("Pattern stable with predictable cycles.")
        elif stability <= 0.4:
            fragments.append("Pattern erratic; prioritise rhythm calibration.")

        if pressure >= 0.6:
            fragments.append("Demand profile intense; recovery windows essential.")
        elif pressure <= 0.3:
            fragments.append("Demand light; opportunity to invest in expansion.")

        if dark >= 0.7:
            fragments.append("Dark energy currents supportive and stabilising.")
        elif dark <= 0.35:
            fragments.append("Dark energy turbulence detected; expand grounding protocols.")

        if signals:
            fragments.append(signals[0])

        return " ".join(fragments)
