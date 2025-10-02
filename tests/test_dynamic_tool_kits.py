from __future__ import annotations

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
