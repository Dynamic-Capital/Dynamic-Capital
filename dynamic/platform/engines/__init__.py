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
    "dynamic_ascii": (
        "DynamicAsciiEngine",
        "AsciiNFT",
        "AsciiCanvas",
        "AsciiPalette",
        "DEFAULT_ASCII_PALETTE",
        "AsciiConversionError",
    ),
    "dynamic_agents": ("DynamicChatAgent",),
    "dynamic_assign": ("DynamicAssignEngine",),
    "dynamic.intelligence.ai_apps": (
        "DynamicFusionAlgo",
        "DynamicAnalysis",
        "FusionEngine",
        "DynamicHedgePolicy",
        "DynamicConsciousnessSuite",
    ),
    "dynamic.intelligence.agi": (
        "DynamicAGIModel",
        "AGIOutput",
        "AGIDiagnostics",
    ),
    "dynamic.trading.algo": (
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
    "dynamic_demand": (
        "DynamicDemandEngine",
        "DemandProjection",
        "DemandSignal",
        "DemandSnapshot",
        "DemandSummary",
    ),
    "dynamic_diffusion": (
        "DynamicDiffusionEngine",
        "DiffusionNode",
        "DiffusionSignal",
        "DiffusionSnapshot",
        "DynamicDiffusionModel",
        "DiffusionModelParameters",
        "DiffusionModelTrainingSample",
        "DiffusionModelResult",
        "DiffusionNodeForecast",
    ),
    "dynamic_deep_learning": (
        "DynamicDeepLearningEngine",
        "DeepLearningLayerSpec",
        "DeepLearningModelSpec",
        "TrainingSample",
        "TrainingMetrics",
    ),
    "dynamic_dockerfile": (
        "DynamicDockerfileEngine",
        "DockerfileContext",
        "DockerfileArtifact",
        "DockerStageBlueprint",
        "StageInstruction",
        "FeatureRecipe",
    ),
    "dynamic_effect": ("DynamicEffectEngine",),
    "dynamic_evaluation": (
        "DynamicEvaluationEngine",
        "EvaluationContext",
        "EvaluationCriterion",
        "EvaluationReport",
        "EvaluationSignal",
        "EvaluationSnapshot",
    ),
    "dynamic_event": (
        "DynamicEventEngine",
        "EventPulse",
        "EventContext",
        "EventFrame",
    ),
    "dynamic_emoticon": ("DynamicEmoticon",),
    "dynamic_framework": ("DynamicFrameworkEngine",),
    "dynamic_heal": ("DynamicHealEngine",),
    "dynamic_iceberg": (
        "DynamicIcebergEngine",
        "IcebergEnvironment",
        "IcebergObservation",
        "IcebergPhase",
        "IcebergSegment",
        "IcebergSnapshot",
        "DynamicIcebergModel",
        "IcebergModelBreakdown",
        "IcebergModelParameters",
        "IcebergModelResult",
        "IcebergModelTrainingSample",
    ),
    "dynamic_encryption": ("DynamicEncryptionEngine",),
    "dynamic_engineer": (
        "DynamicEngineer",
        "DynamicEngineerEngine",
        "DynamicEngineerAgent",
        "DynamicEngineerBot",
    ),
    "dynamic.platform.engines.usage": (
        "DynamicUsageOrchestrator",
        "PersonaSignal",
        "UsageCycleResult",
    ),
    "dynamic_implicit_memory": ("DynamicImplicitMemory",),
    "dynamic_index": ("DynamicIndex",),
    "dynamic_immune": (
        "DynamicImmuneEngine",
        "ThreatAssessment",
        "ThreatEvent",
    ),
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
    "dynamic_logging": (
        "DynamicLoggingEngine",
        "LogEvent",
        "LogSeverity",
        "LoggingSnapshot",
    ),
    "dynamic_memory": (
        "DynamicMemoryConsolidator",
        "DynamicMemoryEngine",
    ),
    "dynamic_memory_reconsolidation": ("DynamicMemoryReconsolidation",),
    "dynamic_method": (
        "DynamicMethodEngine",
        "MethodSignal",
        "MethodContext",
        "MethodBlueprint",
    ),
    "dynamic_metacognition": ("DynamicMetacognition",),
    "dynamic_mentorship": ("DynamicMentorshipEngine",),
    "dynamic_numbers": ("DynamicNumberComposer",),
    "dynamic_parameter": (
        "DynamicParameterEngine",
        "ParameterSpec",
        "ParameterState",
        "ParameterChange",
        "ParameterSnapshot",
        "ParameterScenario",
        "ParameterScenarioResult",
    ),
    "dynamic_mapping": ("DynamicMappingEngine",),
    "dynamic_mass": (
        "DynamicMassEngine",
        "StarProfile",
        "StellarMassModel",
        "SpectralType",
        "SOLAR_MASS_KG",
    ),
    "dynamic_matrix": (
        "DynamicMatrixEngine",
        "MatrixBlueprint",
        "MatrixCellUpdate",
        "MatrixSnapshot",
        "MatrixSummary",
        "CellUpdateMode",
    ),
    "dynamic_package": ("DynamicPackageDesigner",),
    "dynamic.governance.ags": (
        "DynamicPlaybookAgent",
        "DynamicPlaybookBot",
        "DynamicPlaybookEngine",
        "DynamicPlaybookHelper",
        "DynamicPlaybookKeeper",
        "DEFAULT_DYNAMIC_AGS_ENTRIES",
        "DEFAULT_DYNAMIC_NFY_ENTRIES",
        "PlaybookEntry",
        "PlaybookContext",
        "PlaybookBlueprint",
        "PlaybookDisciplineInsight",
        "PlaybookSynchronizer",
        "build_dynamic_ags_playbook",
        "build_dynamic_nfy_market_dimensions_playbook",
    ),
    "dynamic_pillars": ("DynamicPillarFramework",),
    "dynamic_predictive": (
        "DynamicPredictiveEngine",
        "PredictiveFeature",
        "PredictiveInsight",
        "PredictiveScenario",
    ),
    "dynamic_quote": ("DynamicQuote",),
    "dynamic_respiration": (
        "DynamicRespirationEngine",
        "InformationPulse",
        "RespirationSnapshot",
    ),
    "dynamic_quantitative.engine": (
        "DynamicQuantitativeEngine",
        "QuantitativeEnvironment",
        "QuantitativeSignal",
        "QuantitativeSnapshot",
    ),
    "dynamic_quantum.engine": (
        "DynamicQuantumEngine",
        "QuantumEnvironment",
        "QuantumPulse",
        "QuantumResonanceFrame",
    ),
    "dynamic_reference": ("DynamicReference",),
    "dynamic_recipe": (
        "DynamicRecipeEngine",
        "RecipeContext",
        "RecipeIngredient",
        "RecipePlan",
        "RecipeProfile",
        "RecipeStep",
        "RecipeSuggestion",
        "ShoppingItem",
    ),
    "dynamic_script": ("DynamicScriptEngine",),
    "dynamic_sense": (
        "DynamicSenseEngine",
        "SenseSignal",
        "SenseContext",
        "SenseFrame",
    ),
    "dynamic_self_awareness": ("DynamicSelfAwareness",),
    "dynamic_ecosystem": (
        "CascadeSimulation",
        "DynamicEcosystemEngine",
        "EcosystemEntity",
        "EcosystemLink",
        "EcosystemSnapshot",
    ),
    "dynamic_skeleton": ("DynamicGovernanceAlgo", "DynamicComplianceAlgo"),
    "dynamic_source": ("DynamicSourceEngine",),
    "dynamic_space.engine": ("DynamicSpaceEngine",),
    "dynamic_spheres": ("DynamicSpheresEngine",),
    "dynamic_states": ("DynamicStateEngine",),
    "dynamic_stem_cell": ("DynamicStemCell",),
    "dynamic_syncronization": ("DynamicSyncronizationOrchestrator",),
    "dynamic_supply": (
        "DynamicSupplyEngine",
        "SupplyAdjustment",
        "SupplySignal",
        "SupplySnapshot",
        "SupplySummary",
    ),
    "dynamic_text": ("DynamicTextEngine",),
    "dynamic_thinking": ("DynamicThinkingEngine",),
    "dynamic.platform.token": ("DynamicTreasuryAlgo",),
    "dynamic_ton": (
        "DynamicTonEngine",
        "TonAction",
        "TonExecutionPlan",
        "TonLiquidityPool",
        "TonNetworkTelemetry",
        "TonTreasuryPosture",
    ),
    "dynamic_trainer.engine": (
        "DynamicTrainerEngine",
        "DynamicTrainerModel",
        "TrainerContext",
        "TrainingSignal",
    ),
    "dynamic_ultimate_reality": ("DynamicUltimateReality",),
    "dynamic_volume": ("DynamicVolumeAlgo",),
    "dynamic_wisdom": ("DynamicWisdomEngine",),
    "dynamic.platform.web3": (
        "DynamicWeb3Engine",
        "NetworkTelemetry",
        "NetworkHealthSummary",
        "SmartContract",
        "Web3Action",
        "Web3Network",
        "TransactionProfile",
    ),
    "dynamic_wallet": (
        "DynamicWalletEngine",
        "WalletAccount",
        "WalletAction",
        "WalletBalance",
        "WalletExposure",
        "WalletSummary",
    ),
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
