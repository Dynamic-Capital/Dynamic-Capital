"""High level Dynamic AI engine orchestration layer."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .analysis import DynamicAnalysis
from .core import DynamicFusionAlgo, score_to_action
from .fusion import (
    FusionEngine,
    RegimeContext,
    SignalLobe,
    TrendMomentumLobe,
    SentimentLobe,
    TreasuryLobe,
)
from .risk import PositionSizing, RiskContext, RiskManager
from .hedge import (
    AccountState,
    DynamicHedgePolicy,
    ExposurePosition,
    HedgeDecision,
    HedgePosition,
    MarketState,
    NewsEvent,
    VolatilitySnapshot,
)


ActionScore = Mapping[str, float]


_DEFAULT_ACTION_SCORES: ActionScore = {
    "BUY": 1.0,
    "SELL": -1.0,
    "HOLD": 0.0,
    "NEUTRAL": 0.0,
}


@dataclass
class EngineConfig:
    """Configuration parameters for :class:`DynamicAIEngine`."""

    analysis_weight: float = 0.4
    fusion_weight: float = 0.6
    min_confidence: float = 0.25
    neutral_action: str = "HOLD"
    default_regime: RegimeContext = field(default_factory=RegimeContext)
    default_risk_context: RiskContext = field(default_factory=RiskContext)
    enable_position_sizing: bool = True


@dataclass
class EngineResult:
    """Structured output of a Dynamic AI evaluation run."""

    signal: Dict[str, Any]
    risk_adjusted_signal: Dict[str, Any]
    analysis: Optional[Dict[str, Any]]
    fusion: Optional[Dict[str, Any]]
    position_sizing: Optional[PositionSizing]
    hedging: Sequence[HedgeDecision]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the engine output into primitives."""

        payload: Dict[str, Any] = {
            "signal": self.signal,
            "risk_adjusted_signal": self.risk_adjusted_signal,
            "analysis": self.analysis,
            "fusion": self.fusion,
            "metadata": self.metadata,
            "hedging": [asdict(decision) for decision in self.hedging],
        }

        if self.position_sizing is not None:
            payload["position_sizing"] = asdict(self.position_sizing)

        return payload


