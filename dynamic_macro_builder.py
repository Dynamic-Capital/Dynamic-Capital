"""Factory helpers for constructing macro aware engines and agents."""

from __future__ import annotations

from typing import Iterable, Mapping

from dynamic_macro_engine import DynamicMacroEngine, build_default_macro_templates
from dynamic_macro_agent import DynamicMacroAgent
from dynamic_macro_bot import DynamicMacroBot
from dynamic_macro_keeper import MacroMemoryKeeper

__all__ = [
    "build_macro_engine",
    "build_macro_agent",
    "build_macro_bot",
]


def build_macro_engine(
    *,
    templates: Iterable = (),
    base_context: Mapping[str, object] | None = None,
    macro_limit: int = 4,
) -> DynamicMacroEngine:
    """Create a :class:`DynamicMacroEngine` with optional overrides."""

    if templates:
        template_tuple = tuple(templates)
    else:
        template_tuple = build_default_macro_templates()
    return DynamicMacroEngine(
        templates=template_tuple,
        base_context=base_context,
        macro_limit=macro_limit,
    )


def build_macro_agent(
    *,
    engine: DynamicMacroEngine | None = None,
    template_name: str = "macro_brief",
    default_persona: str = "Macro Strategist",
) -> "DynamicMacroAgent":
    """Construct a :class:`DynamicMacroAgent` bound to an engine."""

    engine = engine or build_macro_engine()
    return DynamicMacroAgent(engine=engine, template_name=template_name, default_persona=default_persona)


def build_macro_bot(
    *,
    agent: DynamicMacroAgent | None = None,
    engine: DynamicMacroEngine | None = None,
    keeper: MacroMemoryKeeper | None = None,
    history: int = 5,
) -> DynamicMacroBot:
    """Construct a macro-aware bot with optional persistent memory."""

    if agent is None:
        engine = engine or build_macro_engine()
        agent = build_macro_agent(engine=engine)
    if keeper is None:
        keeper = MacroMemoryKeeper(max_history=history)
    return DynamicMacroBot(agent=agent, keeper=keeper)
