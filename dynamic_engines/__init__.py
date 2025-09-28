"""Compatibility shims for legacy ``dynamic_engines`` imports."""

# The production estate historically exposed a ``dynamic_engines`` package that
# collected the primary orchestrators from each subsystem.  The modern repo now
# organises these orchestrators within domain-specific packages (for example,
# :mod:`dynamic_states` and :mod:`dynamic_effect`).  This module restores the
# legacy surface area by lazily forwarding attribute access to the canonical
# implementations, keeping backwards compatibility without duplicating logic.

from __future__ import annotations

from importlib import import_module
from typing import Dict, Iterable, Tuple

# Mapping of source modules to the engine-style orchestrators they expose.
# Symbols are imported lazily so optional dependencies from the source modules
# do not trigger import errors until the attribute is accessed.
_ENGINE_EXPORTS: Dict[str, Tuple[str, ...]] = {
    "dynamic_architect": (
        "DynamicArchitect",
        "DynamicArchitectEngine",
        "DynamicArchitectAgent",
        "DynamicArchitectBot",
    ),
    "dynamic_agents": ("DynamicChatAgent",),
    "dynamic_assign": ("DynamicAssignEngine",),
    "dynamic_ai": (
        "DynamicFusionAlgo",
        "DynamicAnalysis",
        "FusionEngine",
        "DynamicHedgePolicy",
        "DynamicConsciousnessSuite",
    ),
    "dynamic_agi": (
        "DynamicAGIModel",
        "AGIOutput",
        "AGIDiagnostics",
    ),
    "dynamic_algo": (
        "DynamicTradingAlgo",
        "DynamicMarketFlow",
        "DynamicCEOAlgo",
        "DynamicCFOAlgo",
        "DynamicCOOAlgo",
        "DynamicMiddlewareAlgo",
        "DynamicPoolAlgo",
        "DynamicMetadataAlgo",
        "DynamicMarketingAlgo",
        "DynamicMark",
        "DynamicPsychologyAlgo",
        "DynamicDecisionAlgo",
        "DynamicElementAlgo",
        "DynamicNode",
        "DynamicNodeRegistry",
        "DynamicNodeError",
        "DynamicType",
        "DynamicTypeRegistry",
        "DynamicTypeError",
        "DynamicTrackingAlgo",
        "DynamicScript",
        "DynamicScriptRegistry",
        "DynamicTrafficControl",
        "DynamicProblemSolvingAlgo",
    ),
    "dynamic_analytical_thinking": ("DynamicAnalyticalThinking",),
    "dynamic_arrow": ("DynamicArrow",),
    "dynamic_bots": ("DynamicTelegramBot",),
    "dynamic_branch": ("DynamicBranchPlanner",),
    "dynamic_bridge": ("DynamicBridgeOrchestrator",),
    "dynamic_candles": ("DynamicCandles",),
    "dynamic_consciousness": ("DynamicConsciousness",),
    "dynamic_creative_thinking": ("DynamicCreativeThinking",),
    "dynamic_critical_thinking": ("DynamicCriticalThinking",),
    "dynamic_effect": ("DynamicEffectEngine",),
    "dynamic_emoticon": ("DynamicEmoticon",),
    "dynamic_heal": ("DynamicHealEngine",),
    "dynamic_encryption": ("DynamicEncryptionEngine",),
    "dynamic_engineer": (
        "DynamicEngineer",
        "DynamicEngineerEngine",
        "DynamicEngineerAgent",
        "DynamicEngineerBot",
    ),
    "dynamic_implicit_memory": ("DynamicImplicitMemory",),
    "dynamic_index": ("DynamicIndex",),
    "dynamic_loop": ("DynamicLoopEngine",),
    "dynamic_letter_index": ("DynamicLetterIndex",),
    "dynamic_indicators": ("DynamicIndicators",),
    "dynamic_keepers": (
        "DynamicAPIKeeperAlgorithm",
        "DynamicBackendKeeperAlgorithm",
        "DynamicChannelKeeperAlgorithm",
        "DynamicFrontendKeeperAlgorithm",
        "DynamicGroupKeeperAlgorithm",
        "DynamicRouteKeeperAlgorithm",
        "DynamicTimeKeeperAlgorithm",
    ),
    "dynamic_kyc": ("DynamicKycRegistry",),
    "dynamic_library": ("DynamicLibrary",),
    "dynamic_memory": ("DynamicMemoryConsolidator",),
    "dynamic_memory_reconsolidation": ("DynamicMemoryReconsolidation",),
    "dynamic_metacognition": ("DynamicMetacognition",),
    "dynamic_mentorship": ("DynamicMentorshipEngine",),
    "dynamic_numbers": ("DynamicNumberComposer",),
    "dynamic_package": ("DynamicPackageDesigner",),
    "dynamic_pillars": ("DynamicPillarFramework",),
    "dynamic_quote": ("DynamicQuote",),
    "dynamic_reference": ("DynamicReference",),
    "dynamic_script": ("DynamicScriptEngine",),
    "dynamic_self_awareness": ("DynamicSelfAwareness",),
    "dynamic_skeleton": ("DynamicGovernanceAlgo", "DynamicComplianceAlgo"),
    "dynamic_space.engine": ("DynamicSpaceEngine",),
    "dynamic_spheres": ("DynamicSpheresEngine",),
    "dynamic_states": ("DynamicStateEngine",),
    "dynamic_stem_cell": ("DynamicStemCell",),
    "dynamic_syncronization": ("DynamicSyncronizationOrchestrator",),
    "dynamic_text": ("DynamicTextEngine",),
    "dynamic_thinking": ("DynamicThinkingEngine",),
    "dynamic_token": ("DynamicTreasuryAlgo",),
    "dynamic_ton": (
        "DynamicTonEngine",
        "TonAction",
        "TonExecutionPlan",
        "TonLiquidityPool",
        "TonNetworkTelemetry",
        "TonTreasuryPosture",
    ),
    "dynamic_ultimate_reality": ("DynamicUltimateReality",),
    "dynamic_volume": ("DynamicVolumeAlgo",),
    "dynamic_wisdom": ("DynamicWisdomEngine",),
}

__all__ = sorted({symbol for symbols in _ENGINE_EXPORTS.values() for symbol in symbols})


def _load_symbol(module_name: str, symbol: str) -> object:
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[symbol] = value
    return value


def __getattr__(name: str) -> object:
    for module_name, symbols in _ENGINE_EXPORTS.items():
        if name in symbols:
            return _load_symbol(module_name, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)
