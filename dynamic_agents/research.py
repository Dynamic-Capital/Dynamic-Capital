"""Compatibility shim exposing the research persona lazily.

The historical automation stack imported the research agent from the
``dynamic_agents`` namespace.  The implementation now lives under
:mod:`dynamic_ai.agents`, and this wrapper keeps the import path stable
while deferring the heavy dependency graph until an attribute is
accessed.
"""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any

__all__ = ["ResearchAgent", "ResearchAgentResult"]

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import ResearchAgent, ResearchAgentResult


def __getattr__(name: str) -> Any:
    if name in __all__:
        module = import_module("dynamic_ai.agents")
        return getattr(module, name)
    raise AttributeError(f"module 'dynamic_agents.research' has no attribute {name!r}")


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(set(globals()) | set(__all__))
