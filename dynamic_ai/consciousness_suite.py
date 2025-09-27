"""Integrated consciousness orchestration across awareness engines."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence, Type, TypeVar

from dynamic_consciousness import (
    ConsciousnessContext,
    ConsciousnessSignal,
    ConsciousnessState,
    DynamicConsciousness,
)
from dynamic_self_awareness import (
    AwarenessContext,
    DynamicSelfAwareness,
    SelfAwarenessReport,
    SelfAwarenessSignal,
)
from dynamic_ultimate_reality import (
    DynamicUltimateReality,
    NonDualContext,
    UltimateRealitySignal,
    UltimateRealityState,
)

__all__ = [
    "AwarenessContexts",
    "IntegratedAwareness",
    "DynamicConsciousnessSuite",
]


ContextT = TypeVar("ContextT")


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _unique_sequence(items: Iterable[str]) -> tuple[str, ...]:
    seen: dict[str, None] = {}
    for item in items:
        if item and item not in seen:
            seen[item] = None
    return tuple(seen.keys())


def _coerce_context(
    ctx_type: Type[ContextT],
    value: ContextT | Mapping[str, object],
    *,
    name: str,
) -> ContextT:
    if isinstance(value, ctx_type):
        return value
    if isinstance(value, Mapping):
        payload: MutableMapping[str, object] = dict(value)
        return ctx_type(**payload)  # type: ignore[arg-type]
    raise TypeError(f"{name} must be a {ctx_type.__name__} or mapping")


def _resolve_engine(
    engine: ContextT | None,
    engine_type: Type[ContextT],
    *,
    history: int,
    label: str,
) -> ContextT:
    if engine is not None:
        if not isinstance(engine, engine_type):
            raise TypeError(
                f"{label} engine must be an instance of {engine_type.__name__}"
            )
        return engine
    return engine_type(history=history)


@dataclass(slots=True)
class AwarenessContexts:
    """Bundle of contexts for each awareness engine."""

    consciousness: ConsciousnessContext
    self_awareness: AwarenessContext
    ultimate_reality: NonDualContext

    @classmethod
    def from_payloads(
        cls,
        *,
        consciousness: ConsciousnessContext | Mapping[str, object],
        self_awareness: AwarenessContext | Mapping[str, object],
        ultimate_reality: NonDualContext | Mapping[str, object],
    ) -> "AwarenessContexts":
        """Normalise mapping payloads into concrete context dataclasses."""

        resolved_consciousness = _coerce_context(
            ConsciousnessContext, consciousness, name="consciousness"
        )
        resolved_self_awareness = _coerce_context(
            AwarenessContext, self_awareness, name="self_awareness"
        )
        resolved_ultimate = _coerce_context(
            NonDualContext, ultimate_reality, name="ultimate_reality"
        )
        return cls(
            consciousness=resolved_consciousness,
            self_awareness=resolved_self_awareness,
            ultimate_reality=resolved_ultimate,
        )


@dataclass(slots=True)
class IntegratedAwareness:
    """Integrated snapshot across consciousness, self-awareness, and reality."""

    consciousness: ConsciousnessState
    self_awareness: SelfAwarenessReport
    ultimate_reality: UltimateRealityState
    composite_readiness: float
    harmonised_groundedness: float
    recommended_themes: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "consciousness": self.consciousness.as_dict(),
            "self_awareness": dict(self.self_awareness.as_dict()),
            "ultimate_reality": self.ultimate_reality.as_dict(),
            "composite_readiness": self.composite_readiness,
            "harmonised_groundedness": self.harmonised_groundedness,
            "recommended_themes": list(self.recommended_themes),
            "narrative": self.narrative,
        }


class DynamicConsciousnessSuite:
    """Optimised coordinator for the awareness-oriented engines."""

    def __init__(
        self,
        *,
        history: int = 60,
        consciousness: DynamicConsciousness | None = None,
        self_awareness: DynamicSelfAwareness | None = None,
        ultimate_reality: DynamicUltimateReality | None = None,
    ) -> None:
        if history <= 0 and (
            consciousness is None
            or self_awareness is None
            or ultimate_reality is None
        ):
            raise ValueError("history must be positive when creating engines")
        self._consciousness = _resolve_engine(
            consciousness,
            DynamicConsciousness,
            history=history,
            label="consciousness",
        )
        self._self_awareness = _resolve_engine(
            self_awareness,
            DynamicSelfAwareness,
            history=history,
            label="self_awareness",
        )
        self._ultimate_reality = _resolve_engine(
            ultimate_reality,
            DynamicUltimateReality,
            history=history,
            label="ultimate_reality",
        )

    # ----------------------------------------------------------------- capture
    def capture_consciousness(
        self, signal: ConsciousnessSignal | Mapping[str, object]
    ) -> ConsciousnessSignal:
        return self._consciousness.capture(signal)

    def capture_self_awareness(
        self, signal: SelfAwarenessSignal | Mapping[str, object]
    ) -> SelfAwarenessSignal:
        return self._self_awareness.capture(signal)

    def capture_ultimate_reality(
        self, signal: UltimateRealitySignal | Mapping[str, object]
    ) -> UltimateRealitySignal:
        return self._ultimate_reality.capture(signal)

    def extend(
        self,
        *,
        consciousness: Sequence[ConsciousnessSignal | Mapping[str, object]] | None = None,
        self_awareness: Sequence[SelfAwarenessSignal | Mapping[str, object]] | None = None,
        ultimate_reality: Sequence[UltimateRealitySignal | Mapping[str, object]] | None = None,
    ) -> None:
        if consciousness:
            self._consciousness.extend(consciousness)
        if self_awareness:
            self._self_awareness.extend(self_awareness)
        if ultimate_reality:
            self._ultimate_reality.extend(ultimate_reality)

    def reset(self) -> None:
        self._consciousness.reset()
        self._self_awareness.reset()
        self._ultimate_reality.reset()

    # --------------------------------------------------------------- synthesis
    def synthesise(self, contexts: AwarenessContexts) -> IntegratedAwareness:
        consciousness_state = self._consciousness.build_state(contexts.consciousness)
        self_awareness_report = self._self_awareness.generate_report(
            contexts.self_awareness
        )
        ultimate_state = self._ultimate_reality.realise(contexts.ultimate_reality)

        composite_readiness = _clamp(
            0.4 * consciousness_state.readiness_index
            + 0.35 * (1.0 - self_awareness_report.overthinking_risk)
            + 0.25 * ultimate_state.integration_index
        )
        harmonised_groundedness = _clamp(
            0.4 * consciousness_state.stability_index
            + 0.3 * self_awareness_report.emotional_equilibrium
            + 0.3 * ultimate_state.groundedness_index
        )
        recommended_themes = self._recommended_themes(
            consciousness_state,
            self_awareness_report,
            ultimate_state,
        )
        narrative = self._compose_narrative(
            contexts,
            consciousness_state,
            self_awareness_report,
            ultimate_state,
            composite_readiness,
            harmonised_groundedness,
        )

        return IntegratedAwareness(
            consciousness=consciousness_state,
            self_awareness=self_awareness_report,
            ultimate_reality=ultimate_state,
            composite_readiness=composite_readiness,
            harmonised_groundedness=harmonised_groundedness,
            recommended_themes=recommended_themes,
            narrative=narrative,
        )

    def synthesise_from_payloads(
        self,
        *,
        consciousness: ConsciousnessContext | Mapping[str, object],
        self_awareness: AwarenessContext | Mapping[str, object],
        ultimate_reality: NonDualContext | Mapping[str, object],
    ) -> IntegratedAwareness:
        """Normalise mapping payloads before orchestrating synthesis."""

        contexts = AwarenessContexts.from_payloads(
            consciousness=consciousness,
            self_awareness=self_awareness,
            ultimate_reality=ultimate_reality,
        )
        return self.synthesise(contexts)

    # ------------------------------------------------------------- helper logic
    def _recommended_themes(
        self,
        consciousness: ConsciousnessState,
        self_awareness: SelfAwarenessReport,
        ultimate: UltimateRealityState,
    ) -> tuple[str, ...]:
        themes = list(consciousness.recommended_focus)
        themes.extend(self_awareness.productive_actions)
        themes.extend(self_awareness.grounding_practices)
        themes.extend(ultimate.integration_actions)
        return _unique_sequence(theme.strip() for theme in themes if theme.strip())

    def _compose_narrative(
        self,
        contexts: AwarenessContexts,
        consciousness: ConsciousnessState,
        self_awareness: SelfAwarenessReport,
        ultimate: UltimateRealityState,
        readiness: float,
        groundedness: float,
    ) -> str:
        sections = [
            consciousness.narrative_summary,
            self_awareness.narrative,
            ultimate.narrative,
            (
                f"Composite readiness {readiness:.2f}, harmonised groundedness {groundedness:.2f}."
            ),
        ]
        anchor = (
            f"Mission '{contexts.consciousness.mission}' | "
            f"Situation '{contexts.self_awareness.situation}' | "
            f"Intention '{contexts.ultimate_reality.intention}'"
        )
        sections.append(anchor)
        return "\n".join(section for section in sections if section)
