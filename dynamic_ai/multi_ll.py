"""Dynamic AI domain orchestration for the multi-LLM ensemble engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Protocol, Sequence

from dynamic_multi_ll import (
    DynamicMultiLLEngine,
    LLModelDescriptor,
    MultiLLAggregate,
    MultiLLModel,
    MultiLLPrompt,
    MultiLLResponse,
)

from .core import AISignal, score_to_action

__all__ = [
    "TradingAdapter",
    "EnsembleAISignal",
    "DynamicAIMultiLLCoordinator",
]


_ACTION_TO_SCORE: Mapping[str, float] = {
    "BUY": 1.0,
    "SELL": -1.0,
    "HOLD": 0.0,
    "NEUTRAL": 0.0,
}


def _coerce_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):  # pragma: no cover - defensive guard
        return default


class TradingAdapter(Protocol):
    """Protocol describing the adapter signature expected by the coordinator."""

    def __call__(self, descriptor: LLModelDescriptor, prompt: MultiLLPrompt) -> MultiLLResponse:
        ...


@dataclass(slots=True)
class EnsembleAISignal:
    """Container wrapping the aggregated ensemble recommendation for trading."""

    signal: AISignal
    aggregate: MultiLLAggregate
    responses: tuple[MultiLLResponse, ...]
    metrics: Mapping[str, float]

    def to_dict(self) -> Mapping[str, object]:
        """Serialise the ensemble output for downstream consumers."""

        payload: MutableMapping[str, object] = {
            "signal": self.signal.to_dict(),
            "aggregate": {
                "content": self.aggregate.content,
                "confidence": self.aggregate.confidence,
                "strategy": self.aggregate.strategy,
                "supporting_models": list(self.aggregate.supporting_models),
            },
            "metrics": dict(self.metrics),
        }
        return payload


class DynamicAIMultiLLCoordinator:
    """Domain-specific wrapper producing Dynamic AI trading signals from the ensemble."""

    def __init__(self, ensemble: MultiLLModel, *, engine: DynamicMultiLLEngine | None = None) -> None:
        self._engine = engine or DynamicMultiLLEngine(ensemble)

    @property
    def engine(self) -> DynamicMultiLLEngine:
        return self._engine

    def calibrate(self, feedback: Mapping[str, float]) -> MultiLLModel:
        """Forward calibration feedback to the underlying engine."""

        return self._engine.calibrate(feedback)

    def build_prompt(
        self,
        *,
        task: str,
        market_context: str,
        signals: Iterable[str] | None = None,
        risk_overrides: Mapping[str, object] | None = None,
        language: str = "en",
    ) -> MultiLLPrompt:
        """Create the shared prompt that will be broadcast to the ensemble."""

        hints: list[str] = ["Focus on actionable trading decisions."]
        if signals:
            hints.append(
                "Blend base signals: "
                + ", ".join(sorted(str(signal).upper() for signal in signals if signal))
            )
        if risk_overrides:
            hints.append(
                "Risk parameters: "
                + ", ".join(
                    f"{key}={value}" for key, value in sorted(risk_overrides.items())
                )
            )
        metadata: Mapping[str, object] | None = None
        if risk_overrides:
            metadata = {"risk_overrides": dict(risk_overrides)}
        return MultiLLPrompt(
            task=task,
            context=market_context,
            language=language,
            hints=hints,
            metadata=metadata,
        )

    def generate_signal(
        self,
        *,
        task: str,
        market_context: str,
        adapter: TradingAdapter,
        signals: Iterable[str] | None = None,
        base_action: str | None = None,
        risk_overrides: Mapping[str, object] | None = None,
        language: str = "en",
    ) -> EnsembleAISignal:
        """Broadcast the prompt and consolidate a trading signal."""

        prompt = self.build_prompt(
            task=task,
            market_context=market_context,
            signals=signals,
            risk_overrides=risk_overrides,
            language=language,
        )
        result = self._engine.generate(prompt, adapter)
        weighted_score, weight = self._weighted_score(result.responses)
        neutral = base_action.upper() if base_action else "NEUTRAL"
        action = score_to_action(weighted_score, neutral_action=neutral)
        signal = AISignal(
            action=action,
            confidence=result.aggregate.confidence,
            reasoning=result.aggregate.content,
            original_signal=neutral,
        )
        aggregate_metadata = dict(result.aggregate.metadata or {})
        metrics = {
            "weighted_score": round(weighted_score, 4),
            "ensemble_weight": round(weight, 4),
            "consensus_ratio": round(
                _coerce_float(aggregate_metadata.get("consensus_ratio"), 0.0), 4
            ),
        }
        return EnsembleAISignal(
            signal=signal,
            aggregate=result.aggregate,
            responses=result.responses,
            metrics=metrics,
        )

    @staticmethod
    def _weighted_score(responses: Sequence[MultiLLResponse]) -> tuple[float, float]:
        total_weight = 0.0
        weighted_sum = 0.0
        for response in responses:
            meta = dict(response.metadata or {})
            score = meta.get("score")
            if score is None:
                action = meta.get("action")
                if isinstance(action, str):
                    score = _ACTION_TO_SCORE.get(action.strip().upper())
            try:
                score_value = float(score) if score is not None else None
            except (TypeError, ValueError):  # pragma: no cover - defensive guard
                score_value = None
            if score_value is None:
                continue
            weight = meta.get("weight")
            try:
                weight_value = float(weight) if weight is not None else float(response.confidence)
            except (TypeError, ValueError):  # pragma: no cover - defensive guard
                weight_value = float(response.confidence)
            if weight_value <= 0.0:
                weight_value = max(float(response.confidence), 0.1)
            total_weight += weight_value
            weighted_sum += score_value * weight_value
        if total_weight == 0.0:
            return 0.0, 0.0
        return weighted_sum / total_weight, total_weight
