"""Dynamic AI package exposing fusion signal generation utilities."""

from .agents import (
    Agent,
    AgentResult,
    ExecutionAgent,
    ExecutionAgentResult,
    ResearchAgent,
    ResearchAgentResult,
    RiskAgent,
    RiskAgentResult,
)
from .core import AISignal, DynamicFusionAlgo
from .analysis import AnalysisComponent, DynamicAnalysis
from .fusion import (
    FusionEngine,
    LobeSignal,
    LorentzianDistanceLobe,
    RegimeContext,
    SentimentLobe,
    SignalLobe,
    TrendMomentumLobe,
    TreasuryLobe,
)
from .training import calibrate_lorentzian_lobe, load_lorentzian_model
from .risk import PositionSizing, RiskContext, RiskManager, RiskParameters
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

__all__ = [
    "Agent",
    "AgentResult",
    "AISignal",
    "DynamicFusionAlgo",
    "ExecutionAgent",
    "ExecutionAgentResult",
    "AnalysisComponent",
    "DynamicAnalysis",
    "ResearchAgent",
    "ResearchAgentResult",
    "FusionEngine",
    "LobeSignal",
    "LorentzianDistanceLobe",
    "RegimeContext",
    "SentimentLobe",
    "SignalLobe",
    "TrendMomentumLobe",
    "TreasuryLobe",
    "calibrate_lorentzian_lobe",
    "load_lorentzian_model",
    "PositionSizing",
    "RiskContext",
    "RiskManager",
    "RiskParameters",
    "RiskAgent",
    "RiskAgentResult",
    "AccountState",
    "DynamicHedgePolicy",
    "ExposurePosition",
    "HedgeDecision",
    "HedgePosition",
    "MarketState",
    "NewsEvent",
    "VolatilitySnapshot",
]
