from __future__ import annotations

from datetime import datetime, timezone

from algorithms.python.desk_plan_formatter import render_desk_plan
from algorithms.python.trade_logic import (
    ActivePosition,
    MarketSnapshot,
    TradeConfig,
    TradeDecision,
    TradeLogic,
    TradeSignal,
)


class StaticStrategy:
    def __init__(self, signal: TradeSignal) -> None:
        self._signal = signal

    def update(self, snapshot: MarketSnapshot) -> TradeSignal:  # pragma: no cover - simple pass-through
        return self._signal


def _build_decision() -> tuple[TradeDecision, MarketSnapshot]:
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        manual_stop_loss_pips=30.0,
        manual_take_profit_pips=60.0,
    )
    logic = TradeLogic(config=config)
    signal = TradeSignal(direction=1, confidence=0.72, votes=5, neighbors_considered=8)
    logic.strategy = StaticStrategy(signal)

    snapshot = MarketSnapshot(
        symbol="GBPUSD",
        timestamp=datetime(2024, 3, 19, 7, 0, tzinfo=timezone.utc),
        open=1.2740,
        high=1.2775,
        low=1.2730,
        close=1.2755,
        rsi_fast=55.0,
        adx_fast=21.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
        daily_high=1.2775,
        daily_low=1.2725,
        previous_daily_high=1.2790,
        previous_daily_low=1.2680,
        weekly_high=1.2840,
        weekly_low=1.2580,
        previous_week_high=1.2880,
        previous_week_low=1.2520,
        correlation_scores={"EURUSD": 0.68},
        seasonal_bias=0.45,
        seasonal_confidence=0.65,
    )
    open_positions = [
        ActivePosition(
            symbol="EURUSD",
            direction=1,
            size=0.5,
            entry_price=1.0900,
            opened_at=datetime(2024, 3, 18, 13, 0, tzinfo=timezone.utc),
        )
    ]

    decisions = logic.on_bar(snapshot, open_positions=open_positions)
    decision = next(dec for dec in decisions if dec.action == "open")
    return decision, snapshot


def test_render_desk_plan_formats_trade_details() -> None:
    decision, snapshot = _build_decision()

    plan = render_desk_plan(decision, pip_size=snapshot.pip_size)

    assert plan, "expected desk plan output"
    assert any("Lorentzian stack" in line for line in plan)
    assert any("Confidence adjusted" in line for line in plan)
    assert any("SMC context" in line for line in plan)


