"""Holistic intelligence models unifying Dynamic Capital cognition engines."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Sequence, TypeVar, cast

from dynamic.intelligence.agi.model import DynamicAGIModel, AGIOutput
from dynamic_metacognition.engine import (
    DynamicMetacognition,
    MetaSignal,
    MetacognitiveReport,
    ReflectionContext,
)
from dynamic_self_awareness.engine import (
    AwarenessContext,
    DynamicSelfAwareness,
    SelfAwarenessReport,
    SelfAwarenessSignal,
)
from dynamic_thinking.engine import (
    DynamicThinkingEngine,
    ThinkingContext,
    ThinkingFrame,
    ThinkingSignal,
)
from dynamic_ultimate_reality.ultimate_reality import (
    DynamicUltimateReality,
    NonDualContext,
    UltimateRealitySignal,
    UltimateRealityState,
)

__all__ = [
    "DynamicAGIOrchestrator",
    "DynamicThinkingModel",
    "DynamicSelfAwarenessModel",
    "DynamicCognitiveModel",
    "DynamicUltimateRealityModel",
    "HolisticIntelligenceReport",
    "DynamicHolisticIntelligence",
]


_AGI_EVALUATE_ARGS = {
    "market_data",
    "research",
    "risk_context",
    "treasury",
    "inventory",
    "performance",
    "feedback_notes",
    "introspection_inputs",
}


SignalT = TypeVar("SignalT")


def _coerce_mapping(payload: Mapping[str, object]) -> Dict[str, Any]:
    return dict(payload)


def _resolve_thinking_context(
    context: ThinkingContext | Mapping[str, object]
) -> ThinkingContext:
    if isinstance(context, ThinkingContext):
        return context
    if isinstance(context, Mapping):
        data = _coerce_mapping(context)
        return ThinkingContext(**cast(Dict[str, Any], data))
    raise TypeError("context must be ThinkingContext or mapping")


def _resolve_awareness_context(
    context: AwarenessContext | Mapping[str, object]
) -> AwarenessContext:
    if isinstance(context, AwarenessContext):
        return context
    if isinstance(context, Mapping):
        data = _coerce_mapping(context)
        return AwarenessContext(**cast(Dict[str, Any], data))
    raise TypeError("context must be AwarenessContext or mapping")


def _resolve_reflection_context(
    context: ReflectionContext | Mapping[str, object]
) -> ReflectionContext:
    if isinstance(context, ReflectionContext):
        return context
    if isinstance(context, Mapping):
        data = _coerce_mapping(context)
        return ReflectionContext(**cast(Dict[str, Any], data))
    raise TypeError("context must be ReflectionContext or mapping")


def _resolve_nondual_context(
    context: NonDualContext | Mapping[str, object]
) -> NonDualContext:
    if isinstance(context, NonDualContext):
        return context
    if isinstance(context, Mapping):
        data = _coerce_mapping(context)
        return NonDualContext(**cast(Dict[str, Any], data))
    raise TypeError("context must be NonDualContext or mapping")


@dataclass(slots=True)
class DynamicAGIOrchestrator:
    """Lightweight wrapper exposing the Dynamic AGI pipeline."""

    model: DynamicAGIModel = field(default_factory=DynamicAGIModel)

    def evaluate(
        self,
        *,
        market_data: Mapping[str, object],
        research: Mapping[str, object] | None = None,
        risk_context: Mapping[str, object] | None = None,
        treasury: Mapping[str, object] | None = None,
        inventory: float = 0.0,
        performance: Mapping[str, object] | None = None,
        feedback_notes: Iterable[str] | None = None,
        introspection_inputs: Mapping[str, object] | None = None,
    ) -> AGIOutput:
        """Execute the AGI workflow and return the structured output."""

        return self.model.evaluate(
            market_data=market_data,
            research=research,
            risk_context=risk_context,
            treasury=treasury,
            inventory=inventory,
            performance=performance,
            feedback_notes=feedback_notes,
            introspection_inputs=introspection_inputs,
        )


@dataclass(slots=True)
class DynamicThinkingModel:
    """Operational thinking model orchestrating the thinking engine."""

    engine: DynamicThinkingEngine = field(default_factory=DynamicThinkingEngine)

    def run_cycle(
        self,
        *,
        context: ThinkingContext | Mapping[str, object],
        signals: Iterable[ThinkingSignal | Mapping[str, object]]
    ) -> ThinkingFrame:
        """Reset the engine, ingest signals, and produce a thinking frame."""

        resolved_context = _resolve_thinking_context(context)
        resolved_signals = _coerce_signals(
            signals,
            label="thinking_signals",
            signal_type=ThinkingSignal,
        )
        self.engine.reset()
        self.engine.extend(resolved_signals)
        return self.engine.build_frame(resolved_context)


@dataclass(slots=True)
class DynamicSelfAwarenessModel:
    """Self-awareness model aligning awareness signals with constructive action."""

    engine: DynamicSelfAwareness = field(default_factory=DynamicSelfAwareness)

    def assess(
        self,
        *,
        context: AwarenessContext | Mapping[str, object],
        signals: Iterable[SelfAwarenessSignal | Mapping[str, object]],
    ) -> SelfAwarenessReport:
        """Generate a self-awareness report for the supplied context."""

        resolved_context = _resolve_awareness_context(context)
        resolved_signals = _coerce_signals(
            signals,
            label="self_awareness_signals",
            signal_type=SelfAwarenessSignal,
        )
        self.engine.reset()
        self.engine.extend(resolved_signals)
        return self.engine.generate_report(resolved_context)


@dataclass(slots=True)
class DynamicCognitiveModel:
    """Cognitive reflection model coordinating the metacognition engine."""

    engine: DynamicMetacognition = field(default_factory=DynamicMetacognition)

    def reflect(
        self,
        *,
        context: ReflectionContext | Mapping[str, object],
        signals: Iterable[MetaSignal | Mapping[str, object]],
    ) -> MetacognitiveReport:
        """Run a metacognitive reflection cycle and return the report."""

        resolved_context = _resolve_reflection_context(context)
        resolved_signals = _coerce_signals(
            signals,
            label="cognitive_signals",
            signal_type=MetaSignal,
        )
        self.engine.reset()
        self.engine.extend(resolved_signals)
        return self.engine.generate_report(resolved_context)


@dataclass(slots=True)
class DynamicUltimateRealityModel:
    """Ultimate reality model synthesising non-dual signals."""

    engine: DynamicUltimateReality = field(default_factory=DynamicUltimateReality)

    def realise(
        self,
        *,
        context: NonDualContext | Mapping[str, object],
        signals: Iterable[UltimateRealitySignal | Mapping[str, object]],
    ) -> UltimateRealityState:
        """Produce an ultimate reality state description."""

        resolved_context = _resolve_nondual_context(context)
        resolved_signals = _coerce_signals(
            signals,
            label="ultimate_signals",
            signal_type=UltimateRealitySignal,
        )
        self.engine.reset()
        self.engine.extend(resolved_signals)
        return self.engine.realise(resolved_context)


@dataclass(slots=True)
class HolisticIntelligenceReport:
    """Bundled outputs emitted by the holistic intelligence suite."""

    agi: AGIOutput
    thinking: ThinkingFrame
    self_awareness: SelfAwarenessReport
    cognitive: MetacognitiveReport
    ultimate_reality: UltimateRealityState

    def as_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable representation of the report."""

        return {
            "agi": self.agi.to_dict(),
            "thinking": self.thinking.as_dict(),
            "self_awareness": self.self_awareness.as_dict(),
            "cognitive": self.cognitive.as_dict(),
            "ultimate_reality": self.ultimate_reality.as_dict(),
        }


