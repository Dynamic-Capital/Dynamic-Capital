"""Non-dual awareness integrator producing dynamic ultimate reality guidance."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "UltimateRealitySignal",
    "NonDualContext",
    "UltimateRealityState",
    "DynamicUltimateReality",
]


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


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


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


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class UltimateRealitySignal:
    """Momentary impression within the field of non-dual awareness."""

    dimension: str
    insight: str
    luminosity: float = 0.5
    emptiness: float = 0.5
    compassion: float = 0.5
    embodiment: float = 0.5
    coherence: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.dimension = _normalise_lower(self.dimension)
        self.insight = _normalise_text(self.insight)
        self.luminosity = _clamp(float(self.luminosity))
        self.emptiness = _clamp(float(self.emptiness))
        self.compassion = _clamp(float(self.compassion))
        self.embodiment = _clamp(float(self.embodiment))
        self.coherence = _clamp(float(self.coherence))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class NonDualContext:
    """Ambient readiness for sustaining non-dual recognition."""

    intention: str
    integration_capacity: float
    nervous_system_regulation: float
    community_support: float
    stewardship_commitment: float
    environmental_noise: float
    practice_cadence: float
    core_practices: tuple[str, ...] = field(default_factory=tuple)
    lineage: str | None = None
    guidance: str | None = None

    def __post_init__(self) -> None:
        self.intention = _normalise_text(self.intention)
        self.integration_capacity = _clamp(float(self.integration_capacity))
        self.nervous_system_regulation = _clamp(float(self.nervous_system_regulation))
        self.community_support = _clamp(float(self.community_support))
        self.stewardship_commitment = _clamp(float(self.stewardship_commitment))
        self.environmental_noise = _clamp(float(self.environmental_noise))
        self.practice_cadence = _clamp(float(self.practice_cadence))
        self.core_practices = _normalise_tuple(self.core_practices)
        self.lineage = _normalise_optional_text(self.lineage)
        self.guidance = _normalise_optional_text(self.guidance)

    @property
    def is_fragile(self) -> bool:
        return (
            self.integration_capacity < 0.5
            or self.nervous_system_regulation < 0.5
            or self.environmental_noise > 0.55
        )

    @property
    def has_support(self) -> bool:
        return self.community_support >= 0.6


@dataclass(slots=True)
class UltimateRealityState:
    """Sustained picture of non-dual presence and integration needs."""

    nondual_index: float
    integration_index: float
    groundedness_index: float
    dominant_dimensions: tuple[str, ...]
    guiding_principles: tuple[str, ...]
    integration_actions: tuple[str, ...]
    attunement_mantras: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "nondual_index": self.nondual_index,
            "integration_index": self.integration_index,
            "groundedness_index": self.groundedness_index,
            "dominant_dimensions": list(self.dominant_dimensions),
            "guiding_principles": list(self.guiding_principles),
            "integration_actions": list(self.integration_actions),
            "attunement_mantras": list(self.attunement_mantras),
            "narrative": self.narrative,
        }


class DynamicUltimateReality:
    """Aggregate and synthesise non-dual signals into practical guidance."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[UltimateRealitySignal] = deque(maxlen=history)

    # ---------------------------------------------------------------- intake
    def capture(
        self, signal: UltimateRealitySignal | Mapping[str, object]
    ) -> UltimateRealitySignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(
        self, signals: Iterable[UltimateRealitySignal | Mapping[str, object]]
    ) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    @property
    def signal_count(self) -> int:
        """Return the number of ultimate reality signals currently stored."""

        return len(self._signals)

    def latest_signal(self) -> UltimateRealitySignal | None:
        """Return the most recent ultimate reality signal when present."""

        if not self._signals:
            return None
        return self._signals[-1]

    def _coerce_signal(
        self, signal: UltimateRealitySignal | Mapping[str, object]
    ) -> UltimateRealitySignal:
        if isinstance(signal, UltimateRealitySignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return UltimateRealitySignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be UltimateRealitySignal or mapping")

    # --------------------------------------------------------------- synthesis
    def realise(self, context: NonDualContext) -> UltimateRealityState:
        if not self._signals:
            raise RuntimeError("no ultimate reality signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("ultimate reality signals have zero weight")

        luminosity = self._weighted_metric(lambda s: s.luminosity, total_weight)
        emptiness = self._weighted_metric(lambda s: s.emptiness, total_weight)
        compassion = self._weighted_metric(lambda s: s.compassion, total_weight)
        embodiment = self._weighted_metric(lambda s: s.embodiment, total_weight)
        coherence = self._weighted_metric(lambda s: s.coherence, total_weight)

        nondual_index = _clamp(0.35 * luminosity + 0.35 * emptiness + 0.3 * compassion)
        integration_index = _clamp(
            0.3 * embodiment
            + 0.25 * coherence
            + 0.2 * context.integration_capacity
            + 0.15 * context.stewardship_commitment
            + 0.1 * context.community_support
        )
        groundedness_index = _clamp(
            0.4 * context.nervous_system_regulation
            + 0.3 * (1.0 - context.environmental_noise)
            + 0.3 * embodiment
        )

        dominant_dimensions = self._dominant_dimensions()
        guiding_principles = self._guiding_principles(
            context, nondual_index, groundedness_index
        )
        integration_actions = self._integration_actions(
            context, integration_index, groundedness_index
        )
        attunement_mantras = self._attunement_mantras(
            context, nondual_index, compassion
        )
        narrative = self._narrative(
            context,
            nondual_index,
            integration_index,
            groundedness_index,
            dominant_dimensions,
        )

        return UltimateRealityState(
            nondual_index=nondual_index,
            integration_index=integration_index,
            groundedness_index=groundedness_index,
            dominant_dimensions=dominant_dimensions,
            guiding_principles=guiding_principles,
            integration_actions=integration_actions,
            attunement_mantras=attunement_mantras,
            narrative=narrative,
        )

    # ------------------------------------------------------------- helper logic
    def _weighted_metric(
        self, metric: Callable[[UltimateRealitySignal], float], total_weight: float
    ) -> float:
        aggregate = sum(metric(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight if total_weight else 0.0)

    def _dominant_dimensions(self) -> tuple[str, ...]:
        counts: Counter[str] = Counter(signal.dimension for signal in self._signals)
        most_common = counts.most_common(3)
        return tuple(dimension for dimension, _ in most_common)

    def _guiding_principles(
        self,
        context: NonDualContext,
        nondual_index: float,
        groundedness_index: float,
    ) -> tuple[str, ...]:
        principles: list[str] = []
        if context.is_fragile:
            principles.append("Stabilise nervous system before expanding awareness.")
        if nondual_index > 0.65 and groundedness_index < 0.5:
            principles.append(
                "Translate spacious insight into simple embodied rhythms."
            )
        if nondual_index < 0.4:
            principles.append("Revisit foundational witnessing practices.")
        if context.has_support:
            principles.append(
                "Share articulation with trusted mirrors to deepen integration."
            )
        if not principles:
            principles.append("Stay with luminous simplicity; notice subtle contractions.")
        return tuple(dict.fromkeys(principles))

    def _integration_actions(
        self,
        context: NonDualContext,
        integration_index: float,
        groundedness_index: float,
    ) -> tuple[str, ...]:
        actions = list(context.core_practices)
        if integration_index < 0.5:
            actions.append("Schedule gentle integration journaling before sleep.")
        if groundedness_index < 0.5:
            actions.append("Return to somatic regulation sequences hourly today.")
        if context.practice_cadence < 0.45:
            actions.append("Simplify commitments and recommit to one anchor practice.")
        if context.guidance:
            actions.append(f"Contemplate guidance: {context.guidance}.")
        return tuple(dict.fromkeys(actions))

    def _attunement_mantras(
        self,
        context: NonDualContext,
        nondual_index: float,
        compassion: float,
    ) -> tuple[str, ...]:
        mantras: list[str] = []
        if nondual_index >= 0.6:
            mantras.append("Only awareness aware of itself.")
        else:
            mantras.append("Softly notice the knower of experience.")
        if compassion >= 0.6:
            mantras.append("Let clarity express as compassionate action.")
        if context.lineage:
            mantras.append(f"Honor the {context.lineage} stream guiding this moment.")
        if context.guidance and context.guidance not in mantras:
            mantras.append(context.guidance)
        return tuple(dict.fromkeys(mantras))

    def _narrative(
        self,
        context: NonDualContext,
        nondual_index: float,
        integration_index: float,
        groundedness_index: float,
        dominant_dimensions: tuple[str, ...],
    ) -> str:
        segments = [
            f"Intention '{context.intention}'.",
            (
                "Indices — non-dual {nondual:.2f}, integration {integration:.2f}, "
                "groundedness {grounded:.2f}."
            ).format(
                nondual=nondual_index,
                integration=integration_index,
                grounded=groundedness_index,
            ),
        ]
        if dominant_dimensions:
            segments.append(
                "Primary dimensions: " + ", ".join(dominant_dimensions) + "."
            )
        if context.is_fragile:
            segments.append("System tender: privilege regulation and simplicity.")
        elif nondual_index > 0.65:
            segments.append("Awareness vivid: remain transparent to emergence.")
        else:
            segments.append("Keep returning to direct immediacy without force.")
        if context.lineage:
            segments.append(f"Aligned with the {context.lineage} lineage stream.")
        return " ".join(segments)