class DynamicAIEngine:
    """Composite orchestrator combining analysis, fusion, risk, and hedging."""

    def __init__(
        self,
        *,
        fusion_algo: Optional[DynamicFusionAlgo] = None,
        analysis: Optional[DynamicAnalysis] = None,
        fusion_engine: Optional[FusionEngine] = None,
        lobes: Optional[Sequence[SignalLobe]] = None,
        risk_manager: Optional[RiskManager] = None,
        hedge_policy: Optional[DynamicHedgePolicy] = None,
        config: Optional[EngineConfig] = None,
    ) -> None:
        self.config = config or EngineConfig()
        self.analysis = analysis or DynamicAnalysis()
        self.fusion_algo = fusion_algo or DynamicFusionAlgo()
        self.risk_manager = risk_manager or RiskManager()
        self.hedge_policy = hedge_policy

        if fusion_engine is not None:
            self.fusion_engine = fusion_engine
        else:
            effective_lobes = list(lobes) if lobes is not None else self._default_lobes()
            self.fusion_engine = FusionEngine(effective_lobes)

    def evaluate(
        self,
        market_data: Mapping[str, Any],
        *,
        research_data: Optional[Mapping[str, Any]] = None,
        risk_context: Optional[RiskContext] = None,
        hedge_inputs: Optional[Mapping[str, Any]] = None,
        regime: Optional[RegimeContext] = None,
        dialogue_history: Optional[Sequence[tuple[str, str]]] = None,
    ) -> EngineResult:
        """Run the Dynamic AI engine on the supplied payloads."""

        analysis_result = self._run_analysis(research_data)
        fusion_view = self._run_fusion_engine(market_data, regime)

        augmented_market = dict(market_data)
        if analysis_result is not None:
            augmented_market.setdefault("analysis_score", analysis_result.get("score", 0.0))
            augmented_market.setdefault("analysis_confidence", analysis_result.get("confidence", 0.0))
            augmented_market.setdefault("analysis_action", analysis_result.get("action"))
        if fusion_view is not None:
            augmented_market.setdefault("fusion_score", fusion_view.get("score", 0.0))
            augmented_market.setdefault("fusion_action", fusion_view.get("action"))

        ai_signal = self.fusion_algo.generate_signal(augmented_market)
        base_signal = ai_signal.to_dict()

        blended_signal = self._blend_sources(
            base_signal=base_signal,
            analysis=analysis_result,
            fusion=fusion_view,
            dialogue_history=dialogue_history,
        )

        context = risk_context or self.config.default_risk_context
        risk_adjusted = self.risk_manager.enforce(dict(blended_signal), context)

        position_sizing: Optional[PositionSizing] = None
        if self.config.enable_position_sizing:
            volatility = float(augmented_market.get("volatility", 0.0))
            position_sizing = self.risk_manager.sizing(
                context,
                confidence=float(risk_adjusted.get("confidence", 0.0)),
                volatility=volatility,
            )

        hedge_decisions = self._run_hedging(hedge_inputs) if hedge_inputs else []

        metadata = {
            "analysis_weight": self.config.analysis_weight,
            "fusion_weight": self.config.fusion_weight,
            "sources": {
                "analysis": analysis_result,
                "fusion": fusion_view,
                "core": base_signal,
            },
        }

        return EngineResult(
            signal=base_signal,
            risk_adjusted_signal=risk_adjusted,
            analysis=analysis_result,
            fusion=fusion_view,
            position_sizing=position_sizing,
            hedging=tuple(hedge_decisions),
            metadata=metadata,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _run_analysis(
        self, research_data: Optional[Mapping[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        if not research_data:
            return None
        return self.analysis.analyse(research_data)

    def _run_fusion_engine(
        self,
        market_data: Mapping[str, Any],
        regime: Optional[RegimeContext],
    ) -> Optional[Dict[str, Any]]:
        if not market_data:
            return None
        applied_regime = regime or self.config.default_regime
        return self.fusion_engine.combine(market_data, applied_regime)

    def _blend_sources(
        self,
        *,
        base_signal: Dict[str, Any],
        analysis: Optional[Mapping[str, Any]],
        fusion: Optional[Mapping[str, Any]],
        dialogue_history: Optional[Sequence[tuple[str, str]]],
    ) -> Dict[str, Any]:
        weights: list[float] = []
        scores: list[float] = []
        confidences: list[float] = []

        if analysis is not None:
            weights.append(self.config.analysis_weight)
            scores.append(float(analysis.get("score", 0.0)))
            confidences.append(float(analysis.get("confidence", 0.0)))

        if fusion is not None:
            weights.append(self.config.fusion_weight)
            scores.append(float(fusion.get("score", 0.0)))
            confidences.append(float(fusion.get("confidence", 0.0)))

        blended = dict(base_signal)
        reasoning_parts: list[str] = [str(base_signal.get("reasoning", "")).strip()]

        if dialogue_history:
            last_user, last_assistant = dialogue_history[-1]
            reasoning_parts.append(
                f"Dialogue considered recent exchange. User: '{last_user}' Assistant: '{last_assistant}'."
            )

        if weights:
            weight_total = sum(weights) or 1.0
            score = sum(w * s for w, s in zip(weights, scores)) / weight_total
            confidence = sum(w * c for w, c in zip(weights, confidences)) / weight_total
            confidence = max(self.config.min_confidence, confidence)
            blended["score"] = round(score, 4)
            blended["confidence"] = round(confidence, 4)
            blended["action"] = score_to_action(score, neutral_action=self.config.neutral_action)
            reasoning_parts.append(
                "Blended analysis and fusion insights to reinforce the core signal."
            )
        else:
            action = blended.get("action", self.config.neutral_action)
            fallback_score = _DEFAULT_ACTION_SCORES.get(str(action), 0.0)
            blended.setdefault("score", fallback_score)
            blended.setdefault(
                "confidence", max(self.config.min_confidence, float(blended.get("confidence", 0.0)))
            )

        blended["reasoning"] = " ".join(part for part in reasoning_parts if part)
        return blended

    def _run_hedging(
        self, hedge_inputs: Mapping[str, Any]
    ) -> Sequence[HedgeDecision]:
        if self.hedge_policy is None:
            return ()

        market_state = self._coerce_market_state(hedge_inputs.get("market_state"))
        account_state = self._coerce_account_state(hedge_inputs.get("account_state"))

        if market_state is None or account_state is None:
            return ()

        return self.hedge_policy.evaluate(market_state, account_state)

    def _coerce_market_state(self, value: Any) -> Optional[MarketState]:
        if value is None:
            return None
        if isinstance(value, MarketState):
            return value
        if not isinstance(value, Mapping):
            return None

        volatility_data = value.get("volatility", {})
        volatility: Dict[str, VolatilitySnapshot] = {}
        if isinstance(volatility_data, Mapping):
            for symbol, snapshot in volatility_data.items():
                converted = self._coerce_volatility_snapshot(snapshot)
                if converted is not None:
                    volatility[str(symbol)] = converted

        correlations = value.get("correlations")
        correlations_map: Optional[Dict[str, Dict[str, float]]] = None
        if isinstance(correlations, Mapping):
            correlations_map = {
                str(k): {str(inner_k): float(inner_v) for inner_k, inner_v in inner.items()}
                for k, inner in correlations.items()
                if isinstance(inner, Mapping)
            }

        news_items: list[NewsEvent] = []
        news_data = value.get("news")
        if isinstance(news_data, Iterable):
            for item in news_data:
                event = self._coerce_news_event(item)
                if event is not None:
                    news_items.append(event)

        return MarketState(volatility=volatility, correlations=correlations_map, news=tuple(news_items))

    def _coerce_account_state(self, value: Any) -> Optional[AccountState]:
        if value is None:
            return None
        if isinstance(value, AccountState):
            return value
        if not isinstance(value, Mapping):
            return None

        exposures_data = value.get("exposures", [])
        exposures = tuple(
            exp
            for item in exposures_data
            if (exp := self._coerce_exposure_position(item)) is not None
        )

        hedges_data = value.get("hedges", [])
        hedges = tuple(
            hedge
            for item in hedges_data
            if (hedge := self._coerce_hedge_position(item)) is not None
        )

        mode = str(value.get("mode", "hedging"))
        drawdown_r = float(value.get("drawdown_r", 0.0))
        risk_capital = float(value.get("risk_capital", 0.0))
        max_basket_risk = float(value.get("max_basket_risk", 1.5))

        return AccountState(
            mode=mode,  # type: ignore[arg-type]
            exposures=exposures,
            hedges=hedges,
            drawdown_r=drawdown_r,
            risk_capital=risk_capital,
            max_basket_risk=max_basket_risk,
        )

    def _coerce_volatility_snapshot(self, value: Any) -> Optional[VolatilitySnapshot]:
        if value is None:
            return None
        if isinstance(value, VolatilitySnapshot):
            return value
        if isinstance(value, Mapping):
            try:
                return VolatilitySnapshot(
                    symbol=str(value.get("symbol")),
                    atr=float(value.get("atr", 0.0)),
                    close=float(value.get("close", 0.0)),
                    median_ratio=float(value.get("median_ratio", 0.0)),
                    pip_value=(
                        float(value.get("pip_value"))
                        if value.get("pip_value") is not None
                        else None
                    ),
                )
            except (TypeError, ValueError):
                return None
        return None

    def _coerce_news_event(self, value: Any) -> Optional[NewsEvent]:
        if value is None:
            return None
        if isinstance(value, NewsEvent):
            return value
        if isinstance(value, Mapping):
            symbol = value.get("symbol")
            minutes = value.get("minutes_until")
            severity = value.get("severity", "high")
            try:
                return NewsEvent(
                    symbol=None if symbol is None else str(symbol),
                    minutes_until=float(minutes),
                    severity=str(severity),  # type: ignore[arg-type]
                )
            except (TypeError, ValueError):
                return None
        return None

    def _coerce_exposure_position(self, value: Any) -> Optional[ExposurePosition]:
        if value is None:
            return None
        if isinstance(value, ExposurePosition):
            return value
        if isinstance(value, Mapping):
            try:
                return ExposurePosition(
                    symbol=str(value.get("symbol")),
                    side=str(value.get("side", "LONG")),  # type: ignore[arg-type]
                    quantity=float(value.get("quantity", 0.0)),
                    beta=float(value.get("beta", 1.0)),
                    price=(float(value.get("price")) if value.get("price") is not None else None),
                    pip_value=(
                        float(value.get("pip_value"))
                        if value.get("pip_value") is not None
                        else None
                    ),
                )
            except (TypeError, ValueError):
                return None
        return None

    def _coerce_hedge_position(self, value: Any) -> Optional[HedgePosition]:
        if value is None:
            return None
        if isinstance(value, HedgePosition):
            return value
        if isinstance(value, Mapping):
            try:
                return HedgePosition(
                    id=str(value.get("id")),
                    symbol=str(value.get("symbol")),
                    hedge_symbol=str(value.get("hedge_symbol")),
                    side=str(value.get("side", "LONG_HEDGE")),  # type: ignore[arg-type]
                    qty=float(value.get("qty", 0.0)),
                    reason=str(value.get("reason", "VOLATILITY")),  # type: ignore[arg-type]
                )
            except (TypeError, ValueError):
                return None
        return None

    def _default_lobes(self) -> Sequence[SignalLobe]:
        return (
            TrendMomentumLobe(),
            SentimentLobe(),
            TreasuryLobe(),
        )
