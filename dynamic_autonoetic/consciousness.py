"""Autonoetic consciousness orchestration for self-directed performance rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "AutonoeticSignal",
    "AutonoeticContext",
    "AutonoeticState",
    "AutonoeticConsciousness",
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


@dataclass(slots=True)
class AutonoeticSignal:
    """Weighted recollection or introspective signal."""

    domain: str
    narrative: str
    emotional_valence: float = 0.5
    temporal_distance: float = 0.5
    agency: float = 0.5
    clarity: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.domain = _normalise_text(self.domain).lower()
        self.narrative = _normalise_text(self.narrative)
        self.emotional_valence = _clamp(float(self.emotional_valence))
        self.temporal_distance = _clamp(float(self.temporal_distance))
        self.agency = _clamp(float(self.agency))
        self.clarity = _clamp(float(self.clarity))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class AutonoeticContext:
    """Self-narrative and physiological context for the present cycle."""

    identity_statement: str
    regulation_capacity: float
    stress_load: float
    integration_practice: float
    narrative_alignment: float
    somatic_baseline: float
    anchor_rituals: tuple[str, ...] = field(default_factory=tuple)
    future_self_name: str | None = None

    def __post_init__(self) -> None:
        self.identity_statement = _normalise_text(self.identity_statement)
        self.regulation_capacity = _clamp(float(self.regulation_capacity))
        self.stress_load = _clamp(float(self.stress_load))
        self.integration_practice = _clamp(float(self.integration_practice))
        self.narrative_alignment = _clamp(float(self.narrative_alignment))
        self.somatic_baseline = _clamp(float(self.somatic_baseline))
        self.anchor_rituals = _normalise_tuple(self.anchor_rituals)
        self.future_self_name = _normalise_optional_text(self.future_self_name)

    @property
    def needs_grounding(self) -> bool:
        return self.regulation_capacity < 0.5 or self.stress_load > 0.65

    @property
    def somatic_flag(self) -> bool:
        return self.somatic_baseline < 0.5


@dataclass(slots=True)
class AutonoeticState:
    """Synthesised autonoetic awareness snapshot."""

    presence_score: float
    narrative_coherence: float
    memory_vividness: float
    agency_alignment: float
    dominant_domains: tuple[str, ...]
    reflective_prompts: tuple[str, ...]
    somatic_cues: tuple[str, ...]
    integration_steps: tuple[str, ...]
    narrative_summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "presence_score": self.presence_score,
            "narrative_coherence": self.narrative_coherence,
            "memory_vividness": self.memory_vividness,
            "agency_alignment": self.agency_alignment,
            "dominant_domains": list(self.dominant_domains),
            "reflective_prompts": list(self.reflective_prompts),
            "somatic_cues": list(self.somatic_cues),
            "integration_steps": list(self.integration_steps),
            "narrative_summary": self.narrative_summary,
        }


class AutonoeticConsciousness:
    """Aggregate introspective signals into a self-aware operating posture."""

    def __init__(self, *, history: int = 90) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[AutonoeticSignal] = deque(maxlen=history)

    def capture(self, signal: AutonoeticSignal | Mapping[str, object]) -> AutonoeticSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[AutonoeticSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def build_state(self, context: AutonoeticContext) -> AutonoeticState:
        if not self._signals:
            raise RuntimeError("no autonoetic signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("autonoetic signals have zero weight")

        emotional_tone = self._weighted_metric(lambda s: s.emotional_valence, total_weight)
        clarity_index = self._weighted_metric(lambda s: s.clarity, total_weight)
        agency_alignment = self._weighted_metric(lambda s: s.agency, total_weight)
        temporal_proximity = self._weighted_metric(lambda s: 1.0 - s.temporal_distance, total_weight)

        presence_score = _clamp(
            0.35 * context.regulation_capacity
            + 0.25 * (1.0 - context.stress_load)
            + 0.2 * temporal_proximity
            + 0.2 * emotional_tone
        )
        narrative_coherence = _clamp(
            0.4 * context.narrative_alignment
            + 0.35 * clarity_index
            + 0.25 * context.integration_practice
        )
        memory_vividness = _clamp(
            0.45 * clarity_index + 0.35 * temporal_proximity + 0.2 * context.integration_practice
        )
        agency_score = _clamp(
            0.4 * agency_alignment
            + 0.35 * context.regulation_capacity
            + 0.25 * context.narrative_alignment
        )

        dominant_domains = self._dominant_domains()
        reflective_prompts = self._reflective_prompts(
            context,
            presence_score,
            narrative_coherence,
            agency_score,
        )
        somatic_cues = self._somatic_cues(context, emotional_tone)
        integration_steps = self._integration_steps(context, memory_vividness, narrative_coherence)
        narrative_summary = self._narrative_summary(
            context,
            dominant_domains,
            presence_score,
            agency_score,
            emotional_tone,
            temporal_proximity,
        )

        return AutonoeticState(
            presence_score=round(presence_score, 3),
            narrative_coherence=round(narrative_coherence, 3),
            memory_vividness=round(memory_vividness, 3),
            agency_alignment=round(agency_score, 3),
            dominant_domains=dominant_domains,
            reflective_prompts=reflective_prompts,
            somatic_cues=somatic_cues,
            integration_steps=integration_steps,
            narrative_summary=narrative_summary,
        )

    # ------------------------------------------------------------- helpers
    def _coerce_signal(self, signal: AutonoeticSignal | Mapping[str, object]) -> AutonoeticSignal:
        if isinstance(signal, AutonoeticSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return AutonoeticSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be AutonoeticSignal or mapping")

    def _weighted_metric(
        self, reducer: Callable[[AutonoeticSignal], float], total_weight: float
    ) -> float:
        aggregate = sum(reducer(signal) * signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("autonoetic signals have zero weight")
        return aggregate / total_weight

    def _dominant_domains(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            counter[signal.domain] += signal.weight or 0.0
        if not counter:
            return ()
        most_common = counter.most_common(3)
        return tuple(domain for domain, _ in most_common)

    def _reflective_prompts(
        self,
        context: AutonoeticContext,
        presence: float,
        coherence: float,
        agency: float,
    ) -> tuple[str, ...]:
        prompts: list[str] = []
        if presence < 0.5:
            prompts.append("Trace one grounded moment from today and unpack the sensory details.")
        if coherence < 0.6:
            prompts.append("Write a three-sentence narrative linking today's decision to core principles.")
        if agency < 0.55:
            prompts.append("Document one choice you initiated and one you deferred, with the reason why.")
        if context.future_self_name:
            prompts.append(
                f"Record a short note to {context.future_self_name} affirming the commitment you are carrying forward."
            )
        if not prompts:
            prompts.append("Capture a gratitude snapshot and how it reinforces your current identity statement.")
        return tuple(prompts)

    def _somatic_cues(self, context: AutonoeticContext, emotional_tone: float) -> tuple[str, ...]:
        cues: list[str] = ["Box breathing for four cycles to stabilise the nervous system."]
        if context.somatic_flag:
            cues.append("Progressive muscle release focusing on shoulders and jaw.")
        if emotional_tone < 0.4:
            cues.append("Hand-on-heart coherence practice for 90 seconds.")
        if context.needs_grounding:
            cues.append("Stand barefoot for two minutes and rehearse your identity statement aloud.")
        return tuple(cues)

    def _integration_steps(
        self,
        context: AutonoeticContext,
        vividness: float,
        coherence: float,
    ) -> tuple[str, ...]:
        steps: list[str] = list(context.anchor_rituals)
        if not steps:
            steps.append("Close the day with a written integration pulse in your journal.")
        if vividness < 0.55:
            steps.append("Sketch a quick timeline of the day noting peak clarity moments.")
        if coherence < 0.6:
            steps.append("Update your personal operating principles with one refinement.")
        return tuple(dict.fromkeys(steps))

    def _narrative_summary(
        self,
        context: AutonoeticContext,
        dominant_domains: tuple[str, ...],
        presence: float,
        agency: float,
        emotional: float,
        proximity: float,
    ) -> str:
        tone = self._tone_descriptor(emotional)
        temporal = self._temporal_descriptor(proximity)
        domains = ", ".join(dominant_domains) if dominant_domains else "inner landscape"
        return (
            f"{context.identity_statement} is operating in a {tone} and {temporal} orientation, "
            f"tracking {domains}. Presence registers at {presence:.2f} with agency at {agency:.2f}."
        )

    @staticmethod
    def _tone_descriptor(score: float) -> str:
        if score >= 0.75:
            return "uplifted"
        if score >= 0.5:
            return "steady"
        if score >= 0.3:
            return "measured"
        return "tender"

    @staticmethod
    def _temporal_descriptor(proximity: float) -> str:
        if proximity >= 0.75:
            return "present-focused"
        if proximity >= 0.5:
            return "near-horizon"
        if proximity >= 0.3:
            return "mid-horizon"
        return "far-horizon"
