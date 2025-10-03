from __future__ import annotations

import importlib

import dynamic_tool_kits


def test_dynamic_tools_exports_toolkit_symbols() -> None:
    tools = importlib.import_module("dynamic.tools")

    assert "DynamicBridgeOrchestrator" in tools.__all__
    assert tools.DynamicBridgeOrchestrator is dynamic_tool_kits.DynamicBridgeOrchestrator


def test_dynamic_tools_handles_symbol_collisions() -> None:
    tools = importlib.import_module("dynamic.tools")

    symbol = "BloodAgent"
    assert symbol in tools.__all__
    assert tools.toolkit_symbol_sources(symbol)
    assert tools.BloodAgent is dynamic_tool_kits.BloodAgent


def test_dynamic_tools_exposes_dynamic_ultimate_reality() -> None:
    tools = importlib.import_module("dynamic.tools")

    assert "DynamicUltimateReality" in tools.__all__
    assert tools.DynamicUltimateReality is dynamic_tool_kits.DynamicUltimateReality
    assert tools.NonDualContext is dynamic_tool_kits.NonDualContext
    assert tools.UltimateRealitySignal is dynamic_tool_kits.UltimateRealitySignal
    assert tools.UltimateRealityState is dynamic_tool_kits.UltimateRealityState


def test_refresh_tool_exports_synchronises_directory_listing() -> None:
    tools = importlib.import_module("dynamic.tools")

    before = set(tools.__all__)
    tools.refresh_tool_exports()
    after = set(tools.__all__)

    assert before == after
    assert sorted(after) == sorted(tools.__dir__())


def test_available_toolkits_reexport() -> None:
    tools = importlib.import_module("dynamic.tools")

    assert tools.available_toolkits() == dynamic_tool_kits.available_toolkits()
