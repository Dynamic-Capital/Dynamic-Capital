"""Personal resilience orchestration built on top of the healing engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_heal import DynamicHealEngine, HealingCapability, HealingPlan, HealingSignal

__all__ = [
    "SelfHealingSignal",
    "RestorativePractice",
    "SelfHealingContext",
    "SelfHealingRecommendation",
    "DynamicSelfHealing",
]


def _normalise_text(value: str, *, field_name: str = "value") -> str:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} must not be empty")
    return cleaned


def _normalise_tuple(items: Iterable[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = item.strip()
        if not cleaned:
            continue
        if lower:
            cleaned = cleaned.lower()
        if cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


@dataclass(slots=True)
class SelfHealingSignal:
    """Observation describing tension within the operator's system."""

    identifier: str
    description: str
    severity: float
    affected_domains: tuple[str, ...] = field(default_factory=tuple)
    energy_drain: float = 0.0
    emotional_weight: float = 0.5
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier, field_name="identifier")
        self.description = _normalise_text(self.description, field_name="description")
        self.severity = _clamp(self.severity)
        self.affected_domains = _normalise_tuple(self.affected_domains, lower=True)
        self.energy_drain = _clamp(self.energy_drain)
        self.emotional_weight = _clamp(self.emotional_weight)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def to_healing_signal(self) -> HealingSignal:
        """Translate the personal signal into a general healing signal."""

        severity = _clamp(
            (self.severity * 0.6) + (self.energy_drain * 0.25) + (self.emotional_weight * 0.15)
        )
        blast_radius = _clamp(0.2 + self.emotional_weight * 0.5 + self.energy_drain * 0.3)
        metadata: MutableMapping[str, object] = dict(self.metadata or {})
        metadata.setdefault("self_healing", True)
        metadata.setdefault("energy_drain", round(self.energy_drain, 4))
        metadata.setdefault("emotional_weight", round(self.emotional_weight, 4))
        metadata.setdefault("domains", self.affected_domains)
        return HealingSignal(
            identifier=self.identifier,
            narrative=self.description,
            severity=severity,
            affected_domains=self.affected_domains,
            blast_radius=blast_radius,
            metadata=metadata,
        )


@dataclass(slots=True)
class RestorativePractice:
    """Practice that can restore balance across specific domains."""

    name: str
    domains: tuple[str, ...]
    restoration_power: float = 0.7
    stabilisation_speed: float = 0.5
    effort_minutes: float = 20.0
    support_profile: str = "self-directed"

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field_name="name")
        self.domains = _normalise_tuple(self.domains, lower=True)
        if not self.domains:
            raise ValueError("restorative practice must target at least one domain")
        self.restoration_power = _clamp(self.restoration_power)
        self.stabilisation_speed = _clamp(self.stabilisation_speed)
        self.effort_minutes = max(float(self.effort_minutes), 0.0)
        self.support_profile = self.support_profile.strip() or "self-directed"

    def to_capability(self) -> HealingCapability:
        """Convert to the generic healing capability representation."""

        # Faster practices (higher stabilisation speed) and lighter effort shorten response time.
        effort_factor = min(self.effort_minutes, 120.0) / 180.0
        response_time = _clamp(1.0 - (self.stabilisation_speed * 0.7) - (0.3 * (1.0 - effort_factor)))
        capacity = _clamp(self.restoration_power * (1.0 - (effort_factor * 0.4)) + self.stabilisation_speed * 0.2)
        return HealingCapability(
            name=self.name,
            domains=self.domains,
            capacity=capacity,
            response_time=response_time,
        )


@dataclass(slots=True)
class SelfHealingContext:
    """Constraints and signals around the healing session."""

    focus_area: str = "general"
    available_minutes: float = 30.0
    support_level: float = 0.5
    baseline_resilience: float = 0.6
    urgency: float = 0.5

    def __post_init__(self) -> None:
        self.focus_area = _normalise_text(self.focus_area, field_name="focus_area").lower()
        self.available_minutes = max(float(self.available_minutes), 0.0)
        self.support_level = _clamp(self.support_level)
        self.baseline_resilience = _clamp(self.baseline_resilience)
        self.urgency = _clamp(self.urgency)


