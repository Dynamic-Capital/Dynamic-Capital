"""Compatibility shim exposing the synchronous orchestration helper lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._lazy import install_lazy_module

__all__ = ["run_dynamic_agent_cycle"]

_LAZY = install_lazy_module(
    globals(), "algorithms.python.dynamic_ai_sync", __all__
)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle
