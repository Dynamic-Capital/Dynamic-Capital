from __future__ import annotations

import importlib
import types

import pytest

import dynamic_tool_kits


def test_available_toolkits_returns_read_only_mapping() -> None:
    toolkits = dynamic_tool_kits.available_toolkits()
    assert "dynamic_agents" in toolkits
    assert isinstance(toolkits, types.MappingProxyType)
    with pytest.raises(TypeError):
        toolkits["example"] = ("Example",)


def test_toolkit_symbol_sources_reports_collisions() -> None:
    sources = dynamic_tool_kits.toolkit_symbol_sources("BloodAgent")
    assert "dynamic_agents" in sources
    assert "dynamic.intelligence.ai_apps" in sources


def test_resolve_toolkit_symbol_allows_explicit_module_selection() -> None:
    ai_apps_blood_agent = dynamic_tool_kits.resolve_toolkit_symbol(
        "BloodAgent", module_name="dynamic.intelligence.ai_apps"
    )
    legacy_blood_agent = dynamic_tool_kits.BloodAgent

    assert ai_apps_blood_agent is dynamic_tool_kits.resolve_toolkit_symbol(
        "BloodAgent", module_name="dynamic.intelligence.ai_apps"
    )
    assert dynamic_tool_kits.resolve_toolkit_symbol("BloodAgent") is legacy_blood_agent
    assert ai_apps_blood_agent.__module__.startswith("dynamic.intelligence.ai_apps")


def test_toolkit_symbol_sources_unknown_symbol() -> None:
    with pytest.raises(KeyError):
        dynamic_tool_kits.toolkit_symbol_sources("__does_not_exist__")


def test_resolve_toolkit_symbol_invalid_module() -> None:
    with pytest.raises(KeyError):
        dynamic_tool_kits.resolve_toolkit_symbol(
            "BloodAgent", module_name="dynamic.non_existent"
        )


def test_dynamic_cap_theorem_toolkit_exports() -> None:
    toolkits = dynamic_tool_kits.available_toolkits()

    assert "dynamic_cap_theorem" in toolkits
    exports = set(toolkits["dynamic_cap_theorem"])
    expected = {
        "CapVector",
        "CapEvent",
        "CapContext",
        "CapAssessment",
        "DynamicCapTheorem",
    }
    assert expected.issubset(exports)
    assert (
        dynamic_tool_kits.resolve_toolkit_symbol(
            "DynamicCapTheorem", module_name="dynamic_cap_theorem"
        )
        is dynamic_tool_kits.DynamicCapTheorem
    )


def test_dynamic_ultimate_reality_toolkit_exports_engine() -> None:
    toolkits = dynamic_tool_kits.available_toolkits()

    assert "dynamic_ultimate_reality" in toolkits
    exports = set(toolkits["dynamic_ultimate_reality"])
    expected = {
        "DynamicUltimateReality",
        "NonDualContext",
        "UltimateRealitySignal",
        "UltimateRealityState",
    }
    assert expected.issubset(exports)
    assert (
        dynamic_tool_kits.resolve_toolkit_symbol(
            "DynamicUltimateReality", module_name="dynamic_ultimate_reality"
        )
        is dynamic_tool_kits.DynamicUltimateReality
    )


def test_dynamic_creative_thinking_toolkit_exports_engine() -> None:
    toolkits = dynamic_tool_kits.available_toolkits()

    assert "dynamic_creative_thinking" in toolkits
    exports = set(toolkits["dynamic_creative_thinking"])
    expected = {
        "CreativeContext",
        "CreativeFrame",
        "CreativeSignal",
        "DynamicCreativeThinking",
    }
    assert expected.issubset(exports)
    assert (
        dynamic_tool_kits.resolve_toolkit_symbol(
            "DynamicCreativeThinking", module_name="dynamic_creative_thinking"
        )
        is dynamic_tool_kits.DynamicCreativeThinking
    )


def test_available_toolkits_include_module_dunder_all_exports() -> None:
    toolkits = dynamic_tool_kits.available_toolkits()

    for module_name in ("dynamic_consciousness", "dynamic_cognition"):
        module = importlib.import_module(module_name)
        exported = getattr(module, "__all__", ())
        if not exported:
            continue
        assert set(exported).issubset(toolkits[module_name])


def test_dynamic_namespace_packages_are_discovered() -> None:
    toolkits = dynamic_tool_kits.available_toolkits()

    module_name = "dynamic.intelligence.agi"
    assert module_name in toolkits

    module = importlib.import_module(module_name)
    exported = getattr(module, "__all__", ())
    assert exported
    assert set(exported).issubset(toolkits[module_name])
