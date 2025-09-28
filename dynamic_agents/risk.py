"""Compatibility shim exposing the risk persona lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._lazy import install_lazy_module

__all__ = ["RiskAgent", "RiskAgentResult"]

_LAZY = install_lazy_module(globals(), "dynamic_ai.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import RiskAgent, RiskAgentResult
