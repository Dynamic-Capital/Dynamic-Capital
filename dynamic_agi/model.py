"""Dynamic AGI orchestrator combining analysis, execution, and risk layers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Mapping, Optional

from dynamic_ai import (
    AISignal,
    DynamicAnalysis,
    DynamicFusionAlgo,
    PositionSizing,
    RiskContext,
    RiskManager,
)
from dynamic_ai.core import PreparedMarketContext


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _context_snapshot(context: PreparedMarketContext) -> Dict[str, Any]:
    """Compress the prepared context into JSON-serialisable primitives."""

    return {
        "source_signal": context.source_signal,
        "resolved_signal": context.resolved_signal,
        "momentum": context.momentum,
        "trend": context.trend,
        "sentiment_value": context.sentiment_value,
        "composite_trimmed_mean": context.composite_trimmed_mean,
        "volatility": context.volatility,
        "news_topics": list(context.news_topics),
        "alignment": context.alignment,
        "data_quality": context.data_quality,
        "risk_score": context.risk_score,
        "drawdown": context.drawdown,
        "base_confidence": context.base_confidence,
        "support_level": context.support_level,
        "resistance_level": context.resistance_level,
        "human_bias": context.human_bias,
        "human_weight": context.human_weight,
        "circuit_breaker": context.circuit_breaker,
    }


def _normalise_risk_context(
    context: RiskContext | Mapping[str, Any] | None,
) -> RiskContext:
    if context is None:
        return RiskContext()
    if isinstance(context, RiskContext):
        return context
    return RiskContext(
        daily_drawdown=_coerce_float(context.get("daily_drawdown"), 0.0),
        treasury_utilisation=_coerce_float(context.get("treasury_utilisation"), 0.0),
        treasury_health=_coerce_float(context.get("treasury_health"), 1.0),
        volatility=_coerce_float(context.get("volatility"), 0.0),
    )


@dataclass(slots=True)
class AGIDiagnostics:
    """Structured diagnostic payload emitted by the AGI model."""

    context: Dict[str, Any]
    composite: Dict[str, Any]
    consensus: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "context": self.context,
            "composite": self.composite,
            "consensus": self.consensus,
        }


@dataclass(slots=True)
class AGIOutput:
    """Aggregated response combining signal, research, and risk views."""

    signal: AISignal
    research: Dict[str, Any]
    risk_adjusted: Dict[str, Any]
    sizing: Optional[PositionSizing]
    market_making: Dict[str, float]
    diagnostics: AGIDiagnostics

    def to_dict(self) -> Dict[str, Any]:
        payload = {
            "signal": self.signal.to_dict(),
            "research": self.research,
            "risk_adjusted": self.risk_adjusted,
            "market_making": dict(self.market_making),
            "diagnostics": self.diagnostics.to_dict(),
        }
        if self.sizing is not None:
            payload["sizing"] = asdict(self.sizing)
        return payload


class DynamicAGIModel:
    """High level coordinator upgrading the Dynamic AI stack to AGI workflows."""

    def __init__(
        self,
        *,
        fusion: Optional[DynamicFusionAlgo] = None,
        analysis: Optional[DynamicAnalysis] = None,
        risk_manager: Optional[RiskManager] = None,
    ) -> None:
        self.fusion = fusion or DynamicFusionAlgo()
        self.analysis = analysis or DynamicAnalysis()
        self.risk_manager = risk_manager or RiskManager()

    def evaluate(
        self,
        *,
        market_data: Mapping[str, Any],
        research: Optional[Mapping[str, Any]] = None,
        risk_context: RiskContext | Mapping[str, Any] | None = None,
        treasury: Optional[Mapping[str, Any]] = None,
        inventory: float = 0.0,
    ) -> AGIOutput:
        """Run the end-to-end AGI workflow for the supplied payloads."""

        market_payload = dict(market_data)
        context = self.fusion.prepare_context(market_payload)
        composite = self.fusion.composite_diagnostics(context)
        consensus = self.fusion.consensus_matrix(context)

        signal = self.fusion.generate_signal(market_payload, context=context)
        research_payload = self.analysis.analyse(dict(research or {}))

        risk_ctx = _normalise_risk_context(risk_context)
        risk_adjusted = self.risk_manager.enforce(signal.to_dict(), risk_ctx)
        confidence = _coerce_float(risk_adjusted.get("confidence"), signal.confidence)
        sizing = self.risk_manager.sizing(
            risk_ctx,
            confidence=confidence,
            volatility=context.volatility,
        )

        treasury_payload = dict(treasury or {})
        market_making = self.fusion.mm_parameters(
            market_payload,
            treasury_payload,
            inventory,
        )

        diagnostics = AGIDiagnostics(
            context=_context_snapshot(context),
            composite=composite,
            consensus=consensus,
        )

        return AGIOutput(
            signal=signal,
            research=research_payload,
            risk_adjusted=risk_adjusted,
            sizing=sizing,
            market_making=market_making,
            diagnostics=diagnostics,
        )
