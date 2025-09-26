"""Python trading strategy utilities for Dynamic Capital."""

from . import trade_logic as _trade_logic
from .awesome_api import (
    AwesomeAPIAutoCalculator,
    AwesomeAPIAutoMetrics,
    AwesomeAPIClient,
    AwesomeAPIError,
    AwesomeAPISnapshotBuilder,
)
from .mechanical_analysis import MechanicalAnalysisCalculator, MechanicalMetrics
from .economic_catalysts import (
    EconomicCatalyst,
    EconomicCatalystGenerator,
    EconomicCatalystSyncJob,
)
from .trading_psychology import (
    PsychologyObservation,
    PsychologyScore,
    TradingPsychologyInsights,
    TradingPsychologyModel,
)
from .jobs.trading_psychology_job import TradingPsychologySyncJob

_trade_exports = list(getattr(_trade_logic, "__all__", []))  # type: ignore[attr-defined]

__all__ = _trade_exports + [
    "AwesomeAPIAutoCalculator",
    "AwesomeAPIAutoMetrics",
    "AwesomeAPIClient",
    "AwesomeAPIError",
    "AwesomeAPISnapshotBuilder",
    "MechanicalAnalysisCalculator",
    "MechanicalMetrics",
    "EconomicCatalyst",
    "EconomicCatalystGenerator",
    "EconomicCatalystSyncJob",
    "PsychologyObservation",
    "PsychologyScore",
    "TradingPsychologyModel",
    "TradingPsychologyInsights",
    "TradingPsychologySyncJob",
]

globals().update({name: getattr(_trade_logic, name) for name in _trade_exports})
globals().update(
    {
        "AwesomeAPIAutoCalculator": AwesomeAPIAutoCalculator,
        "AwesomeAPIAutoMetrics": AwesomeAPIAutoMetrics,
        "AwesomeAPIClient": AwesomeAPIClient,
        "AwesomeAPIError": AwesomeAPIError,
        "AwesomeAPISnapshotBuilder": AwesomeAPISnapshotBuilder,
        "MechanicalAnalysisCalculator": MechanicalAnalysisCalculator,
        "MechanicalMetrics": MechanicalMetrics,
        "EconomicCatalyst": EconomicCatalyst,
        "EconomicCatalystGenerator": EconomicCatalystGenerator,
        "EconomicCatalystSyncJob": EconomicCatalystSyncJob,
        "PsychologyObservation": PsychologyObservation,
        "PsychologyScore": PsychologyScore,
        "TradingPsychologyModel": TradingPsychologyModel,
        "TradingPsychologyInsights": TradingPsychologyInsights,
        "TradingPsychologySyncJob": TradingPsychologySyncJob,
    }
)
