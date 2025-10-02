"""Convenience accessors for the macro-aware dynamic stack."""

from __future__ import annotations

from dynamic_macro_agent import DynamicMacroAgent
from dynamic_macro_bot import DynamicMacroBot
from dynamic_macro_builder import build_macro_agent, build_macro_bot, build_macro_engine
from dynamic_macro_engine import DynamicMacroEngine, build_default_macro_templates
from dynamic_macro_helper import (
    ensure_macro_signals,
    format_objectives,
    select_top_signals,
    summarise_signals,
)
from dynamic_macro_keeper import MacroMemoryKeeper
from dynamic_macro_model import MacroContext, MacroSignal
from dynamic_macro_crawler import collect_macro_pages, gather_macro_pages

__all__ = [
    "DynamicMacroAgent",
    "DynamicMacroBot",
    "DynamicMacroEngine",
    "MacroContext",
    "MacroSignal",
    "MacroMemoryKeeper",
    "build_macro_engine",
    "build_macro_agent",
    "build_macro_bot",
    "build_default_macro_templates",
    "ensure_macro_signals",
    "select_top_signals",
    "summarise_signals",
    "format_objectives",
    "gather_macro_pages",
    "collect_macro_pages",
]
