"""Aggregate exports for the Dynamic Capital toolkit surface.

The original automation stack exposed a ``dynamic_tool_kits`` namespace that
bundled contextual dataclasses, payload contracts, and other supporting
structures.  As the repository grew these utilities were moved into
domain-focused packages.  This module re-introduces the aggregated import
surface so downstream consumers can continue using the historic entry point
while the implementation remains centralised.
"""

from __future__ import annotations

import ast
from ast import literal_eval
from importlib import import_module
from pathlib import Path
from typing import Dict, Iterable, Tuple

# Each entry points to the supporting data models, contexts, and helper classes
# for a particular domain toolkit.  Symbols are resolved lazily to avoid pulling
# heavy dependencies unless they are explicitly requested by consumers.
_TOOLKIT_EXPORTS: Dict[str, Tuple[str, ...]] = {
    "dynamic_agents": (
        "Agent",
        "AgentResult",
        "BloodAgent",
        "BloodAgentResult",
        "ChatAgentResult",
        "ChatTurn",
        "DynamicChatAgent",
        "ExecutionAgent",
        "ExecutionAgentResult",
        "ResearchAgent",
        "ResearchAgentResult",
        "RiskAgent",
        "RiskAgentResult",
        "SpaceAgent",
        "SpaceAgentResult",
        "TradingAgent",
        "TradingAgentResult",
        "run_dynamic_agent_cycle",
    ),
    "dynamic_ai": (
        "AISignal",
        "DynamicAnalysis",
        "DynamicConsciousnessSuite",
        "DynamicFusionAlgo",
        "DynamicHedgePolicy",
        "FusionEngine",
        "DolphinLlamaCppAdapter",
        "DolphinModelConfig",
        "DolphinPromptTemplate",
        "DolphinSamplingConfig",
        "LLMIntegrationError",
        "OllamaAdapter",
        "OllamaConfig",
        "OllamaPromptTemplate",
        "AnalysisComponent",
        "LobeSignal",
        "LorentzianDistanceLobe",
        "RegimeContext",
        "SentimentLobe",
        "SignalLobe",
        "TrendMomentumLobe",
        "TreasuryLobe",
        "calibrate_lorentzian_lobe",
        "load_lorentzian_model",
        "prepare_fusion_training_rows",
        "PositionSizing",
        "RiskContext",
        "RiskManager",
        "RiskParameters",
        "AccountState",
        "ExposurePosition",
        "HedgeDecision",
        "HedgePosition",
        "MarketState",
        "NewsEvent",
        "VolatilitySnapshot",
        "BloodAgent",
        "BloodAgentResult",
        "AwarenessContexts",
        "AwarenessDiagnostics",
        "IntegratedAwareness",
    ),
    "dynamic_algo": (
        "ORDER_ACTION_BUY",
        "ORDER_ACTION_SELL",
        "SUCCESS_RETCODE",
        "TradeExecutionResult",
        "InstrumentProfile",
        "normalise_symbol",
        "MarketFlowSnapshot",
        "MarketFlowTrade",
        "CEOPulse",
        "CEOInitiativeSummary",
        "CEOSnapshot",
        "FinancialEntry",
        "FinancialPeriodSummary",
        "CFOSnapshot",
        "OperationalSignal",
        "OperationalDomainSummary",
        "OperationsSnapshot",
        "MiddlewareContext",
        "MiddlewareExecutionError",
        "InvestorAllocation",
        "PoolDeposit",
        "PoolSnapshot",
        "PoolWithdrawal",
        "MetadataAttribute",
        "MarketingTouchpoint",
        "ChannelPerformance",
        "CampaignSnapshot",
        "PsychologyEntry",
        "PsychologySnapshot",
        "ElementAggregate",
        "DecisionSignal",
        "DecisionContext",
        "DecisionOption",
        "DecisionSignalSummary",
        "DecisionRecommendation",
        "ElementContribution",
        "ElementSummary",
        "ElementSnapshot",
        "NodeConfigError",
        "NodeDependencyError",
        "TypeClassification",
        "TypeConfigError",
        "TypeResolutionError",
        "TrackingEvent",
        "StageSummary",
        "TrackingSnapshot",
        "ScriptConfigError",
        "RoutePolicy",
        "RouteSnapshot",
        "TrafficDecision",
        "TrafficSignal",
        "Goal",
        "Obstacle",
        "Insight",
        "ActionHypothesis",
        "ProblemOutcome",
        "ActionPlan",
        "ProblemSolvingError",
        "GoalNotDefinedError",
    ),
    "dynamic_analytical_thinking": ("AnalyticalContext", "AnalyticalInsight", "AnalyticalSignal"),
    "dynamic_arrow": ("ArrowSignal", "ArrowSnapshot"),
    "dynamic_autonoetic": ("AutonoeticConsciousness", "AutonoeticContext", "AutonoeticSignal", "AutonoeticState"),
    "dynamic_blood": (
        "BloodContext",
        "BloodInsight",
        "BloodSample",
        "DynamicBlood",
    ),
    "dynamic_branch": ("BranchDefinition", "BranchStatus", "PromotionPlan"),
    "dynamic_bridge": ("BridgeEndpoint", "BridgeHealthReport", "BridgeIncident", "BridgeLink", "create_dynamic_mt5_bridge"),
    "dynamic_candles": ("Candle", "CandleAnalytics", "CandleSeries", "PatternSignal"),
    "dynamic_consciousness": ("ConsciousnessContext", "ConsciousnessSignal", "ConsciousnessState"),
    "dynamic_creative_thinking": ("CreativeContext", "CreativeFrame", "CreativeSignal"),
    "dynamic_critical_thinking": ("CriticalEvaluation", "CriticalSignal", "EvaluationContext"),
    "dynamic_development_team": (
        "DevelopmentAgentResult",
        "DevelopmentTeamAgent",
        "FrontEndDeveloperAgent",
        "BackEndDeveloperAgent",
        "BlockchainDeveloperAgent",
        "DynamicLanguagesExpertAgent",
        "UiUxDesignerAgent",
        "DevOpsEngineerAgent",
        "get_development_playbook",
        "list_development_agents",
        "build_development_team_sync",
        "synchronise_development_team",
    ),
    "dynamic_effect": ("EffectImpulse", "EffectContext", "EffectFrame"),
    "dynamic_evaluation": (
        "DynamicEvaluationEngine",
        "EvaluationContext",
        "EvaluationCriterion",
        "EvaluationReport",
        "EvaluationSignal",
        "EvaluationSnapshot",
    ),
    "dynamic_emoticon": ("EmoticonContext", "EmoticonDesign", "EmoticonPalette", "EmoticonSignal"),
    "dynamic_encryption": ("EncryptionEnvelope", "EncryptionRequest", "KeyMaterial"),
    "dynamic_implicit_memory": ("ImplicitMemoryReport", "ImplicitMemoryTrace", "MemoryContext"),
    "dynamic_index": ("IndexConstituent", "IndexSignal", "IndexSnapshot"),
    "dynamic_indicators": (
        "IndicatorDefinition",
        "IndicatorOverview",
        "IndicatorReading",
        "IndicatorSnapshot",
        "create_dynamic_indicators",
    ),
    "dynamic_keepers": (
        "ApiKeeperSyncResult",
        "BackendKeeperSyncResult",
        "ChannelKeeperSyncResult",
        "FrontendKeeperSyncResult",
        "GroupKeeperSyncResult",
        "RouteKeeperSyncResult",
        "TimeKeeperSyncResult",
    ),
    "dynamic_kyc": ("KycDocument", "ParticipantProfile", "ScreeningResult"),
    "dynamic_library": ("LibraryAsset", "LibraryContext", "LibraryDigest"),
    "dynamic_memory": ("ConsolidationContext", "MemoryConsolidationReport", "MemoryFragment"),
    "dynamic_memory_reconsolidation": ("MemoryTrace", "ReconsolidationContext", "ReconsolidationPlan"),
    "dynamic_metacognition": ("MetaSignal", "MetacognitiveReport", "ReflectionContext"),
    "dynamic_mindset": ("MindsetCoach", "MindsetContext", "MindsetPlan", "MindsetSignal"),
    "dynamic_numbers": ("NumberPulse", "NumberSignalReport", "NumberWindowSummary"),
    "dynamic_package": ("PackageComponent", "PackageContext", "PackageDigest"),
    "dynamic_pillars": ("PillarDefinition", "PillarOverview", "PillarSignal", "PillarSnapshot"),
    "dynamic_quote": ("QuoteContext", "QuoteDigest", "QuoteIdea"),
    "dynamic_reference": ("ReferenceContext", "ReferenceDigest", "ReferenceEntry"),
    "dynamic_self_awareness": ("AwarenessContext", "SelfAwarenessReport", "SelfAwarenessSignal"),
    "dynamic_skeleton": ("AuditLogEntry", "Proposal", "Vote", "ComplianceCheck", "ComplianceReport"),
    "dynamic_states": ("StateSignal", "StateDefinition", "StateSnapshot"),
    "dynamic_stem_cell": ("StemCellContext", "StemCellProfile", "StemCellSignal"),
    "dynamic_syncronization": ("SyncDependency", "SyncEvent", "SyncIncident", "SyncStatusSnapshot", "SyncSystem"),
    "dynamic_text": ("TextFragment", "TextContext", "TextDigest"),
    "dynamic_thinking": ("ThinkingContext", "ThinkingFrame", "ThinkingSignal"),
    "dynamic_ultimate_reality": ("NonDualContext", "UltimateRealitySignal", "UltimateRealityState"),
    "dynamic_volume": ("BookLevel", "VolumeAlert", "VolumeSnapshot", "VolumeThresholds"),
    "dynamic_wisdom": ("WisdomContext", "WisdomFrame", "WisdomSignal"),
}


