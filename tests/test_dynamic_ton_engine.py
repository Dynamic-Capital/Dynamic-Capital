"""Tests for the DynamicTonEngine orchestration logic."""

from __future__ import annotations

import pytest

from dynamic_ton import (
    DynamicTonEngine,
    TonAction,
    TonExecutionPlan,
    TonLiquidityPool,
    TonNetworkTelemetry,
    TonTreasuryPosture,
)


def test_liquidity_deficit_triggers_high_priority_action() -> None:
    engine = DynamicTonEngine(min_total_depth_ton=1_000_000, utilisation_ceiling=0.8)
    liquidity = [
        TonLiquidityPool(venue="STON.fi", pair="dct/ton", ton_depth=250_000, quote_depth=200_000),
        TonLiquidityPool(venue="DeDust", pair="ton/usdt", ton_depth=300_000, quote_depth=500_000),
    ]
    telemetry = TonNetworkTelemetry(ton_price_usd=2.3, bridge_latency_ms=400.0)
    treasury = TonTreasuryPosture(ton_reserve=600_000, stable_reserve=400_000, target_ton_ratio=0.55)

    plan = engine.build_plan(liquidity=liquidity, telemetry=telemetry, treasury=treasury)

    assert isinstance(plan, TonExecutionPlan)
    assert plan.has_high_priority_actions
    liquidity_actions = [action for action in plan.actions if action.category == "liquidity"]
    assert liquidity_actions, "Expected at least one liquidity action"
    assert any(action.priority == "high" for action in liquidity_actions)
    assert pytest.approx(plan.ton_allocation["liquidity"], rel=0.01) == 450_000


def test_treasury_gap_generates_accumulation_plan() -> None:
    engine = DynamicTonEngine(ratio_tolerance=0.02)
    liquidity = [TonLiquidityPool(venue="STON.fi", pair="dct/ton", ton_depth=800_000, quote_depth=600_000)]
    telemetry = TonNetworkTelemetry(ton_price_usd=2.5, bridge_latency_ms=200.0)
    treasury = TonTreasuryPosture(ton_reserve=400_000, stable_reserve=600_000, target_ton_ratio=0.6)

    plan = engine.build_plan(liquidity=liquidity, telemetry=telemetry, treasury=treasury)

    treasury_actions = [action for action in plan.actions if action.category == "treasury"]
    assert treasury_actions, "Expected treasury directives"
    accumulation = treasury_actions[0]
    assert accumulation.priority == "normal"
    assert accumulation.metadata["tonShortfall"] == pytest.approx(200_000)
    assert plan.ton_allocation["accumulate_ton"] == pytest.approx(200_000)
    assert plan.expected_ton_ratio == pytest.approx(0.6)


@pytest.mark.parametrize(
    "net_flow, expected_priority",
    [(-50_000, "normal"), (-250_000, "high")],
)
def test_net_outflows_raise_priority(net_flow: float, expected_priority: str) -> None:
    engine = DynamicTonEngine()
    liquidity = [TonLiquidityPool(venue="STON.fi", pair="ton/usdt", ton_depth=800_000, quote_depth=900_000)]
    telemetry = TonNetworkTelemetry(
        ton_price_usd=2.1,
        bridge_latency_ms=300.0,
        ton_inflow_24h=100_000,
        ton_outflow_24h=100_000 - net_flow,
    )
    treasury = TonTreasuryPosture(ton_reserve=700_000, stable_reserve=300_000, target_ton_ratio=0.7)

    plan = engine.build_plan(liquidity=liquidity, telemetry=telemetry, treasury=treasury)

    outflow_actions = [action for action in plan.actions if action.metadata and "netOutflow" in action.metadata]
    assert outflow_actions, "Expected net outflow mitigation action"
    assert outflow_actions[0].priority == expected_priority


def test_latency_alerts_and_actions_generated() -> None:
    engine = DynamicTonEngine(max_bridge_latency_ms=500.0)
    liquidity = [TonLiquidityPool(venue="DeDust", pair="ton/usdt", ton_depth=900_000, quote_depth=1_000_000)]
    telemetry = TonNetworkTelemetry(ton_price_usd=2.2, bridge_latency_ms=750.0, settlement_backlog=3)
    treasury = TonTreasuryPosture(ton_reserve=650_000, stable_reserve=350_000, target_ton_ratio=0.65)

    plan = engine.build_plan(liquidity=liquidity, telemetry=telemetry, treasury=treasury)

    infrastructure_actions = [action for action in plan.actions if action.category == "infrastructure"]
    assert infrastructure_actions, "Expected infrastructure remediation action"
    assert plan.alerts == (
        "Bridge latency exceeding threshold; queue settlements via alternative rails.",
        "3 TON settlements pending; prioritise clearing.",
    )
    assert infrastructure_actions[0].priority == "high"


def test_ton_action_priority_validation() -> None:
    with pytest.raises(ValueError):
        TonAction(category="liquidity", description="Invalid priority", priority="urgent")