@dataclass(slots=True)
class SelfHealingRecommendation:
    """Combined healing plan enriched with personal guidance."""

    plan: HealingPlan
    recovery_readiness: float
    suggested_sequence: tuple[str, ...]
    aftercare_prompts: tuple[str, ...]
    stability_outlook: str
    available_minutes: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "plan": self.plan.as_dict(),
            "recovery_readiness": self.recovery_readiness,
            "suggested_sequence": list(self.suggested_sequence),
            "aftercare_prompts": list(self.aftercare_prompts),
            "stability_outlook": self.stability_outlook,
            "available_minutes": self.available_minutes,
        }


class DynamicSelfHealing:
    """Orchestrate self-healing responses using restorative practices."""

    def __init__(self, *, engine: DynamicHealEngine | None = None) -> None:
        self._engine = engine or DynamicHealEngine()

    def compile_plan(
        self,
        signals: Sequence[SelfHealingSignal | Mapping[str, object]],
        practices: Sequence[RestorativePractice | Mapping[str, object]],
        context: SelfHealingContext | Mapping[str, object],
    ) -> SelfHealingRecommendation:
        if not signals:
            raise ValueError("at least one self-healing signal is required")
        if not practices:
            raise ValueError("at least one restorative practice is required")

        resolved_signals = [self._coerce_signal(signal) for signal in signals]
        resolved_practices = [self._coerce_practice(practice) for practice in practices]
        resolved_context = self._coerce_context(context)

        heal_plan = self._engine.orchestrate(
            [signal.to_healing_signal() for signal in resolved_signals],
            [practice.to_capability() for practice in resolved_practices],
        )

        practice_lookup = {practice.name: practice for practice in resolved_practices}
        readiness = self._recovery_readiness(resolved_signals, resolved_context, heal_plan)
        sequence = self._sequence(heal_plan, resolved_context, practice_lookup)
        aftercare = self._aftercare(resolved_context, resolved_signals, practice_lookup)
        outlook = self._stability_outlook(heal_plan, resolved_context, resolved_signals, readiness)

        return SelfHealingRecommendation(
            plan=heal_plan,
            recovery_readiness=readiness,
            suggested_sequence=sequence,
            aftercare_prompts=aftercare,
            stability_outlook=outlook,
            available_minutes=resolved_context.available_minutes,
        )

    # ------------------------------------------------------------------ helpers
    def _coerce_signal(self, signal: SelfHealingSignal | Mapping[str, object]) -> SelfHealingSignal:
        if isinstance(signal, SelfHealingSignal):
            return signal
        if isinstance(signal, Mapping):
            return SelfHealingSignal(**signal)
        raise TypeError("signal must be SelfHealingSignal or mapping")

    def _coerce_practice(self, practice: RestorativePractice | Mapping[str, object]) -> RestorativePractice:
        if isinstance(practice, RestorativePractice):
            return practice
        if isinstance(practice, Mapping):
            return RestorativePractice(**practice)
        raise TypeError("practice must be RestorativePractice or mapping")

    def _coerce_context(self, context: SelfHealingContext | Mapping[str, object]) -> SelfHealingContext:
        if isinstance(context, SelfHealingContext):
            return context
        if isinstance(context, Mapping):
            return SelfHealingContext(**context)
        raise TypeError("context must be SelfHealingContext or mapping")

    def _recovery_readiness(
        self,
        signals: Sequence[SelfHealingSignal],
        context: SelfHealingContext,
        plan: HealingPlan,
    ) -> float:
        avg_severity = sum(signal.severity for signal in signals) / len(signals)
        avg_drain = sum(signal.energy_drain for signal in signals) / len(signals)
        base_capacity = _clamp(1.0 - (avg_severity * 0.6 + avg_drain * 0.4))
        support_boost = 0.4 + context.support_level * 0.6
        urgency_modifier = 1.0 - (context.urgency * 0.2)
        readiness = (base_capacity * support_boost * urgency_modifier + context.baseline_resilience) / 2
        return _clamp(readiness * (1.0 - plan.overall_priority * 0.2))

    def _sequence(
        self,
        plan: HealingPlan,
        context: SelfHealingContext,
        practices: Mapping[str, RestorativePractice],
    ) -> tuple[str, ...]:
        actions = sorted(plan.actions, key=lambda action: action.priority, reverse=True)
        if not actions:
            return (
                "Review captured signals and confirm no immediate restorative practice is required.",
            )

        slices = context.available_minutes / len(actions) if context.available_minutes else 0.0
        steps: list[str] = []
        if context.focus_area != "general":
            steps.append(f"Focus on restoring {context.focus_area} systems before broader work.")

        for index, action in enumerate(actions, start=1):
            annotation_parts: list[str] = []
            if slices:
                annotation_parts.append(f"~{slices:.0f} min")
            practice = practices.get(action.owner)
            if practice and practice.support_profile.lower() != "self-directed":
                annotation_parts.append(f"coordinate with {practice.support_profile}")
            annotation = f" ({'; '.join(annotation_parts)})" if annotation_parts else ""
            steps.append(f"Step {index}: {action.description}{annotation}")
        return tuple(steps)

    def _aftercare(
        self,
        context: SelfHealingContext,
        signals: Sequence[SelfHealingSignal],
        practices: Mapping[str, RestorativePractice],
    ) -> tuple[str, ...]:
        prompts: list[str] = []
        avg_emotional_weight = sum(signal.emotional_weight for signal in signals) / len(signals)
        avg_drain = sum(signal.energy_drain for signal in signals) / len(signals)

        if context.support_level < 0.4:
            prompts.append("Share the recovery plan with a support partner to boost accountability.")
        if avg_emotional_weight > 0.6:
            prompts.append("Schedule a grounding check-in after completing the plan to settle emotional load.")
        if avg_drain > 0.6:
            prompts.append("Block additional rest or sleep to replenish depleted energy reserves.")
        if context.available_minutes < 25:
            prompts.append("Book a follow-up session with more time to deepen the recovery work.")

        if any(practice.support_profile.lower() != "self-directed" for practice in practices.values()):
            prompts.append("Confirm availability of collaborators noted in the sequence before starting.")

        prompts.append("Log insights after execution and reassess readiness within the next 24 hours.")
        # Deduplicate while preserving order.
        seen: set[str] = set()
        deduped: list[str] = []
        for prompt in prompts:
            if prompt not in seen:
                seen.add(prompt)
                deduped.append(prompt)
        return tuple(deduped)

    def _stability_outlook(
        self,
        plan: HealingPlan,
        context: SelfHealingContext,
        signals: Sequence[SelfHealingSignal],
        readiness: float,
    ) -> str:
        peak_severity = max(signal.severity for signal in signals)
        avg_drain = sum(signal.energy_drain for signal in signals) / len(signals)
        focus = context.focus_area.replace("_", " ")

        if peak_severity > 0.8 or plan.overall_priority > 0.8:
            return (
                f"Critical drift detected within {focus}; execute the plan immediately and escalate support "
                "if relief is not felt within the next hour."
            )
        if readiness < 0.4:
            return (
                f"Recovery capacity is strained for {focus}; simplify commitments and extend rest before revisiting the plan."
            )
        if avg_drain > 0.6:
            return (
                f"Energy reserves are low across {focus}; pair the planned work with nourishment and decompression rituals."
            )
        if plan.overall_priority > 0.6:
            return (
                f"Stability is fragile around {focus}; follow the sequence then schedule a check-in tomorrow to confirm rebound."
            )
        return f"{focus.title()} systems show improving stability; maintain light maintenance rituals after completing the plan."
