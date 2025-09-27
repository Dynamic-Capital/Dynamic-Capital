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
    "AwarenessDiagnostics",
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


@dataclass(slots=True)
class AwarenessDiagnostics:
    """Operational diagnostics that contextualise an integrated awareness read."""

    signal_counts: dict[str, int]
    latest_observations: dict[str, str]
    imbalance_alerts: tuple[str, ...]
    momentum_trends: dict[str, float]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "signal_counts": dict(self.signal_counts),
            "latest_observations": dict(self.latest_observations),
            "imbalance_alerts": list(self.imbalance_alerts),
            "momentum_trends": dict(self.momentum_trends),
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

    def synthesise_with_diagnostics(
        self, contexts: AwarenessContexts
    ) -> tuple[IntegratedAwareness, AwarenessDiagnostics]:
        """Synthesize an awareness snapshot while returning diagnostic metadata."""

        integrated = self.synthesise(contexts)
        diagnostics = self._build_diagnostics(contexts, integrated)
        return integrated, diagnostics

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

    def synthesise_from_payloads_with_diagnostics(
        self,
        *,
        consciousness: ConsciousnessContext | Mapping[str, object],
        self_awareness: AwarenessContext | Mapping[str, object],
        ultimate_reality: NonDualContext | Mapping[str, object],
    ) -> tuple[IntegratedAwareness, AwarenessDiagnostics]:
        """Normalise payloads and provide diagnostics alongside synthesis."""

        contexts = AwarenessContexts.from_payloads(
            consciousness=consciousness,
            self_awareness=self_awareness,
            ultimate_reality=ultimate_reality,
        )
        return self.synthesise_with_diagnostics(contexts)

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

    def _build_diagnostics(
        self,
        contexts: AwarenessContexts,
        integrated: IntegratedAwareness,
    ) -> AwarenessDiagnostics:
        signal_counts = {
            "consciousness": self._consciousness.signal_count,
            "self_awareness": self._self_awareness.signal_count,
            "ultimate_reality": self._ultimate_reality.signal_count,
        }
        latest_observations = self._latest_observations()
        imbalance_alerts = self._imbalance_alerts(
            contexts, integrated.self_awareness, integrated.ultimate_reality
        )
        momentum_trends = self._momentum_trends(contexts, integrated)

        return AwarenessDiagnostics(
            signal_counts=signal_counts,
            latest_observations=latest_observations,
            imbalance_alerts=imbalance_alerts,
            momentum_trends=momentum_trends,
        )

    def _latest_observations(self) -> dict[str, str]:
        observations: dict[str, str] = {}
        last_consciousness = self._consciousness.latest_signal()
        if last_consciousness is not None:
            observations["consciousness"] = last_consciousness.observation
        last_self = self._self_awareness.latest_signal()
        if last_self is not None:
            observations["self_awareness"] = last_self.observation
        last_ultimate = self._ultimate_reality.latest_signal()
        if last_ultimate is not None:
            observations["ultimate_reality"] = last_ultimate.insight
        return observations

    def _imbalance_alerts(
        self,
        contexts: AwarenessContexts,
        self_awareness: SelfAwarenessReport,
        ultimate: UltimateRealityState,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if contexts.self_awareness.readiness_for_action > 0.6 and self_awareness.overthinking_risk > 0.55:
            alerts.append(
                "Readiness for action is high while overthinking risk remains elevated — translate clarity into decisive movement."
            )
        if ultimate.groundedness_index < 0.45 and contexts.ultimate_reality.integration_capacity > 0.6:
            alerts.append(
                "Integration capacity outpaces groundedness — slow down assimilation and return to somatic anchors."
            )
        if self_awareness.emotional_equilibrium < 0.45 or contexts.self_awareness.bodily_tension > 0.65:
            alerts.append(
                "Emotional regulation is strained — prioritise nervous-system stabilisation before complex problem solving."
            )
        if not alerts:
            alerts.append(
                "Signals are balanced across systems — continue current cadence while monitoring for subtle drift."
            )
        return tuple(dict.fromkeys(alerts))

    def _momentum_trends(
        self, contexts: AwarenessContexts, integrated: IntegratedAwareness
    ) -> dict[str, float]:
        return {
            "readiness_vs_action": integrated.composite_readiness
            - contexts.self_awareness.readiness_for_action,
            "groundedness_vs_regulation": integrated.harmonised_groundedness
            - contexts.ultimate_reality.nervous_system_regulation,
            "awareness_vs_opportunity": integrated.consciousness.awareness_index
            - contexts.consciousness.opportunity_level,
        }
