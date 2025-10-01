"""Compatibility shim exposing the research persona lazily.

The historical automation stack imported the research agent from the
``dynamic_agents`` namespace.  The implementation now lives under
:mod:`dynamic.intelligence.ai_apps.agents`, and this wrapper keeps the import path stable
while deferring the heavy dependency graph until an attribute is
accessed.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = ["ResearchAgent", "ResearchAgentResult"]

_LAZY = LazyNamespace("dynamic.intelligence.ai_apps.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic.intelligence.ai_apps.agents import ResearchAgent, ResearchAgentResult


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
