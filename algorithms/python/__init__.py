"""Python trading strategy utilities for Dynamic Capital.

The module exposes helper planners that mirror the Dynamic Capital treasury
and token policy handbooks.  See :mod:`algorithms.python.dct_treasury_growth`
for the treasury growth heuristics derived from the sustainability
whitepaper.
"""

from . import trade_logic as _trade_logic
from .awesome_api import (
    AwesomeAPIAutoCalculator,
    AwesomeAPIAutoMetrics,
    AwesomeAPIClient,
    AwesomeAPIError,
    AwesomeAPISnapshotBuilder,
)
from .elliott_wave import ElliottSwing, ElliottWaveAnalyzer, ElliottWaveReport
from .mechanical_analysis import MechanicalAnalysisCalculator, MechanicalMetrics
from .economic_catalysts import (
    EconomicCatalyst,
    EconomicCatalystGenerator,
    EconomicCatalystSyncJob,
)
from .loss_recovery_programme import (
    AccountState,
    LossRecoveryConfig,
    LossRecoveryProgramme,
    RecoveryPlan,
    RecoveryStep,
)
from .dct_token_sync import (
    DCTAllocationEngine,
    DCTAllocationResult,
    DCTAllocationRule,
    DCTMarketSnapshot,
    DCTMultiLLMOptimiser,
    DCTPriceBreakdown,
    DCTPriceCalculator,
    DCTPriceInputs,
    DCTProductionInputs,
    DCTProductionPlan,
    DCTProductionPlanner,
    DCTLLMAdjustment,
    DCTLLMOptimisationResult,
    DCTSyncJob,
)
from .vip_auto_token_sync import (
    VipAutoSyncJob,
    VipAutoSyncReport,
    VipMembershipProvider,
    VipMembershipSnapshot,
    VipTokenGrant,
    VipTokenisationStrategy,
)
from .dct_treasury_growth import (
    TreasuryGrowthLevers,
    TreasuryGrowthPlan,
    TreasuryGrowthPlanner,
    TreasurySnapshot,
)
from .desk_token_hub import (
    CHECKLIST_REFERENCE as DESK_TOKEN_CHECKLIST_REFERENCE,
    TokenHubDevelopmentContext,
    TokenHubDevelopmentOrchestrator,
    TokenHubSyncReport,
)

_trade_exports = list(getattr(_trade_logic, "__all__", []))  # type: ignore[attr-defined]

__all__ = _trade_exports + [
    "AwesomeAPIAutoCalculator",
    "AwesomeAPIAutoMetrics",
    "AwesomeAPIClient",
    "AwesomeAPIError",
    "AwesomeAPISnapshotBuilder",
    "ElliottSwing",
    "ElliottWaveAnalyzer",
    "ElliottWaveReport",
    "MechanicalAnalysisCalculator",
    "MechanicalMetrics",
    "EconomicCatalyst",
    "EconomicCatalystGenerator",
    "EconomicCatalystSyncJob",
    "AccountState",
    "LossRecoveryConfig",
    "LossRecoveryProgramme",
    "RecoveryPlan",
    "RecoveryStep",
    "DCTAllocationEngine",
    "DCTAllocationResult",
    "DCTAllocationRule",
    "DCTMarketSnapshot",
    "DCTMultiLLMOptimiser",
    "DCTPriceBreakdown",
    "DCTPriceCalculator",
    "DCTPriceInputs",
    "DCTProductionInputs",
    "DCTProductionPlan",
    "DCTProductionPlanner",
    "DCTLLMAdjustment",
    "DCTLLMOptimisationResult",
    "DCTSyncJob",
    "DESK_TOKEN_CHECKLIST_REFERENCE",
    "TokenHubDevelopmentContext",
    "TokenHubDevelopmentOrchestrator",
    "TokenHubSyncReport",
    "VipAutoSyncJob",
    "VipAutoSyncReport",
    "VipMembershipProvider",
    "VipMembershipSnapshot",
    "VipTokenGrant",
    "VipTokenisationStrategy",
    "TreasuryGrowthLevers",
    "TreasuryGrowthPlan",
    "TreasuryGrowthPlanner",
    "TreasurySnapshot",
]

globals().update({name: getattr(_trade_logic, name) for name in _trade_exports})
globals().update(
    {
        "AwesomeAPIAutoCalculator": AwesomeAPIAutoCalculator,
        "AwesomeAPIAutoMetrics": AwesomeAPIAutoMetrics,
        "AwesomeAPIClient": AwesomeAPIClient,
        "AwesomeAPIError": AwesomeAPIError,
        "AwesomeAPISnapshotBuilder": AwesomeAPISnapshotBuilder,
        "ElliottSwing": ElliottSwing,
        "ElliottWaveAnalyzer": ElliottWaveAnalyzer,
        "ElliottWaveReport": ElliottWaveReport,
        "MechanicalAnalysisCalculator": MechanicalAnalysisCalculator,
        "MechanicalMetrics": MechanicalMetrics,
        "EconomicCatalyst": EconomicCatalyst,
        "EconomicCatalystGenerator": EconomicCatalystGenerator,
        "EconomicCatalystSyncJob": EconomicCatalystSyncJob,
        "AccountState": AccountState,
        "LossRecoveryConfig": LossRecoveryConfig,
        "LossRecoveryProgramme": LossRecoveryProgramme,
        "RecoveryPlan": RecoveryPlan,
        "RecoveryStep": RecoveryStep,
        "DCTAllocationEngine": DCTAllocationEngine,
        "DCTAllocationResult": DCTAllocationResult,
        "DCTAllocationRule": DCTAllocationRule,
        "DCTMarketSnapshot": DCTMarketSnapshot,
        "DCTMultiLLMOptimiser": DCTMultiLLMOptimiser,
        "DCTPriceBreakdown": DCTPriceBreakdown,
        "DCTPriceCalculator": DCTPriceCalculator,
        "DCTPriceInputs": DCTPriceInputs,
        "DCTProductionInputs": DCTProductionInputs,
        "DCTProductionPlan": DCTProductionPlan,
        "DCTProductionPlanner": DCTProductionPlanner,
        "DCTLLMAdjustment": DCTLLMAdjustment,
        "DCTLLMOptimisationResult": DCTLLMOptimisationResult,
        "DCTSyncJob": DCTSyncJob,
        "DESK_TOKEN_CHECKLIST_REFERENCE": DESK_TOKEN_CHECKLIST_REFERENCE,
        "TokenHubDevelopmentContext": TokenHubDevelopmentContext,
        "TokenHubDevelopmentOrchestrator": TokenHubDevelopmentOrchestrator,
        "TokenHubSyncReport": TokenHubSyncReport,
        "VipAutoSyncJob": VipAutoSyncJob,
        "VipAutoSyncReport": VipAutoSyncReport,
        "VipMembershipProvider": VipMembershipProvider,
        "VipMembershipSnapshot": VipMembershipSnapshot,
        "VipTokenGrant": VipTokenGrant,
        "VipTokenisationStrategy": VipTokenisationStrategy,
        "TreasuryGrowthLevers": TreasuryGrowthLevers,
        "TreasuryGrowthPlan": TreasuryGrowthPlan,
        "TreasuryGrowthPlanner": TreasuryGrowthPlanner,
        "TreasurySnapshot": TreasurySnapshot,
    }
)