@dataclass(slots=True)
class DynamicHolisticIntelligence:
    """Container exposing the suite of holistic intelligence models."""

    agi: DynamicAGIOrchestrator = field(default_factory=DynamicAGIOrchestrator)
    thinking: DynamicThinkingModel = field(default_factory=DynamicThinkingModel)
    self_awareness: DynamicSelfAwarenessModel = field(
        default_factory=DynamicSelfAwarenessModel
    )
    cognitive: DynamicCognitiveModel = field(default_factory=DynamicCognitiveModel)
    ultimate_reality: DynamicUltimateRealityModel = field(
        default_factory=DynamicUltimateRealityModel
    )

    def describe(self) -> Mapping[str, Sequence[str]]:
        """Return a high-level description of each model pillar."""

        return {
            "agi": (
                "Dynamic AGI orchestrator integrating analysis, risk, and improvement.",
            ),
            "thinking": (
                "Dynamic thinking model transforming qualitative signals into action.",
            ),
            "self_awareness": (
                "Self-awareness model balancing clarity, emotion, and alignment.",
            ),
            "cognitive": (
                "Cognitive model guiding reflective practice and experimentation.",
            ),
            "ultimate_reality": (
                "Ultimate reality model articulating non-dual integration needs.",
            ),
        }

    def run_back_to_back(
        self,
        *,
        agi_inputs: Mapping[str, object],
        thinking_context: ThinkingContext | Mapping[str, object],
        thinking_signals: Iterable[ThinkingSignal | Mapping[str, object]],
        self_awareness_context: AwarenessContext | Mapping[str, object],
        self_awareness_signals: Iterable[SelfAwarenessSignal | Mapping[str, object]],
        cognitive_context: ReflectionContext | Mapping[str, object],
        cognitive_signals: Iterable[MetaSignal | Mapping[str, object]],
        ultimate_context: NonDualContext | Mapping[str, object],
        ultimate_signals: Iterable[UltimateRealitySignal | Mapping[str, object]],
    ) -> HolisticIntelligenceReport:
        """Execute all models sequentially and bundle their outputs."""

        agi_payload = _coerce_mapping(agi_inputs)
        missing = {"market_data"} - agi_payload.keys()
        if missing:
            missing_key = next(iter(missing))
            raise KeyError(f"agi_inputs missing required field: {missing_key}")
        allowed_payload = {
            key: agi_payload[key]
            for key in _AGI_EVALUATE_ARGS
            if key in agi_payload
        }
        agi_output = self.agi.evaluate(**allowed_payload)

        thinking_frame = self.thinking.run_cycle(
            context=thinking_context,
            signals=thinking_signals,
        )

        self_awareness_report = self.self_awareness.assess(
            context=self_awareness_context,
            signals=self_awareness_signals,
        )

        cognitive_report = self.cognitive.reflect(
            context=cognitive_context,
            signals=cognitive_signals,
        )

        ultimate_state = self.ultimate_reality.realise(
            context=ultimate_context,
            signals=ultimate_signals,
        )

        return HolisticIntelligenceReport(
            agi=agi_output,
            thinking=thinking_frame,
            self_awareness=self_awareness_report,
            cognitive=cognitive_report,
            ultimate_reality=ultimate_state,
        )


def _coerce_signals(
    signals: Iterable[SignalT | Mapping[str, object]],
    *,
    label: str,
    signal_type: type[SignalT],
) -> tuple[SignalT, ...]:
    """Normalise a signal iterable and ensure it contains at least one item."""

    resolved: list[SignalT] = []
    for index, signal in enumerate(signals):
        if isinstance(signal, signal_type):
            resolved.append(signal)
            continue
        if isinstance(signal, Mapping):
            payload = cast(Dict[str, Any], dict(signal))
            resolved.append(signal_type(**payload))  # type: ignore[arg-type]
            continue
        raise TypeError(
            f"{label}[{index}] must be {signal_type.__name__} or mapping,"
            f" received {type(signal)!r}",
        )

    if not resolved:
        raise ValueError(f"{label} must contain at least one signal")

    return tuple(resolved)

