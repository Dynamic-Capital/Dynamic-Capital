"""Dynamic AI package exposing fusion signal generation utilities."""

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
    "AISignal",
    "DynamicFusionAlgo",
    "AnalysisComponent",
    "DynamicAnalysis",
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
    "AccountState",
    "DynamicHedgePolicy",
    "ExposurePosition",
    "HedgeDecision",
    "HedgePosition",
    "MarketState",
    "NewsEvent",
    "VolatilitySnapshot",
]
