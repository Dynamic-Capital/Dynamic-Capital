"""Compatibility shim exposing the chat persona lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._lazy import install_lazy_module

__all__ = ["ChatAgentResult", "ChatTurn", "DynamicChatAgent"]

_LAZY = install_lazy_module(globals(), "dynamic_ai.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import ChatAgentResult, ChatTurn, DynamicChatAgent
