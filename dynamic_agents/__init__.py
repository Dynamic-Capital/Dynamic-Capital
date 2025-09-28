"""Dynamic Agents public interface with lazy loading.

Downstream code historically relied on the :mod:`dynamic_agents`
namespace, but the concrete implementations now live in
:mod:`dynamic_ai`.  Importing the heavy agent stack eagerly adds a
noticeable startup penalty for lightweight scripts.  To keep backwards
compatibility *and* reduce the import overhead, this module proxies the
symbols via :func:`importlib.import_module` so objects are materialised
only when they are first accessed.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._lazy import install_lazy_module

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
    "SpaceAgent",
    "SpaceAgentResult",
    "TradingAgent",
    "TradingAgentResult",
    "WaveAgent",
    "WaveAgentResult",
    "run_dynamic_agent_cycle",
]

_LAZY = install_lazy_module(
    globals(),
    "dynamic_ai",
    __all__,
    overrides={
        "run_dynamic_agent_cycle": "algorithms.python.dynamic_ai_sync",
        "DynamicEngineerAgent": "dynamic_engineer.agent",
        "DynamicEngineerAgentResult": "dynamic_engineer.agent",
        "DynamicArchitectAgent": "dynamic_architect.agent",
        "DynamicArchitectAgentResult": "dynamic_architect.agent",
    },
)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle
    from dynamic_ai import (
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