def _extract_dunder_all(
    module_name: str, init_file: Path
) -> Tuple[str, ...] | None:
    """Parse a package ``__init__`` file and return its ``__all__`` entries."""

    try:
        source = init_file.read_text(encoding="utf-8")
    except OSError:
        return None

    try:
        tree = ast.parse(source, filename=str(init_file))
    except SyntaxError:
        return None

    def extract(value: ast.AST) -> Tuple[str, ...] | None:
        try:
            evaluated = literal_eval(value)
        except (ValueError, SyntaxError):
            return None
        if isinstance(evaluated, (list, tuple)) and all(
            isinstance(item, str) for item in evaluated
        ):
            return tuple(evaluated)
        return None

    saw_assignment = False
    for node in tree.body:
        value_node: ast.AST | None = None
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "__all__":
                    value_node = node.value
                    break
        elif isinstance(node, ast.AnnAssign):
            if (
                isinstance(node.target, ast.Name)
                and node.target.id == "__all__"
                and node.value is not None
            ):
                value_node = node.value
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
    except Exception:
        return None
    exported = getattr(module, "__all__", None)
    if (
        isinstance(exported, (list, tuple))
        and all(isinstance(item, str) for item in exported)
        and exported
    ):
        return tuple(exported)
    return None


def _discover_toolkits() -> Dict[str, Tuple[str, ...]]:
    """Scan the repository for dynamic packages that expose ``__all__``."""

    base_path = Path(__file__).resolve().parent.parent
    current_package = Path(__file__).resolve().parent.name
    discovered: Dict[str, Tuple[str, ...]] = {}
    existing_keys = set(_TOOLKIT_EXPORTS)

    for entry in base_path.iterdir():
        if not entry.is_dir() or not entry.name.startswith("dynamic_"):
            continue
        if entry.name in existing_keys or entry.name == current_package:
            continue
        init_file = entry / "__init__.py"
        if not init_file.exists():
            continue
        symbols = _extract_dunder_all(entry.name, init_file)
        if symbols:
            discovered[entry.name] = symbols
    return discovered


_TOOLKIT_EXPORTS.update(_discover_toolkits())

__all__ = sorted({symbol for symbols in _TOOLKIT_EXPORTS.values() for symbol in symbols})


def _load_symbol(module_name: str, symbol: str) -> object:
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[symbol] = value
    return value


def __getattr__(name: str) -> object:
    for module_name, symbols in _TOOLKIT_EXPORTS.items():
        if name in symbols:
            return _load_symbol(module_name, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)
