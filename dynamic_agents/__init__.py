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

from importlib import import_module
from typing import TYPE_CHECKING, Any

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

_AGENT_EXPORTS = {
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
}

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle
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


def __getattr__(name: str) -> Any:
    """Lazily expose objects from the modern implementation modules."""

    if name == "run_dynamic_agent_cycle":
        module = import_module("algorithms.python.dynamic_ai_sync")
        return getattr(module, name)
    if name in _AGENT_EXPORTS:
        module = import_module("dynamic_ai")
        return getattr(module, name)
    raise AttributeError(f"module 'dynamic_agents' has no attribute {name!r}")


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(set(globals()) | set(__all__))
