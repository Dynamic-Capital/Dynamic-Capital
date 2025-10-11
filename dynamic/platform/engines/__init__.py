"""Compatibility shims for legacy ``dynamic_engines`` imports."""

# The production estate historically exposed a ``dynamic_engines`` package that
# collected the primary orchestrators from each subsystem.  The modern repo now
# organises these orchestrators within domain-specific packages (for example,
# :mod:`dynamic_states` and :mod:`dynamic_effect`).  This module restores the
# legacy surface area by lazily forwarding attribute access to the canonical
# implementations, keeping backwards compatibility without duplicating logic.

from __future__ import annotations

import ast
from importlib import import_module
from pathlib import Path
from typing import Dict, Iterable, Iterator, Tuple
import warnings

SymbolExport = str | tuple[str, str]

# Mapping of source modules to the engine-style orchestrators they expose.
# Symbols are imported lazily so optional dependencies from the source modules
# do not trigger import errors until the attribute is accessed.  Entries may
# optionally provide an ``(alias, symbol)`` tuple to expose a symbol under a
# different public name when avoiding collisions.
_ENGINE_EXPORTS: Dict[str, Tuple[SymbolExport, ...]] = {
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
    "dynamic.trading.logic": (
        "DynamicRisk",
        "Position",
        "RiskLimits",
        "RiskTelemetry",
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
    "dynamic.trading.live_sync": (
        "DEFAULT_LIVE_SYNC_CONTEXT",
        "DynamicTradingLiveSync",
        "LiveTradingDecision",
        "MarketUpdate",
    ),
    "dynamic_analytical_thinking": ("DynamicAnalyticalThinking",),
    "dynamic_arrow": ("DynamicArrow",),
    "dynamic_bots": ("DynamicTelegramBot",),
    "dynamic_branch": (
        "BranchDefinition",
        "BranchStatus",
        "DynamicBranchPlanner",
        "PromotionPlan",
    ),
    "dynamic_bridge": (
        "BridgeEndpoint",
        "BridgeHealthReport",
        "BridgeIncident",
        "BridgeLink",
        "BridgeOptimizationPlan",
        "DynamicBridgeOrchestrator",
        "create_dynamic_mt5_bridge",
    ),
    "dynamic_candles": ("DynamicCandles",),
    "dynamic_cap_theorem": ("DynamicCapTheorem",),
    "dynamic_clusters": (
        "DynamicClusterEngine",
        "ClusterAssignment",
        "ClusterPoint",
        "ClusterSnapshot",
        "ClusterSummary",
    ),
    "dynamic_cognition": (
        "CognitiveAlignmentEngine",
        "CognitiveAlignmentReport",
    ),
    "dynamic_consciousness": ("DynamicConsciousness",),
    "dynamic_creative_thinking": ("DynamicCreativeThinking",),
    "dynamic_critical_thinking": ("DynamicCriticalThinking",),
    "dynamic_cycle": (
        "DynamicCycleOrchestrator",
        "CycleEvent",
        "CyclePhase",
        "CycleSnapshot",
        "create_dynamic_life_cycle",
        "LIFE_CYCLE_BLUEPRINT",
    ),
    "dynamic_data_training": (
        "DataTrainingSummary",
        "DynamicDataTrainingEngine",
        "generate_training_report",
        "generate_training_summary",
    ),
    "dynamic_data_sharing": (
        "SharePolicy",
        "ShareRecord",
        "SharePackage",
        "DynamicDataSharingEngine",
    ),
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
    "dynamic_effect": (
        "EffectImpulse",
        "EffectContext",
        "EffectFrame",
        "DynamicEffectEngine",
    ),
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
    "dynamic_hierarchy": (
        "DynamicHierarchy",
        "HierarchyNode",
        "HierarchySnapshot",
        "HierarchyBlueprint",
        "HierarchyEngine",
        "HierarchyAgent",
        "HierarchyBuilder",
        "HierarchyHelperBot",
        "HIERARCHY_MODEL",
        "HierarchyCharacteristic",
        "HierarchyExample",
        "HierarchyModel",
        "OrganizationalHierarchy",
        "organizational_hierarchy_catalogue",
    ),
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
        "EngineeringBlueprint",
        "EngineeringTask",
        "DynamicEngineerAgent",
        "DynamicEngineerAgentResult",
        "DynamicEngineerBot",
    ),
    "dynamic.platform.engines.usage": (
        "DynamicUsageOrchestrator",
        "PersonaSignal",
        "UsageCycleResult",
    ),
    "dynamic_implicit_memory": ("DynamicImplicitMemory",),
    "dynamic_index": (
        "DynamicIndex",
        "IndexConstituent",
        "IndexSignal",
        "IndexSnapshot",
    ),
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
    "dynamic_mantra": (
        "DynamicMantra",
        "MantraContext",
        "MantraSeed",
        "MantraSequence",
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
    "dynamic_playbook": (
        "DEFAULT_DYNAMIC_AGS_ENTRIES",
        "DEFAULT_DYNAMIC_NFY_ENTRIES",
        "DynamicPlaybookAgent",
        "DynamicPlaybookBot",
        "DynamicPlaybookEngine",
        "DynamicPlaybookHelper",
        "DynamicPlaybookKeeper",
        "PlaybookBlueprint",
        "PlaybookContext",
        "PlaybookDisciplineInsight",
        "PlaybookEntry",
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
        "ChannelLoad",
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
    "dynamic_routine": (
        "DynamicRoutineEngine",
        "RoutineActivity",
        "RoutineBlock",
        "RoutineContext",
        "RoutinePlan",
    ),
    "dynamic_script": ("DynamicScriptEngine",),
    "dynamic_sense": (
        "DynamicSenseEngine",
        "SenseSignal",
        "SenseContext",
        "SenseFrame",
    ),
    "dynamic_self_awareness": ("DynamicSelfAwareness",),
    "dynamic_self_diagnosing": ("DynamicSelfDiagnosing",),
    "dynamic_self_healing": ("DynamicSelfHealing",),
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
    "dynamic_states": (
        "DynamicStateEngine",
        "StateSignal",
        "StateDefinition",
        "StateSnapshot",
    ),
    "dynamic_stem_cell": ("DynamicStemCell",),
    "dynamic_syncronization": ("DynamicSyncronizationOrchestrator",),
    "dynamic_superclusters": (
        "ClusterPulse",
        ("SuperclusterClusterSnapshot", "ClusterSnapshot"),
        "ClusterProfile",
        "DynamicSuperclusterEngine",
        "SuperclusterSpec",
        "SuperclusterSnapshot",
    ),
    "dynamic_supply": (
        "DynamicSupplyEngine",
        "SupplyAdjustment",
        "SupplySignal",
        "SupplySnapshot",
        "SupplySummary",
    ),
    "dynamic_text": ("DynamicTextEngine",),
    "dynamic_thinking": (
        "DynamicThinkingEngine",
        "ThinkingContext",
        "ThinkingFrame",
        "ThinkingSignal",
    ),
    "dynamic.platform.token": (
        "DynamicCapitalTokenEngine",
        "DCTCommitteeSignals",
        "DCTEngineReport",
        "DynamicTreasuryAlgo",
        "TreasuryEvent",
        "DynamicNFTMinter",
        "MintedDynamicNFT",
        "GeneratedNFTImage",
        "NFTImageGenerator",
        "NanoBananaClient",
        "committee_signals_from_optimisation",
    ),
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
    "dynamic_ultimate_reality": (
        "DynamicUltimateReality",
        "NonDualContext",
        "UltimateRealitySignal",
        "UltimateRealityState",
    ),
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


def _extract_dunder_all(module_name: str, init_file: Path) -> Tuple[str, ...] | None:
    """Parse ``__all__`` entries from ``init_file`` without importing eagerly."""

    try:
        source = init_file.read_text(encoding="utf-8")
    except OSError:
        return None

    try:
        tree = ast.parse(source, filename=str(init_file))
    except SyntaxError:
        return None

    def extract(node: ast.AST) -> Tuple[str, ...] | None:
        try:
            evaluated = ast.literal_eval(node)
        except (ValueError, SyntaxError):
            return None
        if isinstance(evaluated, (list, tuple)) and all(
            isinstance(item, str) for item in evaluated
        ):
            return tuple(evaluated)
        return None

    saw_assignment = False
    for statement in tree.body:
        value_node: ast.AST | None = None
        if isinstance(statement, ast.Assign):
            for target in statement.targets:
                if isinstance(target, ast.Name) and target.id == "__all__":
                    value_node = statement.value
                    break
        elif isinstance(statement, ast.AnnAssign):
            if (
                isinstance(statement.target, ast.Name)
                and statement.target.id == "__all__"
                and statement.value is not None
            ):
                value_node = statement.value
        if value_node is None:
            continue
        saw_assignment = True
        symbols = extract(value_node)
        if symbols:
            return symbols

    if not saw_assignment:
        return None

    try:
        module = import_module(module_name)
    except Exception:  # pragma: no cover - defensive import guard
        return None

    exported = getattr(module, "__all__", None)
    if (
        isinstance(exported, (list, tuple))
        and all(isinstance(item, str) for item in exported)
        and exported
    ):
        return tuple(exported)
    return None


def _iter_packages(package_root: Path, package_name: str) -> Iterator[Tuple[str, Path]]:
    """Yield packages under ``package_root`` with their ``__init__`` files."""

    init_file = package_root / "__init__.py"
    if not init_file.exists():
        return

    yield package_name, init_file

    for child in sorted(package_root.iterdir(), key=lambda path: path.name):
        if child.name.startswith(".") or child.name == "__pycache__":
            continue
        if not child.is_dir():
            continue
        child_init = child / "__init__.py"
        if not child_init.exists():
            continue
        yield from _iter_packages(child, f"{package_name}.{child.name}")


def _discover_engine_exports() -> Dict[str, Tuple[str, ...]]:
    """Collect exports from dynamic namespaces that declare ``__all__``."""

    file_path = Path(__file__).resolve()
    repo_root = file_path.parents[3]
    dynamic_root = file_path.parents[2]

    discovered: Dict[str, Tuple[str, ...]] = {}
    existing = set(_ENGINE_EXPORTS)

    def register(module_name: str, init_file: Path) -> None:
        if module_name in existing or module_name == __name__:
            return
        symbols = _extract_dunder_all(module_name, init_file)
        if not symbols:
            return
        discovered[module_name] = symbols
        existing.add(module_name)

    for entry in sorted(repo_root.iterdir(), key=lambda path: path.name):
        if not entry.is_dir():
            continue
        if entry.name.startswith("dynamic_"):
            init_file = entry / "__init__.py"
            if init_file.exists():
                register(entry.name, init_file)
            continue
        if entry == dynamic_root:
            for module_name, init_file in _iter_packages(entry, entry.name):
                register(module_name, init_file)

    return discovered


_ENGINE_EXPORTS.update(_discover_engine_exports())


def _export_alias(spec: SymbolExport) -> str:
    return spec[0] if isinstance(spec, tuple) else spec


def _export_symbol(spec: SymbolExport) -> str:
    return spec[1] if isinstance(spec, tuple) else spec


_EXPORTED_ALIASES = {
    _export_alias(spec)
    for specs in _ENGINE_EXPORTS.values()
    for spec in specs
}


__all__ = sorted(_EXPORTED_ALIASES | {"enable_all_dynamic_engines"})


_ENABLED_ALIASES: Dict[str, object] = {}
_TOTAL_EXPORTS = len(_EXPORTED_ALIASES)


def enable_all_dynamic_engines(*, strict: bool = False) -> Dict[str, object]:
    """Eagerly load every exported engine symbol into the shim namespace.

    Parameters
    ----------
    strict:
        When ``True`` the shim stops at the first import failure and raises a
        ``RuntimeError``.  When ``False`` (the default) import errors are
        collected so the remaining engines still initialise and a
        ``RuntimeWarning`` summarises any failures.

    Returns
    -------
    Dict[str, object]
        Mapping of engine alias names to the loaded objects.  Already-imported
        engines are included in the mapping so callers receive a complete view
        of what is currently available.
    """

    if len(_ENABLED_ALIASES) == _TOTAL_EXPORTS:
        return dict(_ENABLED_ALIASES)

    loaded: Dict[str, object] = dict(_ENABLED_ALIASES)
    failures: Dict[str, Exception] = {}

    for module_name, specs in _ENGINE_EXPORTS.items():
        for spec in specs:
            alias = _export_alias(spec)
            if alias in loaded:
                continue
            if alias in globals():
                value = globals()[alias]
                loaded[alias] = value
                _ENABLED_ALIASES[alias] = value
                continue
            try:
                value = _load_symbol(module_name, spec)
            except Exception as exc:  # pragma: no cover - defensive import guard
                failures[alias] = exc
                if strict:
                    raise RuntimeError(
                        f"Failed to enable engine '{alias}' from {module_name}"
                    ) from exc
            else:
                loaded[alias] = value
                _ENABLED_ALIASES[alias] = value

        if len(loaded) == _TOTAL_EXPORTS:
            break

    if failures:
        details = ", ".join(
            f"{name} ({type(error).__name__})" for name, error in failures.items()
        )
        warnings.warn(
            f"Failed to enable {len(failures)} engine(s): {details}",
            RuntimeWarning,
            stacklevel=2,
        )

    return dict(loaded)

def _load_symbol(module_name: str, spec: SymbolExport) -> object:
    alias = _export_alias(spec)
    symbol = _export_symbol(spec)
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[alias] = value
    return value


def __getattr__(name: str) -> object:
    for module_name, specs in _ENGINE_EXPORTS.items():
        for spec in specs:
            if _export_alias(spec) == name:
                return _load_symbol(module_name, spec)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)
