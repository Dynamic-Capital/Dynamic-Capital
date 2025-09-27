"""High level Dynamic AI engine orchestration layer."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .analysis import DynamicAnalysis
from .agents import (
    DynamicChatAgent,
    ExecutionAgent,
    ExecutionAgentResult,
    ResearchAgent,
    ResearchAgentResult,
    RiskAgent,
    RiskAgentResult,
    ChatAgentResult,
)
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

from dynamic_algo import DecisionContext, DecisionOption, DecisionSignal, DynamicDecisionAlgo


ActionScore = Mapping[str, float]


_DEFAULT_ACTION_SCORES: ActionScore = {
    "BUY": 1.0,
    "SELL": -1.0,
    "HOLD": 0.0,
    "NEUTRAL": 0.0,
}


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _first_text(*candidates: Any) -> Optional[str]:
    for candidate in candidates:
        if candidate is None:
            continue
        if isinstance(candidate, str):
            text = candidate.strip()
            if text:
                return text
        if isinstance(candidate, Iterable) and not isinstance(candidate, (str, bytes)):
            for item in candidate:
                if isinstance(item, str):
                    text = item.strip()
                    if text:
                        return text
    return None


def _normalise_action(value: Any, *, default: str = "NEUTRAL") -> str:
    token = str(value or "").strip().upper()
    return token or default.upper()


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
    enable_decision_optimiser: bool = True
    decision_actions: tuple[str, ...] = ("BUY", "SELL", "HOLD")


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
    agents: Optional["AgentCycleSnapshot"] = None
    optimisation: Optional[Dict[str, Any]] = None

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
        if self.agents is not None:
            payload["agents"] = self.agents.to_dict()
        if self.optimisation is not None:
            payload["optimisation"] = dict(self.optimisation)

        return payload


@dataclass
class AgentCycleSnapshot:
    """Lightweight mirror of the Dynamic Agents orchestration cycle."""

    research: Optional[ResearchAgentResult] = None
    execution: Optional[ExecutionAgentResult] = None
    risk: Optional[RiskAgentResult] = None
    chat: Optional[ChatAgentResult] = None
    decision: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"decision": dict(self.decision)}
        if self.research is not None:
            payload["research"] = self.research.to_dict()
        if self.execution is not None:
            payload["execution"] = self.execution.to_dict()
        if self.risk is not None:
            payload["risk"] = self.risk.to_dict()
        if self.chat is not None:
            payload["chat"] = self.chat.to_dict()
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
        research_agent: Optional[ResearchAgent] = None,
        execution_agent: Optional[ExecutionAgent] = None,
        risk_agent: Optional[RiskAgent] = None,
        chat_agent: Optional[DynamicChatAgent] = None,
        decision_algo: Optional[DynamicDecisionAlgo] = None,
        config: Optional[EngineConfig] = None,
    ) -> None:
        self.config = config or EngineConfig()
        self.analysis = analysis or DynamicAnalysis()
        self.fusion_algo = fusion_algo or DynamicFusionAlgo()
        self.risk_manager = risk_manager or RiskManager()
        self.hedge_policy = hedge_policy or DynamicHedgePolicy()
        self.decision_algo = decision_algo

        if fusion_engine is not None:
            self.fusion_engine = fusion_engine
        else:
            effective_lobes = list(lobes) if lobes is not None else self._default_lobes()
            self.fusion_engine = FusionEngine(effective_lobes)

        self.research_agent = research_agent or ResearchAgent(self.analysis)
        self.execution_agent = execution_agent or ExecutionAgent(self.fusion_algo)
        self.risk_agent = risk_agent or RiskAgent(self.risk_manager, self.hedge_policy)
        self.chat_agent = chat_agent or DynamicChatAgent()

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

        research_result = self._run_research(research_data)
        analysis_result = (
            research_result.analysis if research_result is not None else self._run_analysis(research_data)
        )
        fusion_view = self._run_fusion_engine(market_data, regime)
        execution_result = self._run_execution(market_data, analysis_result)

        augmented_market = dict(market_data)
        if analysis_result is not None:
            augmented_market.setdefault("analysis_score", analysis_result.get("score", 0.0))
            augmented_market.setdefault("analysis_confidence", analysis_result.get("confidence", 0.0))
            augmented_market.setdefault("analysis_action", analysis_result.get("action"))
        if fusion_view is not None:
            augmented_market.setdefault("fusion_score", fusion_view.get("score", 0.0))
            augmented_market.setdefault("fusion_action", fusion_view.get("action"))

        if execution_result is not None:
            base_signal = execution_result.signal.to_dict()
        else:
            ai_signal = self.fusion_algo.generate_signal(augmented_market)
            base_signal = ai_signal.to_dict()

        blended_signal = self._blend_sources(
            base_signal=base_signal,
            analysis=analysis_result,
            fusion=fusion_view,
            dialogue_history=dialogue_history,
        )

        context = risk_context or self.config.default_risk_context
        risk_payload = self._prepare_risk_payload(
            blended_signal,
            context,
            hedge_inputs,
        )
        risk_result = self._run_risk(risk_payload)

        if risk_result is not None:
            risk_adjusted = dict(risk_result.adjusted_signal)
            position_sizing = risk_result.sizing if self.config.enable_position_sizing else None
            hedge_decisions: Sequence[HedgeDecision] = tuple(risk_result.hedge_decisions)
            risk_rationale = risk_result.rationale
        else:
            risk_adjusted = self.risk_manager.enforce(dict(blended_signal), context)
            position_sizing = None
            if self.config.enable_position_sizing:
                volatility = float(augmented_market.get("volatility", 0.0))
                position_sizing = self.risk_manager.sizing(
                    context,
                    confidence=float(risk_adjusted.get("confidence", 0.0)),
                    volatility=volatility,
                )
            hedge_decisions = self._run_hedging(hedge_inputs) if hedge_inputs else ()
            risk_rationale = "Risk evaluation completed."

        optimisation = self._optimise_with_dynamic_algo(
            base_signal=base_signal,
            analysis=analysis_result,
            fusion=fusion_view,
            risk_adjusted=risk_adjusted,
            risk_result=risk_result,
            position_sizing=position_sizing,
            hedge_decisions=hedge_decisions,
            risk_context=context,
            market_snapshot=augmented_market,
        )

        decision_payload = self._build_decision_payload(
            risk_adjusted,
            position_sizing,
            hedge_decisions,
            risk_rationale,
            optimisation,
        )

        agents_snapshot = self._build_agents_snapshot(
            research_result,
            execution_result,
            risk_result,
            decision_payload,
            dialogue_history,
        )
        chat_result = agents_snapshot.chat

        metadata = {
            "analysis_weight": self.config.analysis_weight,
            "fusion_weight": self.config.fusion_weight,
            "sources": {
                "analysis": analysis_result,
                "fusion": fusion_view,
                "core": base_signal,
            },
        }
        if chat_result is not None:
            metadata["chat_summary"] = chat_result.rationale
        if optimisation is not None:
            metadata["optimisation"] = optimisation

        return EngineResult(
            signal=base_signal,
            risk_adjusted_signal=risk_adjusted,
            analysis=analysis_result,
            fusion=fusion_view,
            position_sizing=position_sizing,
            hedging=tuple(hedge_decisions),
            metadata=metadata,
            agents=agents_snapshot,
            optimisation=optimisation,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _run_research(
        self, research_data: Optional[Mapping[str, Any]]
    ) -> Optional[ResearchAgentResult]:
        if not research_data:
            return None
        return self.research_agent.run(dict(research_data))

    def _run_analysis(
        self, research_data: Optional[Mapping[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        if not research_data:
            return None
        return self.analysis.analyse(research_data)

    def _run_execution(
        self,
        market_data: Mapping[str, Any],
        analysis: Optional[Mapping[str, Any]],
    ) -> Optional[ExecutionAgentResult]:
        if not market_data:
            return None
        payload: Dict[str, Any] = {"market": dict(market_data)}
        if analysis:
            payload["analysis"] = dict(analysis)
        return self.execution_agent.run(payload)

    def _prepare_risk_payload(
        self,
        blended_signal: Mapping[str, Any],
        context: RiskContext,
        hedge_inputs: Optional[Mapping[str, Any]],
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "signal": dict(blended_signal),
            "risk_context": context,
            "risk_parameters": self.risk_manager.params,
        }
        if hedge_inputs and isinstance(hedge_inputs, Mapping):
            account_state = hedge_inputs.get("account_state")
            market_state = hedge_inputs.get("market_state")
            if account_state is not None:
                payload["account_state"] = account_state
            if market_state is not None:
                payload["market_state"] = market_state
        return payload

    def _run_risk(
        self, payload: Mapping[str, Any]
    ) -> Optional[RiskAgentResult]:
        if not payload:
            return None
        try:
            return self.risk_agent.run(payload)
        except Exception:
            return None

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

    def _build_decision_payload(
        self,
        risk_adjusted: Mapping[str, Any],
        position_sizing: Optional[PositionSizing],
        hedge_decisions: Sequence[HedgeDecision],
        risk_rationale: str,
        optimisation: Optional[Mapping[str, Any]],
    ) -> Dict[str, Any]:
        decision = {
            "action": risk_adjusted.get("action"),
            "confidence": risk_adjusted.get("confidence"),
            "rationale": risk_rationale,
            "signal": dict(risk_adjusted),
        }
        if position_sizing is not None:
            decision["sizing"] = asdict(position_sizing)
        if hedge_decisions:
            decision["hedge_decisions"] = [asdict(decision) for decision in hedge_decisions]
        if optimisation is not None:
            decision["optimisation"] = dict(optimisation)
        return decision

    def _build_agents_snapshot(
        self,
        research: Optional[ResearchAgentResult],
        execution: Optional[ExecutionAgentResult],
        risk: Optional[RiskAgentResult],
        decision: Mapping[str, Any],
        dialogue_history: Optional[Sequence[tuple[str, str]]],
    ) -> AgentCycleSnapshot:
        agents_payload: Dict[str, Any] = {}
        if research is not None:
            agents_payload["research"] = research.to_dict()
        if execution is not None:
            agents_payload["execution"] = execution.to_dict()
        if risk is not None:
            agents_payload["risk"] = risk.to_dict()

        chat_candidate: Optional[ChatAgentResult] = None
        if agents_payload:
            chat_payload: Dict[str, Any] = {
                "agents": agents_payload,
                "decision": dict(decision),
            }
            if dialogue_history:
                last_user = None
                for user, _assistant in reversed(dialogue_history):
                    if user:
                        last_user = user
                        break
                if last_user:
                    chat_payload["user_message"] = last_user
            try:
                chat_candidate = self.chat_agent.run(chat_payload)
            except Exception:
                chat_candidate = None

        return AgentCycleSnapshot(
            research=research,
            execution=execution,
            risk=risk,
            chat=chat_candidate,
            decision=dict(decision),
        )

    def _optimise_with_dynamic_algo(
        self,
        *,
        base_signal: Mapping[str, Any],
        analysis: Optional[Mapping[str, Any]],
        fusion: Optional[Mapping[str, Any]],
        risk_adjusted: Mapping[str, Any],
        risk_result: Optional[RiskAgentResult],
        position_sizing: Optional[PositionSizing],
        hedge_decisions: Sequence[HedgeDecision],
        risk_context: RiskContext,
        market_snapshot: Mapping[str, Any],
    ) -> Optional[Dict[str, Any]]:
        if not self.config.enable_decision_optimiser:
            return None

        actions = [
            _normalise_action(action, default=self.config.neutral_action)
            for action in (*self.config.decision_actions, risk_adjusted.get("action"))
        ]
        deduped_actions: list[str] = []
        for action in actions:
            if action and action not in deduped_actions:
                deduped_actions.append(action)
        if not deduped_actions:
            return None

        algo = self.decision_algo or DynamicDecisionAlgo()
        try:
            algo.clear_signals()
        except AttributeError:
            algo = DynamicDecisionAlgo()

        signals = self._build_decision_signals(
            base_signal=base_signal,
            analysis=analysis,
            fusion=fusion,
            risk_adjusted=risk_adjusted,
            risk_result=risk_result,
            hedge_decisions=hedge_decisions,
            position_sizing=position_sizing,
            risk_context=risk_context,
            market_snapshot=market_snapshot,
        )
        if not signals:
            return None

        algo.extend_signals(signals)

        options = self._build_decision_options(
            actions=tuple(deduped_actions),
            risk_adjusted=risk_adjusted,
            base_signal=base_signal,
            hedge_decisions=hedge_decisions,
            position_sizing=position_sizing,
            risk_context=risk_context,
        )
        if not options:
            return None

        context = self._build_decision_context(
            risk_adjusted=risk_adjusted,
            base_signal=base_signal,
            analysis=analysis,
            fusion=fusion,
            risk_result=risk_result,
            risk_context=risk_context,
            market_snapshot=market_snapshot,
        )

        recommendations = algo.evaluate_options(options, context=context)
        if not recommendations:
            return None

        summary = algo.summarise_signals()
        best = recommendations[0]

        return {
            "summary": summary.as_dict(),
            "recommendations": [rec.as_dict() for rec in recommendations],
            "best_option": best.option_id,
            "best_priority": best.priority,
            "context": asdict(context),
            "signals": [self._serialise_decision_signal(signal) for signal in signals],
            "actions": [option.option_id for option in options],
        }

    def _build_decision_signals(
        self,
        *,
        base_signal: Mapping[str, Any],
        analysis: Optional[Mapping[str, Any]],
        fusion: Optional[Mapping[str, Any]],
        risk_adjusted: Mapping[str, Any],
        risk_result: Optional[RiskAgentResult],
        hedge_decisions: Sequence[HedgeDecision],
        position_sizing: Optional[PositionSizing],
        risk_context: RiskContext,
        market_snapshot: Mapping[str, Any],
    ) -> tuple[DecisionSignal, ...]:
        signals: list[DecisionSignal] = []

        recommended_action = _normalise_action(
            risk_adjusted.get("action"), default=self.config.neutral_action
        )
        base_score = _safe_float(risk_adjusted.get("score"), _safe_float(base_signal.get("score"), 0.0))
        base_confidence = _clamp01(
            _safe_float(risk_adjusted.get("confidence"), _safe_float(base_signal.get("confidence"), 0.5))
        )
        reasoning_note = _first_text(risk_adjusted.get("reasoning"), base_signal.get("reasoning"))

        signals.append(
            DecisionSignal(
                theme="core_signal",
                confidence=base_confidence,
                urgency=_clamp01(abs(base_score)),
                strategic_fit=1.0,
                risk=_clamp01(max(0.0, 1.0 - base_confidence)),
                weight=1.2,
                note=reasoning_note,
                metadata={
                    "action": recommended_action,
                    "score": base_score,
                    "confidence": base_confidence,
                },
            )
        )

        if analysis:
            analysis_action = _normalise_action(analysis.get("action"), default=recommended_action)
            analysis_score = _safe_float(analysis.get("score"), 0.0)
            analysis_confidence = _clamp01(_safe_float(analysis.get("confidence"), base_confidence))
            signals.append(
                DecisionSignal(
                    theme="analysis",
                    confidence=analysis_confidence,
                    urgency=_clamp01(abs(analysis_score)),
                    strategic_fit=_clamp01(0.9 if analysis_action == recommended_action else 0.65),
                    risk=_clamp01(max(0.0, 1.0 - analysis_confidence)),
                    weight=0.9,
                    note=_first_text(analysis.get("primary_driver"), analysis.get("notes")),
                    metadata={
                        "action": analysis_action,
                        "score": analysis_score,
                    },
                )
            )

        if fusion:
            fusion_action = _normalise_action(fusion.get("action"), default=recommended_action)
            fusion_score = _safe_float(fusion.get("score"), 0.0)
            fusion_confidence = _clamp01(_safe_float(fusion.get("confidence"), base_confidence))
            signals.append(
                DecisionSignal(
                    theme="fusion",
                    confidence=fusion_confidence,
                    urgency=_clamp01(abs(fusion_score)),
                    strategic_fit=_clamp01(0.9 if fusion_action == recommended_action else 0.6),
                    risk=_clamp01(max(0.0, 1.0 - fusion_confidence * 0.9)),
                    weight=0.85,
                    note=_first_text(fusion.get("reasoning"), fusion.get("notes")),
                    metadata={
                        "action": fusion_action,
                        "score": fusion_score,
                    },
                )
            )

        if risk_result is not None:
            risk_confidence = _clamp01(_safe_float(risk_result.confidence, base_confidence))
            drawdown = abs(_safe_float(risk_context.daily_drawdown, 0.0))
            volatility = _clamp01(_safe_float(risk_context.volatility, 0.0))
            escalations = tuple(risk_result.escalations)
            signals.append(
                DecisionSignal(
                    theme="risk",
                    confidence=risk_confidence,
                    urgency=_clamp01(0.4 + min(0.4, drawdown * 2.0) + volatility * 0.2),
                    strategic_fit=_clamp01(0.85 if recommended_action == risk_adjusted.get("action", recommended_action) else 0.65),
                    risk=_clamp01(0.2 + volatility * 0.4 + (0.2 if escalations else 0.0)),
                    weight=1.1,
                    note=risk_result.rationale or None,
                    metadata={
                        "escalations": list(escalations),
                        "hedges": len(risk_result.hedge_decisions),
                    },
                )
            )

        if hedge_decisions:
            volatility = _clamp01(_safe_float(risk_context.volatility, _safe_float(market_snapshot.get("volatility"), 0.0)))
            signals.append(
                DecisionSignal(
                    theme="hedging",
                    confidence=_clamp01(0.45 + min(0.35, 0.1 * len(hedge_decisions))),
                    urgency=_clamp01(0.35 + volatility * 0.5),
                    strategic_fit=_clamp01(0.6 + min(0.2, risk_context.treasury_health * 0.2)),
                    risk=_clamp01(0.3 + volatility * 0.3),
                    weight=0.6,
                    note="Hedging adjustments recommended to balance exposure.",
                    metadata={
                        "hedges": [asdict(hedge) for hedge in hedge_decisions],
                    },
                )
            )

        if position_sizing is not None:
            leverage = _clamp01(_safe_float(position_sizing.leverage, 1.0) / 5.0)
            notional = _clamp01(_safe_float(position_sizing.notional, 0.0))
            signals.append(
                DecisionSignal(
                    theme="sizing",
                    confidence=_clamp01(0.4 + leverage * 0.5),
                    urgency=_clamp01(0.3 + notional * 0.4),
                    strategic_fit=_clamp01(0.6 + leverage * 0.3),
                    risk=_clamp01(0.2 + max(0.0, 0.4 - leverage * 0.3)),
                    weight=0.55,
                    note=position_sizing.notes,
                    metadata={
                        "notional": position_sizing.notional,
                        "leverage": position_sizing.leverage,
                    },
                )
            )

        return tuple(signals)

    def _build_decision_options(
        self,
        *,
        actions: Sequence[str],
        risk_adjusted: Mapping[str, Any],
        base_signal: Mapping[str, Any],
        hedge_decisions: Sequence[HedgeDecision],
        position_sizing: Optional[PositionSizing],
        risk_context: RiskContext,
    ) -> tuple[DecisionOption, ...]:
        options: list[DecisionOption] = []
        score_value = _safe_float(risk_adjusted.get("score"), _safe_float(base_signal.get("score"), 0.0))
        confidence = _clamp01(_safe_float(risk_adjusted.get("confidence"), _safe_float(base_signal.get("confidence"), 0.5)))
        volatility = _clamp01(_safe_float(risk_context.volatility, 0.0))
        recommended_action = _normalise_action(risk_adjusted.get("action"), default=self.config.neutral_action)
        hedge_factor = min(0.3, 0.1 * len(hedge_decisions))
        leverage = 0.0
        if position_sizing is not None:
            leverage = _clamp01(_safe_float(position_sizing.leverage, 1.0) / 5.0)

        for action in actions:
            action_token = _normalise_action(action, default=self.config.neutral_action)
            if not action_token:
                continue
            is_recommended = action_token == recommended_action
            directional_strength = self._option_directional_strength(action_token, score_value)
            expected_impact = _clamp01(0.35 + directional_strength * (0.45 if is_recommended else 0.3) + leverage * 0.2)
            if action_token in {"HOLD", "NEUTRAL"}:
                expected_impact = _clamp01(0.3 + (1.0 - abs(score_value)) * 0.3)
            execution_complexity = _clamp01(
                (0.55 if action_token in {"BUY", "SELL"} else 0.35) + hedge_factor + volatility * 0.2
            )
            risk_penalty = _clamp01((1.0 - confidence) + volatility * 0.4 + (0.15 if not is_recommended else 0.0))
            if action_token in {"HOLD", "NEUTRAL"}:
                risk_penalty = _clamp01(risk_penalty * 0.6)
            cost_of_delay = _clamp01(
                directional_strength * (0.7 if is_recommended else 0.4) + (0.1 if action_token == "BUY" else 0.05)
            )
            reversibility = 0.85 if action_token == "HOLD" else (0.7 if action_token == "NEUTRAL" else 0.45)
            dependencies: list[str] = []
            if hedge_decisions:
                dependencies.append("hedging")
            if risk_context.treasury_utilisation >= 0.5:
                dependencies.append("treasury")
            description = self._describe_decision_option(action_token, base_signal)

            options.append(
                DecisionOption(
                    option_id=action_token,
                    description=description,
                    expected_impact=expected_impact,
                    execution_complexity=execution_complexity,
                    risk=risk_penalty,
                    cost_of_delay=cost_of_delay,
                    reversibility=_clamp01(reversibility),
                    dependencies=tuple(dependencies),
                    metadata={"recommended": is_recommended},
                )
            )

        return tuple(options)

    def _build_decision_context(
        self,
        *,
        risk_adjusted: Mapping[str, Any],
        base_signal: Mapping[str, Any],
        analysis: Optional[Mapping[str, Any]],
        fusion: Optional[Mapping[str, Any]],
        risk_result: Optional[RiskAgentResult],
        risk_context: RiskContext,
        market_snapshot: Mapping[str, Any],
    ) -> DecisionContext:
        recommended_action = _normalise_action(
            risk_adjusted.get("action"), default=self.config.neutral_action
        )
        confidence = _clamp01(
            _safe_float(risk_adjusted.get("confidence"), _safe_float(base_signal.get("confidence"), 0.5))
        )
        confidences: list[float] = [confidence]
        if analysis:
            confidences.append(_clamp01(_safe_float(analysis.get("confidence"), confidence)))
        if fusion:
            confidences.append(_clamp01(_safe_float(fusion.get("confidence"), confidence)))
        if risk_result is not None:
            confidences.append(_clamp01(_safe_float(risk_result.confidence, confidence)))
        data_confidence = sum(confidences) / len(confidences)

        treasury_health = _clamp01(_safe_float(risk_context.treasury_health, 1.0))
        utilisation = _clamp01(_safe_float(risk_context.treasury_utilisation, 0.0))
        drawdown = _safe_float(risk_context.daily_drawdown, 0.0)
        volatility = _clamp01(_safe_float(risk_context.volatility, _safe_float(market_snapshot.get("volatility"), 0.0)))

        risk_tolerance = _clamp01(0.6 + treasury_health * 0.3 - max(0.0, -drawdown) * 0.6)
        capacity = _clamp01(1.0 - utilisation)
        principle_alignment = confidence
        time_pressure = _clamp01(abs(_safe_float(base_signal.get("score"), 0.0)))

        guardrails_source = risk_adjusted.get("risk_notes")
        guardrails: list[str] = []
        if isinstance(guardrails_source, Iterable) and not isinstance(guardrails_source, (str, bytes)):
            guardrails = [str(note).strip() for note in guardrails_source if str(note).strip()]
        if risk_result is not None and risk_result.escalations:
            guardrails.extend(f"escalation:{item}" for item in risk_result.escalations)

        focus_areas = ["core_signal"]
        if analysis:
            focus_areas.append("analysis")
        if fusion:
            focus_areas.append("fusion")
        if risk_result is not None:
            focus_areas.append("risk")
        if volatility > 0.2:
            focus_areas.append("volatility")

        return DecisionContext(
            objective=f"Execute {recommended_action} posture",
            risk_tolerance=risk_tolerance,
            capacity=capacity,
            principle_alignment=principle_alignment,
            time_pressure=time_pressure,
            data_confidence=_clamp01(data_confidence),
            guardrails=tuple(dict.fromkeys(guardrails)),
            focus_areas=tuple(dict.fromkeys(focus_areas)),
        )

    def _serialise_decision_signal(self, signal: DecisionSignal) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "theme": signal.theme,
            "confidence": round(signal.confidence, 4),
            "urgency": round(signal.urgency, 4),
            "strategic_fit": round(signal.strategic_fit, 4),
            "risk": round(signal.risk, 4),
            "weight": round(signal.weight, 4),
            "timestamp": signal.timestamp.isoformat(),
        }
        if signal.note:
            payload["note"] = signal.note
        if signal.metadata:
            payload["metadata"] = dict(signal.metadata)
        return payload

    @staticmethod
    def _describe_decision_option(action: str, base_signal: Mapping[str, Any]) -> str:
        reasoning = _first_text(base_signal.get("reasoning"), base_signal.get("notes"))
        if reasoning:
            snippet = reasoning.split(".")[0].strip()
            if snippet:
                return f"{action} - {snippet[:120]}"
        return f"{action} position aligned with blended signal"

    @staticmethod
    def _option_directional_strength(action: str, score: float) -> float:
        if action == "BUY":
            return _clamp01(max(0.0, score))
        if action == "SELL":
            return _clamp01(max(0.0, -score))
        return _clamp01(max(0.0, 1.0 - abs(score)))
