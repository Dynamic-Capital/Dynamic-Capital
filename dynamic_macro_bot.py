"""High level bot orchestrating macro-aware prompt cycles."""

from __future__ import annotations

from typing import Mapping, Sequence

from dynamic.intelligence.ai_apps.prompt_engine import RenderedPrompt

from dynamic_macro_agent import DynamicMacroAgent
from dynamic_macro_keeper import MacroMemoryKeeper
from dynamic_macro_model import MacroContext

__all__ = ["DynamicMacroBot"]


class DynamicMacroBot:
    """Coordinate context persistence and prompt generation."""

    def __init__(
        self,
        *,
        agent: DynamicMacroAgent,
        keeper: MacroMemoryKeeper | None = None,
    ) -> None:
        self._agent = agent
        self._keeper = keeper or MacroMemoryKeeper()

    @property
    def agent(self) -> DynamicMacroAgent:
        """Return the underlying agent."""

        return self._agent

    @property
    def keeper(self) -> MacroMemoryKeeper:
        """Return the keeper maintaining historical context."""

        return self._keeper

    def run_cycle(
        self,
        macro_context: MacroContext | Mapping[str, object],
        *,
        extra_layers: Sequence[Mapping[str, object] | None] | None = None,
    ) -> RenderedPrompt:
        """Persist the context and produce a rendered prompt."""

        self._keeper.record(macro_context)
        layers = list(extra_layers or [])
        layers.append(self._keeper.to_context_layer())
        return self._agent.build_brief(macro_context, context_layers=layers)
