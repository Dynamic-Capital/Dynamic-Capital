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
from collections import defaultdict
from importlib import import_module
from importlib.util import find_spec
from pathlib import Path
from types import MappingProxyType
from typing import Dict, Iterable, Iterator, Mapping, MutableMapping, Tuple

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
    "dynamic.intelligence.ai_apps": (
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
        "KimiK2Adapter",
        "KimiK2Config",
        "KimiK2PromptTemplate",
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
    "dynamic.trading.algo": (
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
    "dynamic_cognition": (
        "CognitiveAlignmentEngine",
        "CognitiveAlignmentReport",
    ),
    "dynamic_consciousness": (
        "ConsciousnessContext",
        "ConsciousnessSignal",
        "ConsciousnessState",
        "DynamicConsciousness",
    ),
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
    "dynamic_developer": (
        "DeveloperAgent",
        "DeveloperAgentResultEnvelope",
        "DeveloperBot",
        "DeveloperBotReport",
        "DeveloperKeeper",
        "DeveloperKeeperRecord",
        "DeveloperModel",
        "DeveloperRoleModel",
        "build_developer_model",
        "list_developer_agents",
        "crawl_capacity_from_lines",
        "crawl_tasks_from_markdown",
        "ensure_capacity_payload",
        "ensure_task_sequence",
        "extract_objectives",
        "summarise_backlog",
    ),
    "dynamic_dev_engine": (
        "DevelopmentBlueprint",
        "DevelopmentCapacity",
        "DevelopmentTask",
        "DynamicDev",
        "DynamicDevEngine",
        "ScheduledDevelopmentTask",
    ),
    "dynamic_effect": ("EffectImpulse", "EffectContext", "EffectFrame"),
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
    "dynamic_thinking": (
        "DynamicThinkingEngine",
        "ThinkingContext",
        "ThinkingFrame",
        "ThinkingSignal",
    ),
    "dynamic_ultimate_reality": ("NonDualContext", "UltimateRealitySignal", "UltimateRealityState"),
    "dynamic_volume": ("BookLevel", "VolumeAlert", "VolumeSnapshot", "VolumeThresholds"),
    "dynamic_wisdom": (
        "DynamicWisdomEngine",
        "WisdomContext",
        "WisdomFrame",
        "WisdomSignal",
    ),
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


def _resolve_module_init(module_name: str) -> Path | None:
    """Locate the ``__init__`` file for ``module_name`` without importing it."""

    try:
        spec = find_spec(module_name)
    except (ImportError, AttributeError, ValueError):
        return None
    if spec is None or spec.origin is None:
        return None
    origin = Path(spec.origin)
    if spec.submodule_search_locations is None:
        return origin if origin.exists() else None
    return origin


def _merge_declared_exports(exports: MutableMapping[str, Tuple[str, ...]]) -> None:
    """Augment explicit exports with any symbols declared in ``__all__``."""

    for module_name, symbols in list(exports.items()):
        init_file = _resolve_module_init(module_name)
        if init_file is None:
            continue
        module_symbols = _extract_dunder_all(module_name, init_file)
        if not module_symbols:
            continue
        ordered = dict.fromkeys((*symbols, *module_symbols))
        exports[module_name] = tuple(ordered)


def _iter_packages(package_root: Path, package_name: str) -> Iterator[Tuple[str, Path]]:
    """Yield package names rooted at ``package_root`` with their ``__init__``."""

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


def _discover_toolkits() -> Dict[str, Tuple[str, ...]]:
    """Scan the repository for dynamic packages that expose ``__all__``."""

    base_path = Path(__file__).resolve().parent.parent
    current_package = Path(__file__).resolve().parent.name
    discovered: Dict[str, Tuple[str, ...]] = {}
    existing_keys = set(_TOOLKIT_EXPORTS)

    def register(module_name: str, init_file: Path) -> None:
        if module_name in existing_keys or module_name == current_package:
            return
        symbols = _extract_dunder_all(module_name, init_file)
        if not symbols:
            return
        discovered[module_name] = symbols
        existing_keys.add(module_name)

    for entry in sorted(base_path.iterdir(), key=lambda path: path.name):
        if not entry.is_dir():
            continue
        if entry.name.startswith("dynamic_"):
            init_file = entry / "__init__.py"
            if not init_file.exists():
                continue
            register(entry.name, init_file)
            continue
        if entry.name != "dynamic":
            continue
        for module_name, init_file in _iter_packages(entry, entry.name):
            register(module_name, init_file)
    return discovered


_merge_declared_exports(_TOOLKIT_EXPORTS)
_TOOLKIT_EXPORTS.update(_discover_toolkits())


def _build_symbol_index(
    exports: Mapping[str, Tuple[str, ...]]
) -> Tuple[Dict[str, str], Dict[str, Tuple[str, ...]]]:
    """Create a quick lookup map for symbols and record any collisions."""

    symbol_to_module: Dict[str, str] = {}
    collisions: MutableMapping[str, list[str]] = defaultdict(list)

    for module_name, symbols in exports.items():
        for symbol in symbols:
            owner = symbol_to_module.get(symbol)
            if owner is None:
                symbol_to_module[symbol] = module_name
                continue
            if owner == module_name:
                continue
            owners = collisions[symbol]
            if not owners:
                owners.append(owner)
            if module_name not in owners:
                owners.append(module_name)

    return symbol_to_module, {
        name: tuple(modules) for name, modules in collisions.items()
    }


_SYMBOL_TO_MODULE, _SYMBOL_COLLISIONS = _build_symbol_index(_TOOLKIT_EXPORTS)

_HELPER_EXPORTS = (
    "available_toolkits",
    "resolve_toolkit_symbol",
    "toolkit_symbol_sources",
)

__all__ = sorted(set(_SYMBOL_TO_MODULE) | set(_HELPER_EXPORTS))


def _load_symbol(module_name: str, symbol: str) -> object:
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[symbol] = value
    return value


def __getattr__(name: str) -> object:
    module_name = _SYMBOL_TO_MODULE.get(name)
    if module_name:
        return _load_symbol(module_name, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return __all__


def available_toolkits() -> Mapping[str, Tuple[str, ...]]:
    """Return a read-only mapping of all registered toolkit exports."""

    return MappingProxyType(dict(_TOOLKIT_EXPORTS))


def toolkit_symbol_sources(name: str) -> Tuple[str, ...]:
    """Return the module(s) providing ``name`` when duplicates exist."""

    module_name = _SYMBOL_TO_MODULE.get(name)
    if module_name is None:
        raise KeyError(f"Unknown toolkit symbol: {name!r}")
    collisions = _SYMBOL_COLLISIONS.get(name)
    if not collisions:
        return (module_name,)
    ordered = tuple(dict.fromkeys((module_name, *collisions)))
    return ordered


def resolve_toolkit_symbol(name: str, module_name: str | None = None) -> object:
    """Explicitly resolve a toolkit symbol, optionally targeting a module."""

    if module_name is None:
        module_name = _SYMBOL_TO_MODULE.get(name)
        if module_name is None:
            raise AttributeError(
                f"module {__name__!r} has no attribute {name!r}"
            )
        return _load_symbol(module_name, name)

    symbols = _TOOLKIT_EXPORTS.get(module_name)
    if not symbols or name not in symbols:
        raise KeyError(
            f"Symbol {name!r} is not exported by toolkit module {module_name!r}"
        )
    return _load_symbol(module_name, name)
