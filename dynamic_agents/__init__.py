"""Dynamic Agents public interface with lazy loading.

Downstream code historically relied on the :mod:`dynamic_agents`
namespace, but the concrete implementations now live in
:mod:`dynamic.intelligence.ai_apps`.  Importing the heavy agent stack eagerly adds a
noticeable startup penalty for lightweight scripts.  To keep backwards
compatibility *and* reduce the import overhead, this module proxies the
symbols via :func:`importlib.import_module` so objects are materialised
only when they are first accessed.  The compatibility shim also forwards the
``dynamic_crawl`` exports, allowing legacy orchestration layers that imported
the crawler through ``dynamic_agents`` to continue working without pulling in
the heavy agent stack eagerly.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = [
    "Agent",
    "AgentResult",
    "BloodAgent",
    "BloodAgentResult",
    "ChatAgentResult",
    "ChatTurn",
    "DynamicChatAgent",
    "DynamicArchitectAgent",
    "DynamicArchitectAgentResult",
    "DynamicEngineerAgent",
    "DynamicEngineerAgentResult",
    "DynamicOceanLayerAgent",
    "DynamicEpipelagicAgent",
    "DynamicMesopelagicAgent",
    "DynamicBathypelagicAgent",
    "DynamicAbyssopelagicAgent",
    "DynamicHadalpelagicAgent",
    "DynamicRecyclingAgent",
    "DynamicNFTAgent",
    "NFTAgentInsight",
    "configure_dynamic_start_agents",
    "ExecutionAgent",
    "ExecutionAgentResult",
    "get_default_execution_agent",
    "get_default_research_agent",
    "get_default_risk_agent",
    "get_dynamic_start_agents",
    "ResearchAgent",
    "ResearchAgentResult",
    "RiskAgent",
    "RiskAgentResult",
    "prime_dynamic_start_agents",
    "reset_dynamic_start_agents",
    "RecyclingAgentConfig",
    "RecyclingAgentReport",
    "OceanLayerAgentSummary",
    "SpaceAgent",
    "SpaceAgentResult",
    "TradingAgent",
    "TradingAgentResult",
    "WaveAgent",
    "WaveAgentResult",
    "run_dynamic_agent_cycle",
    "ElementAgentPersona",
    "ELEMENT_AGENTS",
    "list_element_agents",
    "iter_element_agents",
    "get_element_agent",
    "search_element_agents",
    "CrawlPlan",
    "DynamicCrawler",
    "FetchPayload",
    "FetchResult",
]

_LAZY = LazyNamespace(
    "dynamic.intelligence.ai_apps",
    __all__,
    overrides={
        "run_dynamic_agent_cycle": "algorithms.python.dynamic_ai_sync",
        "DynamicEngineerAgent": "dynamic_engineer.agent",
        "DynamicEngineerAgentResult": "dynamic_engineer.agent",
        "DynamicArchitectAgent": "dynamic_architect.agent",
        "DynamicArchitectAgentResult": "dynamic_architect.agent",
        "DynamicRecyclingAgent": "dynamic_agents.recycling",
        "DynamicNFTAgent": "dynamic_agents.nft_engine",
        "NFTAgentInsight": "dynamic_agents.nft_engine",
        "RecyclingAgentConfig": "dynamic_agents.recycling",
        "RecyclingAgentReport": "dynamic_agents.recycling",
        "DynamicOceanLayerAgent": "dynamic_agents.ocean",
        "DynamicEpipelagicAgent": "dynamic_agents.ocean",
        "DynamicMesopelagicAgent": "dynamic_agents.ocean",
        "DynamicBathypelagicAgent": "dynamic_agents.ocean",
        "DynamicAbyssopelagicAgent": "dynamic_agents.ocean",
        "DynamicHadalpelagicAgent": "dynamic_agents.ocean",
        "OceanLayerAgentSummary": "dynamic_agents.ocean",
        "ElementAgentPersona": "dynamic_agents.elements",
        "ELEMENT_AGENTS": "dynamic_agents.elements",
        "list_element_agents": "dynamic_agents.elements",
        "iter_element_agents": "dynamic_agents.elements",
        "get_element_agent": "dynamic_agents.elements",
        "search_element_agents": "dynamic_agents.elements",
        "CrawlPlan": "dynamic_crawl",
        "DynamicCrawler": "dynamic_crawl",
        "FetchPayload": "dynamic_crawl",
        "FetchResult": "dynamic_crawl",
    },
)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle
    from dynamic.intelligence.ai_apps import (
        Agent,
        AgentResult,
        BloodAgent,
        BloodAgentResult,
        ChatAgentResult,
        ChatTurn,
        DynamicChatAgent,
        configure_dynamic_start_agents,
        ExecutionAgent,
        ExecutionAgentResult,
        get_default_execution_agent,
        get_default_research_agent,
        get_default_risk_agent,
        get_dynamic_start_agents,
        ResearchAgent,
        ResearchAgentResult,
        RiskAgent,
        RiskAgentResult,
        prime_dynamic_start_agents,
        reset_dynamic_start_agents,
        SpaceAgent,
        SpaceAgentResult,
        WaveAgent,
        WaveAgentResult,
    )
    from dynamic_agents.nft_engine import (
        DynamicNFTAgent,
        NFTAgentInsight,
    )
    from dynamic_agents.recycling import (
        DynamicRecyclingAgent,
        RecyclingAgentConfig,
        RecyclingAgentReport,
    )
    from dynamic_agents.ocean import (
        DynamicOceanLayerAgent,
        DynamicEpipelagicAgent,
        DynamicMesopelagicAgent,
        DynamicBathypelagicAgent,
        DynamicAbyssopelagicAgent,
        DynamicHadalpelagicAgent,
        OceanLayerAgentSummary,
    )
    from dynamic_agents.elements import (
        ElementAgentPersona,
        ELEMENT_AGENTS,
        list_element_agents,
        iter_element_agents,
        get_element_agent,
        search_element_agents,
    )
    from dynamic_crawl import (
        CrawlPlan,
        DynamicCrawler,
        FetchPayload,
        FetchResult,
    )


def __getattr__(name: str) -> Any:
    """Lazily expose objects from the modern implementation modules."""

    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
