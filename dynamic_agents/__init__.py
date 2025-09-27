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

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

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
    "SpaceAgent",
    "SpaceAgentResult",
    "TradingAgent",
    "TradingAgentResult",
    "WaveAgent",
    "WaveAgentResult",
    "run_dynamic_agent_cycle",
]

_LAZY = LazyNamespace(
    "dynamic_ai",
    __all__,
    overrides={"run_dynamic_agent_cycle": "algorithms.python.dynamic_ai_sync"},
)

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
        SpaceAgent,
        SpaceAgentResult,
        WaveAgent,
        WaveAgentResult,
    )


def __getattr__(name: str) -> Any:
    """Lazily expose objects from the modern implementation modules."""

    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
