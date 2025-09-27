"""Persona-based Dynamic AI agent abstractions."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
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


__all__ = [
    "Agent",
    "AgentResult",
    "ExecutionAgent",
    "ExecutionAgentResult",
    "ResearchAgent",
    "ResearchAgentResult",
    "RiskAgent",
    "RiskAgentResult",
]
