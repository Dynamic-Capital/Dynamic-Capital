"""Tests for the ``dynamic_helpers`` lazy export surface."""

from __future__ import annotations

import importlib


def test_dynamic_helpers_exports_reference_canonical_symbols() -> None:
    dynamic_helpers = importlib.import_module("dynamic_helpers")

    agents_module = importlib.import_module("dynamic_agents")
    ai_module = importlib.import_module("dynamic.intelligence.ai_apps")
    algo_module = importlib.import_module("dynamic.trading.algo")
    bridge_module = importlib.import_module("dynamic_bridge")

    assert (
        dynamic_helpers.run_dynamic_agent_cycle
        is agents_module.run_dynamic_agent_cycle
    )

    assert (
        dynamic_helpers.calibrate_lorentzian_lobe
        is ai_module.calibrate_lorentzian_lobe
    )
    assert (
        dynamic_helpers.load_lorentzian_model is ai_module.load_lorentzian_model
    )

    assert dynamic_helpers.normalise_symbol is algo_module.normalise_symbol
    assert dynamic_helpers.ORDER_ACTION_BUY == algo_module.ORDER_ACTION_BUY
    assert dynamic_helpers.ORDER_ACTION_SELL == algo_module.ORDER_ACTION_SELL
    assert dynamic_helpers.SUCCESS_RETCODE == algo_module.SUCCESS_RETCODE

    assert (
        dynamic_helpers.create_dynamic_mt5_bridge
        is bridge_module.create_dynamic_mt5_bridge
    )


def test_dynamic_helpers_dir_reports_all_exports() -> None:
    dynamic_helpers = importlib.import_module("dynamic_helpers")

    for symbol in (
        "run_dynamic_agent_cycle",
        "calibrate_lorentzian_lobe",
        "load_lorentzian_model",
        "normalise_symbol",
        "ORDER_ACTION_BUY",
        "ORDER_ACTION_SELL",
        "SUCCESS_RETCODE",
        "create_dynamic_mt5_bridge",
    ):
        assert symbol in dir(dynamic_helpers)
