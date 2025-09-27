"""Memory reconsolidation planning for Dynamic Capital's adaptive rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MemoryTrace",
    "ReconsolidationContext",
    "ReconsolidationPlan",
    "DynamicMemoryReconsolidation",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("memory key must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


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


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class MemoryTrace:
    """Encoded experiential memory trace ready for reconsolidation."""

    key: str
    narrative: str
    emotional_intensity: float
    sensory_richness: float
    coherence: float
    malleability: float
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    anchors: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.narrative = _normalise_text(self.narrative)
        self.emotional_intensity = _clamp(float(self.emotional_intensity))
        self.sensory_richness = _clamp(float(self.sensory_richness))
        self.coherence = _clamp(float(self.coherence))
        self.malleability = _clamp(float(self.malleability))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.anchors = _normalise_tuple(self.anchors)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class ReconsolidationContext:
    """Contextual factors guiding a reconsolidation session."""

    intention: str
    regulation_capacity: float
    safety: float
    integration_window: float
    support_network: float
    stabilising_practices: tuple[str, ...] = field(default_factory=tuple)
    environmental_cues: tuple[str, ...] = field(default_factory=tuple)
    facilitator: str | None = None

    def __post_init__(self) -> None:
        self.intention = _normalise_text(self.intention)
        self.regulation_capacity = _clamp(float(self.regulation_capacity))
        self.safety = _clamp(float(self.safety))
        self.integration_window = _clamp(float(self.integration_window))
        self.support_network = _clamp(float(self.support_network))
        self.stabilising_practices = _normalise_tuple(self.stabilising_practices)
        self.environmental_cues = _normalise_tuple(self.environmental_cues)
        self.facilitator = _normalise_optional_text(self.facilitator)

    @property
    def is_primed(self) -> bool:
        return self.regulation_capacity >= 0.6 and self.safety >= 0.6

    @property
    def needs_containment(self) -> bool:
        return self.safety < 0.5 or self.support_network < 0.4


@dataclass(slots=True)
class ReconsolidationPlan:
    """Synthesised plan describing reconsolidation posture and rituals."""

    stability_index: float
    integration_readiness: float
    distortion_risk: float
    recommended_interventions: tuple[str, ...]
    safety_protocols: tuple[str, ...]
    integration_focus: tuple[str, ...]
    active_cues: tuple[str, ...]
    narrative_update: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "stability_index": self.stability_index,
            "integration_readiness": self.integration_readiness,
            "distortion_risk": self.distortion_risk,
            "recommended_interventions": list(self.recommended_interventions),
            "safety_protocols": list(self.safety_protocols),
            "integration_focus": list(self.integration_focus),
            "active_cues": list(self.active_cues),
            "narrative_update": self.narrative_update,
        }


class DynamicMemoryReconsolidation:
    """Aggregate memory traces and compute reconsolidation plans."""

    def __init__(self, *, history: int = 120, decay: float = 0.12) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if not (0.0 <= decay < 1.0):
            raise ValueError("decay must be in [0.0, 1.0)")
        self._history = int(history)
        self._decay = float(decay)
        self._traces: Deque[MemoryTrace] = deque(maxlen=self._history)

    # ------------------------------------------------------------- lifecycle
    def capture(self, trace: MemoryTrace | Mapping[str, object]) -> MemoryTrace:
        resolved = self._coerce_trace(trace)
        self._traces.append(resolved)
        return resolved

    def extend(self, traces: Iterable[MemoryTrace | Mapping[str, object]]) -> None:
        for trace in traces:
            self.capture(trace)

    def reset(self) -> None:
        self._traces.clear()

    # ------------------------------------------------------------- computation
    def reconsolidate(self, context: ReconsolidationContext) -> ReconsolidationPlan:
        weighted_traces = tuple(self._iter_weighted_traces())
        if not weighted_traces:
            raise RuntimeError("no memory traces captured")

        total_weight = sum(weight for _, weight in weighted_traces)
        if total_weight <= 0:
            raise RuntimeError("memory traces have zero weight")

        emotional_intensity = self._weighted_metric(
            weighted_traces, lambda trace: trace.emotional_intensity
        )
        sensory_richness = self._weighted_metric(
            weighted_traces, lambda trace: trace.sensory_richness
        )
        coherence = self._weighted_metric(
            weighted_traces, lambda trace: trace.coherence
        )
        malleability = self._weighted_metric(
            weighted_traces, lambda trace: trace.malleability
        )

        stability_index = _clamp(
            (0.35 * coherence)
            + (0.25 * (1.0 - malleability))
            + (0.2 * context.safety)
            + (0.2 * sensory_richness)
        )
        integration_readiness = _clamp(
            (0.3 * context.regulation_capacity)
            + (0.25 * context.integration_window)
            + (0.2 * context.support_network)
            + (0.15 * (1.0 - emotional_intensity))
            + (0.1 * coherence)
        )
        distortion_risk = _clamp(
            (0.45 * malleability)
            + (0.25 * emotional_intensity)
            + (0.2 * (1.0 - context.safety))
            + (0.1 * (1.0 - context.regulation_capacity))
        )

        interventions = self._interventions(
            stability_index, emotional_intensity, malleability, coherence
        )
        safety_protocols = self._safety_protocols(context, distortion_risk)
        integration_focus = self._integration_focus(
            context, integration_readiness, sensory_richness
        )
        active_cues = self._dominant_cues(weighted_traces)
        narrative_update = self._narrative(
            context,
            stability_index,
            integration_readiness,
            distortion_risk,
            emotional_intensity,
            malleability,
        )

        return ReconsolidationPlan(
            stability_index=round(stability_index, 3),
            integration_readiness=round(integration_readiness, 3),
            distortion_risk=round(distortion_risk, 3),
            recommended_interventions=interventions,
            safety_protocols=safety_protocols,
            integration_focus=integration_focus,
            active_cues=active_cues,
            narrative_update=narrative_update,
        )

    # ------------------------------------------------------------- helpers
    def _coerce_trace(self, trace: MemoryTrace | Mapping[str, object]) -> MemoryTrace:
        if isinstance(trace, MemoryTrace):
            return trace
        if isinstance(trace, Mapping):
            payload: MutableMapping[str, object] = dict(trace)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return MemoryTrace(**payload)  # type: ignore[arg-type]
        raise TypeError("trace must be MemoryTrace or mapping")

    def _iter_weighted_traces(self) -> Iterable[tuple[MemoryTrace, float]]:
        for index, trace in enumerate(reversed(self._traces)):
            decay_factor = (1.0 - self._decay) ** index
            yield trace, trace.weight * decay_factor

    def _weighted_metric(
        self,
        weighted_traces: Iterable[tuple[MemoryTrace, float]],
        selector: Callable[[MemoryTrace], float],
    ) -> float:
        total_weight = 0.0
        aggregate = 0.0
        for trace, weight in weighted_traces:
            if weight <= 0:
                continue
            total_weight += weight
            aggregate += selector(trace) * weight
        if total_weight <= 0:
            return 0.0
        return _clamp(aggregate / total_weight)

    def _interventions(
        self,
        stability_index: float,
        emotional_intensity: float,
        malleability: float,
        coherence: float,
    ) -> tuple[str, ...]:
        interventions: list[str] = []
        if emotional_intensity >= 0.7:
            interventions.append("Schedule somatic discharge before narrative work.")
        if malleability >= 0.6:
            interventions.append("Use guided imagery to reshape the memory narrative.")
        if coherence < 0.5:
            interventions.append("Facilitate structured recall to stabilise details.")
        if not interventions:
            interventions.append(
                "Reinforce updated memory through reflective journaling and dialogue."
            )
        if stability_index >= 0.7:
            interventions.append(
                "Capture insights in the integration log within the next 24 hours."
            )
        return tuple(dict.fromkeys(interventions))

    def _safety_protocols(
        self, context: ReconsolidationContext, distortion_risk: float
    ) -> tuple[str, ...]:
        protocols: list[str] = []
        if context.needs_containment:
            protocols.append(
                "Keep sessions shorter than 45 minutes with co-regulation breaks."
            )
        if context.safety < 0.6:
            protocols.append("Establish grounding resources before proceeding.")
        if distortion_risk >= 0.65:
            protocols.append("Document original narrative as fallback reference.")
        if not protocols:
            protocols.append("Maintain regular check-ins during the integration window.")
        return tuple(dict.fromkeys(protocols))

    def _integration_focus(
        self,
        context: ReconsolidationContext,
        integration_readiness: float,
        sensory_richness: float,
    ) -> tuple[str, ...]:
        focus: list[str] = []
        if integration_readiness < 0.55:
            focus.append(
                "Prioritise nervous system downshifts before deep processing."
            )
        else:
            focus.append("Proceed with integration dialogue within the current window.")
        if context.environmental_cues:
            cues = ", ".join(context.environmental_cues[:2])
            focus.append(f"Reinforce cues: {cues}.")
        if sensory_richness >= 0.65:
            focus.append("Pair the reconsolidated story with embodied rehearsal.")
        elif context.stabilising_practices:
            rituals = ", ".join(context.stabilising_practices[:2])
            focus.append(f"Close with grounding rituals: {rituals}.")
        return tuple(dict.fromkeys(focus))

    def _dominant_cues(
        self, weighted_traces: Iterable[tuple[MemoryTrace, float]]
    ) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for trace, weight in weighted_traces:
            if weight <= 0:
                continue
            for tag in trace.tags:
                counter[tag] += weight
            for anchor in trace.anchors:
                counter[anchor] += weight * 0.5
        if not counter:
            return ()
        ranked = sorted(counter.items(), key=lambda item: (-item[1], item[0]))
        return tuple(item[0] for item in ranked[:5])

    def _narrative(
        self,
        context: ReconsolidationContext,
        stability_index: float,
        integration_readiness: float,
        distortion_risk: float,
        emotional_intensity: float,
        malleability: float,
    ) -> str:
        readiness_clause = (
            "The system is primed for dialogue." if context.is_primed else "Stabilisation comes first."
        )
        distortion_clause = (
            "heightened vigilance is required"
            if distortion_risk >= 0.6
            else "there is spaciousness for narrative updating"
        )
        emotional_clause = (
            "Emotional charge remains high—sequence regulation before meaning making."
            if emotional_intensity >= 0.75
            else "Emotional tone is workable for integration work."
        )
        plasticity_clause = (
            "Memory is pliable; anchor the refreshed storyline quickly."
            if malleability >= 0.6
            else "Memory is relatively fixed; focus on reinforcing current gains."
        )
        return (
            f"Reconsolidation targeting '{context.intention}' holds stability at {stability_index:.2f} "
            f"with integration readiness {integration_readiness:.2f}. "
            f"Distortion risk at {distortion_risk:.2f} suggests {distortion_clause}. "
            f"{readiness_clause} {emotional_clause} {plasticity_clause}"
        )
