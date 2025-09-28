"""Compatibility shim exposing the research persona lazily.

The historical automation stack imported the research agent from the
``dynamic_agents`` namespace.  The implementation now lives under
:mod:`dynamic_ai.agents`, and this wrapper keeps the import path stable
while deferring the heavy dependency graph until an attribute is
accessed.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._lazy import install_lazy_module

__all__ = ["ResearchAgent", "ResearchAgentResult"]

_LAZY = install_lazy_module(globals(), "dynamic_ai.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import ResearchAgent, ResearchAgentResult
