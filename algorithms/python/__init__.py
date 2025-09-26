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
from .dct_token_sync import (
    DCTAllocationEngine,
    DCTAllocationResult,
    DCTAllocationRule,
    DCTMarketSnapshot,
    DCTPriceBreakdown,
    DCTPriceCalculator,
    DCTPriceInputs,
    DCTProductionInputs,
    DCTProductionPlan,
    DCTProductionPlanner,
    DCTSyncJob,
)

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
    "DCTAllocationEngine",
    "DCTAllocationResult",
    "DCTAllocationRule",
    "DCTMarketSnapshot",
    "DCTPriceBreakdown",
    "DCTPriceCalculator",
    "DCTPriceInputs",
    "DCTProductionInputs",
    "DCTProductionPlan",
    "DCTProductionPlanner",
    "DCTSyncJob",
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
        "DCTAllocationEngine": DCTAllocationEngine,
        "DCTAllocationResult": DCTAllocationResult,
        "DCTAllocationRule": DCTAllocationRule,
        "DCTMarketSnapshot": DCTMarketSnapshot,
        "DCTPriceBreakdown": DCTPriceBreakdown,
        "DCTPriceCalculator": DCTPriceCalculator,
        "DCTPriceInputs": DCTPriceInputs,
        "DCTProductionInputs": DCTProductionInputs,
        "DCTProductionPlan": DCTProductionPlan,
        "DCTProductionPlanner": DCTProductionPlanner,
        "DCTSyncJob": DCTSyncJob,
    }
)
