"""Persona-based Dynamic AI agent abstractions."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from statistics import fmean
from typing import Any, Dict, Iterable, Mapping, Protocol, Sequence

from .analysis import DynamicAnalysis
from .core import AISignal, DynamicFusionAlgo
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
from .risk import PositionSizing, RiskContext, RiskManager, RiskParameters


@dataclass(slots=True)
class AgentResult:
    """Base result payload returned by persona agents."""

    agent: str
    rationale: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent": self.agent,
            "rationale": self.rationale,
            "confidence": round(self.confidence, 4),
        }


class Agent(Protocol):
    """Contract implemented by all persona agents."""

    name: str

    def run(self, payload: Mapping[str, Any]) -> AgentResult:  # pragma: no cover - protocol
        """Execute the agent with the provided payload."""
        ...


@dataclass(slots=True)
class ResearchAgentResult(AgentResult):
    """Structured research insight emitted by the research persona."""

    analysis: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["analysis"] = self.analysis
        return payload


@dataclass(slots=True)
class ExecutionAgentResult(AgentResult):
    """Fused trading signal emitted by the execution persona."""

    signal: AISignal
    context: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["signal"] = self.signal.to_dict()
        if self.context:
            payload["context"] = dict(self.context)
        return payload


@dataclass(slots=True)
class RiskAgentResult(AgentResult):
    """Risk governance output including hedging directives."""

    adjusted_signal: Dict[str, Any]
    sizing: PositionSizing | None
    hedge_decisions: Sequence[HedgeDecision]
    escalations: Sequence[str] = ()

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["adjusted_signal"] = dict(self.adjusted_signal)
        if self.sizing is not None:
            payload["sizing"] = asdict(self.sizing)
        payload["hedge_decisions"] = [asdict(decision) for decision in self.hedge_decisions]
        if self.escalations:
            payload["escalations"] = list(self.escalations)
        return payload


@dataclass(slots=True)
class ChatTurn:
    """Single conversational turn emitted by the Dynamic Chat agent."""

    role: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = {"role": self.role, "content": self.content}
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class ChatAgentResult(AgentResult):
    """Conversational summary prepared for human-in-the-loop workflows."""

    messages: Sequence[ChatTurn]
    decision: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["messages"] = [message.to_dict() for message in self.messages]
        if self.decision:
            payload["decision"] = dict(self.decision)
        return payload


@dataclass(slots=True)
class ExecutiveAgentResult(AgentResult):
    """Executive-ready synthesis of the orchestration cycle."""

    highlights: Sequence[str]
    risk_flags: Sequence[str] = ()
    scorecard: Dict[str, float] = field(default_factory=dict)
    notes: Sequence[str] = ()

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["highlights"] = list(self.highlights)
        if self.risk_flags:
            payload["risk_flags"] = list(self.risk_flags)
        if self.scorecard:
            payload["scorecard"] = dict(self.scorecard)
        if self.notes:
            payload["notes"] = list(self.notes)
        return payload


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _optional_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_risk_context(payload: Mapping[str, Any] | None) -> RiskContext:
    if isinstance(payload, RiskContext):
        return payload
    mapping = dict(payload or {})
    return RiskContext(
        daily_drawdown=_coerce_float(mapping.get("daily_drawdown"), 0.0),
        treasury_utilisation=_coerce_float(mapping.get("treasury_utilisation"), 0.0),
        treasury_health=_coerce_float(mapping.get("treasury_health"), 1.0),
        volatility=_coerce_float(mapping.get("volatility"), 0.0),
    )


def _coerce_risk_parameters(payload: Mapping[str, Any] | None) -> RiskParameters:
    if isinstance(payload, RiskParameters):
        return payload
    mapping = dict(payload or {})
    return RiskParameters(
        max_daily_drawdown=_coerce_float(mapping.get("max_daily_drawdown"), 0.08),
        treasury_utilisation_cap=_coerce_float(mapping.get("treasury_utilisation_cap"), 0.6),
        circuit_breaker_drawdown=_coerce_float(mapping.get("circuit_breaker_drawdown"), 0.12),
    )


def _coerce_exposures(values: Iterable[Any] | None) -> Sequence[ExposurePosition]:
    exposures: list[ExposurePosition] = []
    if not values:
        return exposures
    for item in values:
        if isinstance(item, ExposurePosition):
            exposures.append(item)
            continue
        if isinstance(item, Mapping):
            symbol = str(item.get("symbol", "")).upper() or "UNKNOWN"
            side = str(item.get("side", "LONG")).upper()
            side_literal = "SHORT" if side.startswith("SHORT") else "LONG"
            exposures.append(
                ExposurePosition(
                    symbol=symbol,
                    side=side_literal,  # type: ignore[arg-type]
                    quantity=_coerce_float(item.get("quantity"), 0.0),
                    beta=_coerce_float(item.get("beta"), 1.0),
                    price=_optional_float(item.get("price")),
                    pip_value=_optional_float(item.get("pip_value")),
                )
            )
    return exposures


def _coerce_hedges(values: Iterable[Any] | None) -> Sequence[HedgePosition]:
    hedges: list[HedgePosition] = []
    if not values:
        return hedges
    for item in values:
        if isinstance(item, HedgePosition):
            hedges.append(item)
            continue
        if isinstance(item, Mapping):
            hedges.append(
                HedgePosition(
                    id=str(item.get("id", "")),
                    symbol=str(item.get("symbol", "")).upper(),
                    hedge_symbol=str(item.get("hedge_symbol", "")).upper(),
                    side="SHORT_HEDGE" if str(item.get("side", "SHORT_HEDGE")).upper().startswith("SHORT") else "LONG_HEDGE",
                    qty=_coerce_float(item.get("qty"), 0.0),
                    reason=str(item.get("reason", "ATR_SPIKE")),
                )
            )
    return hedges


def _coerce_news(values: Iterable[Any] | None) -> Sequence[NewsEvent]:
    news: list[NewsEvent] = []
    if not values:
        return news
    for item in values:
        if isinstance(item, NewsEvent):
            news.append(item)
            continue
        if isinstance(item, Mapping):
            news.append(
                NewsEvent(
                    symbol=(None if item.get("symbol") is None else str(item.get("symbol"))),
                    minutes_until=_coerce_float(item.get("minutes_until"), 0.0),
                    severity=str(item.get("severity", "high")).lower(),
                )
            )
    return news


def _coerce_volatility_map(payload: Mapping[str, Any] | None) -> Dict[str, VolatilitySnapshot]:
    snapshots: Dict[str, VolatilitySnapshot] = {}
    if not isinstance(payload, Mapping):
        return snapshots
    for key, value in payload.items():
        if isinstance(value, VolatilitySnapshot):
            snapshots[value.symbol] = value
            continue
        if isinstance(value, Mapping):
            symbol = str(value.get("symbol") or key).upper()
            snapshots[symbol] = VolatilitySnapshot(
                symbol=symbol,
                atr=_coerce_float(value.get("atr"), 0.0),
                close=_coerce_float(value.get("close"), 0.0),
                median_ratio=max(1e-6, _coerce_float(value.get("median_ratio"), 0.0)),
                pip_value=_optional_float(value.get("pip_value")),
            )
    return snapshots


def _coerce_correlations(payload: Mapping[str, Any] | None) -> Dict[str, Dict[str, float]] | None:
    if not isinstance(payload, Mapping):
        return None
    correlations: Dict[str, Dict[str, float]] = {}
    for symbol, row in payload.items():
        if not isinstance(row, Mapping):
            continue
        correlations[str(symbol).upper()] = {
            str(candidate).upper(): _coerce_float(value, 0.0)
            for candidate, value in row.items()
        }
    return correlations or None


def _coerce_account_state(payload: Mapping[str, Any] | None) -> AccountState:
    if isinstance(payload, AccountState):
        return payload
    mapping = dict(payload or {})
    mode = str(mapping.get("mode", "hedging")).lower()
    return AccountState(
        mode="netting" if mode == "netting" else "hedging",
        exposures=tuple(_coerce_exposures(mapping.get("exposures"))),
        hedges=tuple(_coerce_hedges(mapping.get("hedges"))),
        drawdown_r=_coerce_float(mapping.get("drawdown_r"), 0.0),
        risk_capital=_coerce_float(mapping.get("risk_capital"), 0.0),
        max_basket_risk=_coerce_float(mapping.get("max_basket_risk"), 1.5),
    )


def _coerce_market_state(payload: Mapping[str, Any] | None) -> MarketState:
    if isinstance(payload, MarketState):
        return payload
    mapping = dict(payload or {})
    volatility = _coerce_volatility_map(mapping.get("volatility"))
    return MarketState(
        volatility=volatility,
        correlations=_coerce_correlations(mapping.get("correlations")),
        news=tuple(_coerce_news(mapping.get("news"))),
    )


class ResearchAgent:
    """Persona encapsulating the Dynamic Analysis module."""

    name = "research"

    def __init__(self, analysis: DynamicAnalysis | None = None) -> None:
        self.analysis = analysis or DynamicAnalysis()

    def run(self, payload: Mapping[str, Any]) -> ResearchAgentResult:
        analysis_payload = dict(payload or {})
        analysis = self.analysis.analyse(analysis_payload)
        rationale_parts: list[str] = []
        if analysis.get("primary_driver"):
            rationale_parts.append(str(analysis["primary_driver"]))
        if analysis.get("notes"):
            notes = [str(note) for note in analysis.get("notes", []) if str(note)]
            if notes:
                rationale_parts.extend(notes)
        rationale = " ".join(rationale_parts) or "Research analysis completed."
        confidence = float(analysis.get("confidence", 0.0) or 0.0)
        return ResearchAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            analysis=analysis,
        )


class ExecutionAgent:
    """Persona wrapping the Dynamic Fusion Algo for execution decisions."""

    name = "execution"

    def __init__(self, fusion: DynamicFusionAlgo | None = None) -> None:
        self.fusion = fusion or DynamicFusionAlgo()

    def run(self, payload: Mapping[str, Any]) -> ExecutionAgentResult:
        context = dict(payload or {})
        market = context.get("market")
        if isinstance(market, Mapping):
            market_payload = dict(market)
        else:
            market_payload = context
        signal = self.fusion.generate_signal(dict(market_payload))
        extras: Dict[str, Any] = {}
        analysis = context.get("analysis")
        if isinstance(analysis, Mapping):
            primary_driver = analysis.get("primary_driver")
            if primary_driver:
                extras["analysis_primary_driver"] = primary_driver
        return ExecutionAgentResult(
            agent=self.name,
            rationale=signal.reasoning,
            confidence=signal.confidence,
            signal=signal,
            context=extras,
        )


class RiskAgent:
    """Persona enforcing guardrails and hedge policy."""

    name = "risk"

    def __init__(
        self,
        manager: RiskManager | None = None,
        hedge_policy: DynamicHedgePolicy | None = None,
    ) -> None:
        self.manager = manager or RiskManager()
        self.hedge_policy = hedge_policy or DynamicHedgePolicy()

    def run(self, payload: Mapping[str, Any]) -> RiskAgentResult:
        context = dict(payload or {})
        signal_payload = context.get("signal")
        if isinstance(signal_payload, AISignal):
            signal_dict = signal_payload.to_dict()
        elif isinstance(signal_payload, Mapping):
            signal_dict = dict(signal_payload)
        else:
            signal_dict = {"action": "NEUTRAL", "confidence": 0.0}

        risk_context = _coerce_risk_context(context.get("risk_context"))
        parameters = _coerce_risk_parameters(context.get("risk_parameters"))
        account_state = _coerce_account_state(context.get("account_state"))
        market_state = _coerce_market_state(context.get("market_state"))

        manager = self.manager
        manager.params = parameters
        adjusted_signal = manager.enforce(signal_dict, risk_context)
        confidence = float(adjusted_signal.get("confidence", signal_dict.get("confidence", 0.0)) or 0.0)

        sizing: PositionSizing | None = None
        try:
            sizing = manager.sizing(
                risk_context,
                confidence=confidence,
                volatility=risk_context.volatility,
            )
        except Exception:
            sizing = None

        hedge_decisions: Sequence[HedgeDecision] = ()
        if market_state.volatility:
            try:
                hedge_decisions = self.hedge_policy.evaluate(market_state, account_state)
            except Exception:
                hedge_decisions = ()

        notes = adjusted_signal.get("risk_notes")
        rationale_parts: list[str] = []
        if isinstance(notes, Iterable) and not isinstance(notes, (str, bytes)):
            rationale_parts.extend(str(note) for note in notes if str(note))
        if adjusted_signal.get("circuit_breaker"):
            rationale_parts.append("Circuit breaker engaged.")
        rationale = " ".join(rationale_parts) or "Risk evaluation completed."

        escalations: list[str] = []
        if risk_context.daily_drawdown <= -abs(parameters.circuit_breaker_drawdown):
            escalations.append("daily_drawdown")
        if risk_context.treasury_utilisation >= parameters.treasury_utilisation_cap:
            escalations.append("treasury_utilisation")

        return RiskAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            adjusted_signal=adjusted_signal,
            sizing=sizing,
            hedge_decisions=tuple(hedge_decisions),
            escalations=tuple(escalations),
        )


def _normalise_agent_payload(value: Any) -> Dict[str, Any]:
    if isinstance(value, AgentResult):
        return value.to_dict()
    if hasattr(value, "to_dict"):
        try:
            payload = value.to_dict()
        except Exception:
            payload = value
        else:
            if isinstance(payload, Mapping):
                return dict(payload)
            return {"value": payload}
    if isinstance(value, Mapping):
        return dict(value)
    return {}


def _extract_text(*candidates: Any) -> str | None:
    for value in candidates:
        if value is None:
            continue
        if isinstance(value, Mapping):
            text = value.get("content") or value.get("message") or value.get("text")
        else:
            text = value
        if text is None:
            continue
        rendered = str(text).strip()
        if rendered:
            return rendered
    return None


def _compose_persona_message(name: str, payload: Mapping[str, Any]) -> ChatTurn:
    confidence_value = _optional_float(payload.get("confidence"))
    metadata: Dict[str, Any] = {}
    if confidence_value is not None:
        metadata["confidence"] = round(confidence_value, 4)

    summary_parts: list[str] = []
    rationale = _extract_text(payload.get("rationale"))
    if rationale:
        summary_parts.append(rationale)

    if name == "research":
        analysis = payload.get("analysis")
        if isinstance(analysis, Mapping):
            action = analysis.get("action")
            if action:
                summary_parts.append(f"Proposed action: {action}")
            primary = analysis.get("primary_driver")
            if primary:
                metadata["primary_driver"] = primary
            notes = analysis.get("notes")
            if isinstance(notes, Iterable) and not isinstance(notes, (str, bytes)):
                joined = ", ".join(str(note) for note in notes if str(note))
                if joined:
                    metadata["notes"] = joined

    if name == "execution":
        signal = payload.get("signal")
        if isinstance(signal, Mapping):
            metadata["signal"] = dict(signal)
            action = signal.get("action")
            if action:
                summary_parts.append(f"Signal action: {action}")
            confidence_note = signal.get("confidence")
            if confidence_note is not None and "confidence" not in metadata:
                try:
                    metadata["confidence"] = round(float(confidence_note), 4)
                except (TypeError, ValueError):
                    pass

    if name == "risk":
        adjusted = payload.get("adjusted_signal")
        if isinstance(adjusted, Mapping):
            metadata["adjusted_signal"] = dict(adjusted)
            action = adjusted.get("action")
            if action:
                summary_parts.append(f"Risk-adjusted action: {action}")
        hedges = payload.get("hedge_decisions")
        if isinstance(hedges, Iterable) and not isinstance(hedges, (str, bytes)):
            hedge_list = [dict(decision) if isinstance(decision, Mapping) else decision for decision in hedges]
            if hedge_list:
                metadata["hedge_decisions"] = hedge_list
        escalations = payload.get("escalations")
        if escalations:
            metadata["escalations"] = list(escalations)

    content = " ".join(part for part in summary_parts if part) or f"{name.title()} review completed."
    return ChatTurn(role=name, content=content, metadata=metadata)


def _coerce_scorecard(payload: Mapping[str, Any] | None) -> Dict[str, float]:
    if not isinstance(payload, Mapping):
        return {}
    scorecard: Dict[str, float] = {}
    for key, value in payload.items():
        try:
            scorecard[str(key)] = float(value)
        except (TypeError, ValueError):
            continue
    return scorecard


class DynamicChatAgent:
    """Persona that shapes agent outputs into a human-friendly transcript."""

    name = "chat"

    def run(self, payload: Mapping[str, Any]) -> ChatAgentResult:
        context = dict(payload or {})

        agents_mapping = context.get("agents")
        if not isinstance(agents_mapping, Mapping):
            agents_mapping = {}

        research_payload = _normalise_agent_payload(
            context.get("research") or agents_mapping.get("research")
        )
        execution_payload = _normalise_agent_payload(
            context.get("execution") or agents_mapping.get("execution")
        )
        risk_payload = _normalise_agent_payload(
            context.get("risk") or agents_mapping.get("risk")
        )

        decision_payload = context.get("decision")
        if not isinstance(decision_payload, Mapping):
            decision_payload = {}
        else:
            decision_payload = dict(decision_payload)

        user_prompt = _extract_text(
            context.get("user"),
            context.get("user_message"),
            context.get("prompt"),
            context.get("query"),
            context.get("question"),
        )

        messages: list[ChatTurn] = []
        if user_prompt:
            messages.append(ChatTurn(role="user", content=user_prompt))

        if research_payload:
            messages.append(_compose_persona_message("research", research_payload))
        if execution_payload:
            messages.append(_compose_persona_message("execution", execution_payload))
        if risk_payload:
            messages.append(_compose_persona_message("risk", risk_payload))

        action_text = decision_payload.get("action")
        confidence_value = _optional_float(decision_payload.get("confidence"))

        if not action_text and risk_payload:
            adjusted = risk_payload.get("adjusted_signal", {})
            if isinstance(adjusted, Mapping):
                action_text = adjusted.get("action")
                if confidence_value is None:
                    confidence_value = _optional_float(adjusted.get("confidence"))

        if confidence_value is None and execution_payload:
            signal = execution_payload.get("signal", {})
            if isinstance(signal, Mapping):
                confidence_value = _optional_float(signal.get("confidence"))

        narrative_parts: list[str] = []
        if user_prompt:
            narrative_parts.append(f"User query: {user_prompt}")
        if research_payload:
            narrative_parts.append(
                f"Research: {research_payload.get('rationale') or 'analysis completed.'}"
            )
        if execution_payload:
            execution_action = None
            signal_payload = execution_payload.get("signal")
            if isinstance(signal_payload, Mapping):
                execution_action = signal_payload.get("action")
            narrative_parts.append(
                "Execution: "
                + (
                    execution_payload.get("rationale")
                    or (f"signal {execution_action}" if execution_action else "decision ready.")
                )
            )
        if risk_payload:
            narrative_parts.append(
                f"Risk: {risk_payload.get('rationale') or 'guardrails reviewed.'}"
            )
        if action_text:
            action_summary = f"Final decision: {action_text}"
            if confidence_value is not None:
                action_summary += f" (confidence {round(confidence_value, 4)})"
            narrative_parts.append(action_summary)

            decision_message = ChatTurn(
                role="assistant",
                content=action_summary,
                metadata={
                    "confidence": round(confidence_value, 4) if confidence_value is not None else None,
                },
            )
            if decision_message.metadata.get("confidence") is None:
                decision_message.metadata.pop("confidence", None)
            messages.append(decision_message)

        rationale = " ".join(part for part in narrative_parts if part) or "Dynamic chat summary generated."

        final_confidence = confidence_value if confidence_value is not None else 0.0

        return ChatAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=final_confidence,
            messages=tuple(messages),
            decision=decision_payload,
        )


class ExecutiveAgent:
    """Persona that distils the orchestration cycle for leadership review."""

    name = "executive"

    def run(self, payload: Mapping[str, Any]) -> ExecutiveAgentResult:
        context = dict(payload or {})

        agents_mapping = context.get("agents")
        if not isinstance(agents_mapping, Mapping):
            agents_mapping = {}

        research_payload = _normalise_agent_payload(
            context.get("research") or agents_mapping.get("research")
        )
        execution_payload = _normalise_agent_payload(
            context.get("execution") or agents_mapping.get("execution")
        )
        risk_payload = _normalise_agent_payload(
            context.get("risk") or agents_mapping.get("risk")
        )

        decision_payload = context.get("decision")
        if not isinstance(decision_payload, Mapping):
            decision_payload = {}
        else:
            decision_payload = dict(decision_payload)

        scorecard = _coerce_scorecard(context.get("scorecard"))
        if not scorecard:
            scorecard = _coerce_scorecard(context.get("metrics"))
        if not scorecard:
            scorecard = _coerce_scorecard(context.get("telemetry"))

        highlights: list[str] = []
        notes: list[str] = []
        risk_flags: list[str] = []
        confidence_values: list[float] = []

        def _record_confidence(value: Any) -> None:
            confidence = _optional_float(value)
            if confidence is not None:
                confidence_values.append(confidence)

        _record_confidence(context.get("confidence"))

        if research_payload:
            _record_confidence(research_payload.get("confidence"))
            analysis_payload = research_payload.get("analysis")
            if isinstance(analysis_payload, Mapping):
                action = analysis_payload.get("action")
                if action:
                    highlights.append(f"Research favours {action}")
                primary_driver = analysis_payload.get("primary_driver")
                if primary_driver:
                    notes.append(f"Primary driver: {primary_driver}")

        if execution_payload:
            _record_confidence(execution_payload.get("confidence"))
            signal_payload = execution_payload.get("signal")
            if isinstance(signal_payload, Mapping):
                _record_confidence(signal_payload.get("confidence"))
                action = signal_payload.get("action")
                if action:
                    highlights.append(f"Execution signal: {action}")
                if "execution_confidence" not in scorecard:
                    signal_confidence = _optional_float(signal_payload.get("confidence"))
                    if signal_confidence is not None:
                        scorecard["execution_confidence"] = signal_confidence

        if risk_payload:
            _record_confidence(risk_payload.get("confidence"))
            adjusted_payload = risk_payload.get("adjusted_signal")
            if isinstance(adjusted_payload, Mapping):
                action = adjusted_payload.get("action")
                if action:
                    highlights.append(f"Risk-adjusted action: {action}")
                adjusted_confidence = _optional_float(adjusted_payload.get("confidence"))
                if (
                    adjusted_confidence is not None
                    and "risk_confidence" not in scorecard
                ):
                    scorecard["risk_confidence"] = adjusted_confidence

            escalations = risk_payload.get("escalations")
            if isinstance(escalations, Iterable) and not isinstance(escalations, (str, bytes)):
                risk_flags.extend(str(flag) for flag in escalations if str(flag))

            hedges = risk_payload.get("hedge_decisions")
            if isinstance(hedges, Iterable) and not isinstance(hedges, (str, bytes)):
                hedge_list = [hedge for hedge in hedges if hedge]
                if hedge_list:
                    notes.append(f"Hedge directives: {len(hedge_list)} active")
                    if "hedge_count" not in scorecard:
                        scorecard["hedge_count"] = float(len(hedge_list))

        final_action = decision_payload.get("action")
        if final_action:
            highlights.append(f"Final decision: {final_action}")
            _record_confidence(decision_payload.get("confidence"))

        if not highlights:
            highlights.append("Operational cycle complete.")

        rationale = " ".join(highlights)

        confidence = fmean(confidence_values) if confidence_values else 0.0

        return ExecutiveAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            highlights=tuple(highlights),
            risk_flags=tuple(dict.fromkeys(risk_flags)),
            scorecard=scorecard,
            notes=tuple(dict.fromkeys(notes)),
        )


__all__ = [
    "Agent",
    "AgentResult",
    "ChatAgentResult",
    "ChatTurn",
    "DynamicChatAgent",
    "ExecutiveAgent",
    "ExecutiveAgentResult",
    "ExecutionAgent",
    "ExecutionAgentResult",
    "ResearchAgent",
    "ResearchAgentResult",
    "RiskAgent",
    "RiskAgentResult",
]
