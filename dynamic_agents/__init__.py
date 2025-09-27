"""Dynamic Agents public interface.

This module re-exports the core persona agents that power Dynamic
Capital's orchestration cycle.  The concrete implementations live in
:mod:`dynamic_ai`, but several downstream consumers expect a dedicated
``dynamic_agents`` package.  Keeping this thin wrapper avoids import
errors while maintaining a single source of truth for the agent
implementations.
"""

from dynamic_ai import (
    Agent,
    AgentResult,
    ChatAgentResult,
    ChatTurn,
    DynamicChatAgent,
    ExecutionAgent,
    ExecutionAgentResult,
    ResearchAgent,
    ResearchAgentResult,
    RiskAgent,
    RiskAgentResult,
)
from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle

__all__ = [
    "Agent",
    "AgentResult",
    "ChatAgentResult",
    "ChatTurn",
    "DynamicChatAgent",
    "ExecutionAgent",
    "ExecutionAgentResult",
    "ResearchAgent",
    "ResearchAgentResult",
    "RiskAgent",
    "RiskAgentResult",
    "run_dynamic_agent_cycle",
]
