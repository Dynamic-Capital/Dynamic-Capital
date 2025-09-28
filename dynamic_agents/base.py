"""Compatibility shim exposing shared agent contracts lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._lazy import install_lazy_module

__all__ = ["Agent", "AgentResult"]

_LAZY = install_lazy_module(globals(), "dynamic_ai.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import Agent, AgentResult
