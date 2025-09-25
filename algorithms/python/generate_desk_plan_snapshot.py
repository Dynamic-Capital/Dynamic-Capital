"""Generate trading desk plan snapshots from the Lorentzian trade logic."""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from .desk_plan_formatter import render_desk_plan
from .trade_logic import (
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


@dataclass(slots=True)
class Scenario:
    id: str
    config: TradeConfig
    signal: TradeSignal
    snapshot: MarketSnapshot
    open_positions: List[ActivePosition]


def _run_scenario(scenario: Scenario) -> tuple[TradeDecision, MarketSnapshot]:
    logic = TradeLogic(config=scenario.config)
    logic.strategy = StaticStrategy(scenario.signal)
    decisions = logic.on_bar(
        scenario.snapshot,
        open_positions=scenario.open_positions,
    )
    decision = next(dec for dec in decisions if dec.action == "open")
    return decision, scenario.snapshot


def _direction(decision: TradeDecision) -> str:
    if decision.direction and decision.direction > 0:
        return "long"
    if decision.direction and decision.direction < 0:
        return "short"
    return "flat"


def _price_decimals(pip_size: float | None) -> int:
    if pip_size is None or pip_size <= 0:
        return 2
    try:
        quant = Decimal(str(pip_size)).normalize()
    except InvalidOperation:
        return 2
    exponent = -quant.as_tuple().exponent
    if exponent < 0:
        exponent = 0
    return max(0, min(6, exponent))


def _round_price(value: float | None, *, pip_size: float | None) -> float | None:
    if value is None:
        return None
    decimals = _price_decimals(pip_size)
    return round(value, decimals)


def _round_confidence(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 4)


def _scenario_data(decision: TradeDecision, snapshot: MarketSnapshot) -> dict:
    plan = render_desk_plan(decision, pip_size=snapshot.pip_size)
    context = decision.context or {}
    return {
        "symbol": decision.symbol,
        "direction": _direction(decision),
        "entry": _round_price(decision.entry, pip_size=snapshot.pip_size),
        "stopLoss": _round_price(decision.stop_loss, pip_size=snapshot.pip_size),
        "takeProfit": _round_price(decision.take_profit, pip_size=snapshot.pip_size),
        "originalConfidence": _round_confidence(context.get("original_confidence")),
        "finalConfidence": _round_confidence(context.get("final_confidence")),
        "reason": decision.reason,
        "plan": plan,
    }


def build_scenarios() -> List[Scenario]:
    tz = timezone.utc

    scenarios: List[Scenario] = []

    scenarios.append(
        Scenario(
            id="fomc",
            config=TradeConfig(
                neighbors=3,
                label_lookahead=2,
                min_confidence=0.0,
                use_adr=False,
                manual_stop_loss_pips=30.0,
                manual_take_profit_pips=60.0,
                correlation_threshold=0.55,
                correlation_weight=0.5,
                max_correlation_adjustment=0.4,
                seasonal_bias_weight=0.45,
                max_seasonal_adjustment=0.25,
                smc_level_threshold_pips=18.0,
                smc_round_number_interval_pips=25.0,
            ),
            signal=TradeSignal(direction=-1, confidence=0.78, votes=9, neighbors_considered=12),
            snapshot=MarketSnapshot(
                symbol="US500",
                timestamp=datetime(2025, 3, 19, 18, 0, tzinfo=tz),
                open=5132.0,
                high=5158.5,
                low=5104.5,
                close=5120.5,
                rsi_fast=68.0,
                adx_fast=24.0,
                rsi_slow=60.5,
                adx_slow=20.0,
                pip_size=0.25,
                pip_value=5.0,
                daily_high=5158.5,
                daily_low=5096.0,
                previous_daily_high=5144.0,
                previous_daily_low=5078.5,
                weekly_high=5188.0,
                weekly_low=5020.0,
                previous_week_high=5206.0,
                previous_week_low=5008.0,
                correlation_scores={"US100": 0.82, "DXY": -0.67},
                seasonal_bias=-0.38,
                seasonal_confidence=0.6,
            ),
            open_positions=[
                ActivePosition(
                    symbol="US100",
                    direction=-1,
                    size=0.6,
                    entry_price=17980.0,
                    opened_at=datetime(2025, 3, 18, 14, 0, tzinfo=tz),
                ),
                ActivePosition(
                    symbol="DXY",
                    direction=1,
                    size=0.3,
                    entry_price=104.2,
                    opened_at=datetime(2025, 3, 18, 10, 0, tzinfo=tz),
                ),
            ],
        )
    )

    scenarios.append(
        Scenario(
            id="uk-cpi",
            config=TradeConfig(
                neighbors=3,
                label_lookahead=2,
                min_confidence=0.0,
                use_adr=False,
                manual_stop_loss_pips=28.0,
                manual_take_profit_pips=56.0,
                correlation_threshold=0.55,
                correlation_weight=0.5,
                max_correlation_adjustment=0.35,
                seasonal_bias_weight=0.4,
                max_seasonal_adjustment=0.25,
                smc_level_threshold_pips=14.0,
                smc_round_number_interval_pips=50.0,
            ),
            signal=TradeSignal(direction=-1, confidence=0.69, votes=7, neighbors_considered=10),
            snapshot=MarketSnapshot(
                symbol="GBPUSD",
                timestamp=datetime(2025, 3, 19, 7, 0, tzinfo=tz),
                open=1.2780,
                high=1.2795,
                low=1.2710,
                close=1.2732,
                rsi_fast=43.0,
                adx_fast=23.0,
                rsi_slow=46.0,
                adx_slow=18.5,
                pip_size=0.0001,
                pip_value=10.0,
                daily_high=1.2795,
                daily_low=1.2705,
                previous_daily_high=1.2830,
                previous_daily_low=1.2718,
                weekly_high=1.2890,
                weekly_low=1.2620,
                previous_week_high=1.2935,
                previous_week_low=1.2585,
                correlation_scores={"EURUSD": 0.66, "DXY": -0.63},
                seasonal_bias=-0.32,
                seasonal_confidence=0.62,
            ),
            open_positions=[
                ActivePosition(
                    symbol="EURUSD",
                    direction=1,
                    size=0.4,
                    entry_price=1.0960,
                    opened_at=datetime(2025, 3, 18, 11, 0, tzinfo=tz),
                ),
                ActivePosition(
                    symbol="DXY",
                    direction=1,
                    size=0.25,
                    entry_price=104.15,
                    opened_at=datetime(2025, 3, 18, 8, 0, tzinfo=tz),
                ),
            ],
        )
    )

    scenarios.append(
        Scenario(
            id="ecb-speeches",
            config=TradeConfig(
                neighbors=3,
                label_lookahead=2,
                min_confidence=0.0,
                use_adr=False,
                manual_stop_loss_pips=26.0,
                manual_take_profit_pips=52.0,
                correlation_threshold=0.5,
                correlation_weight=0.45,
                max_correlation_adjustment=0.3,
                seasonal_bias_weight=0.35,
                max_seasonal_adjustment=0.2,
                smc_level_threshold_pips=12.0,
                smc_round_number_interval_pips=40.0,
            ),
            signal=TradeSignal(direction=1, confidence=0.65, votes=6, neighbors_considered=9),
            snapshot=MarketSnapshot(
                symbol="EURUSD",
                timestamp=datetime(2025, 3, 20, 9, 30, tzinfo=tz),
                open=1.0915,
                high=1.0948,
                low=1.0892,
                close=1.0936,
                rsi_fast=57.0,
                adx_fast=19.5,
                rsi_slow=54.0,
                adx_slow=17.0,
                pip_size=0.0001,
                pip_value=10.0,
                daily_high=1.0948,
                daily_low=1.0888,
                previous_daily_high=1.0925,
                previous_daily_low=1.0855,
                weekly_high=1.0975,
                weekly_low=1.0790,
                previous_week_high=1.1020,
                previous_week_low=1.0765,
                correlation_scores={"EURJPY": 0.61, "DXY": -0.58},
                seasonal_bias=0.28,
                seasonal_confidence=0.58,
            ),
            open_positions=[
                ActivePosition(
                    symbol="EURJPY",
                    direction=1,
                    size=0.35,
                    entry_price=163.8,
                    opened_at=datetime(2025, 3, 19, 6, 0, tzinfo=tz),
                ),
                ActivePosition(
                    symbol="DXY",
                    direction=-1,
                    size=0.2,
                    entry_price=104.05,
                    opened_at=datetime(2025, 3, 19, 4, 0, tzinfo=tz),
                ),
            ],
        )
    )

    scenarios.append(
        Scenario(
            id="us-pmi",
            config=TradeConfig(
                neighbors=3,
                label_lookahead=2,
                min_confidence=0.0,
                use_adr=False,
                manual_stop_loss_pips=24.0,
                manual_take_profit_pips=48.0,
                correlation_threshold=0.5,
                correlation_weight=0.45,
                max_correlation_adjustment=0.35,
                seasonal_bias_weight=0.4,
                max_seasonal_adjustment=0.25,
                smc_level_threshold_pips=15.0,
                smc_round_number_interval_pips=20.0,
            ),
            signal=TradeSignal(direction=1, confidence=0.71, votes=8, neighbors_considered=11),
            snapshot=MarketSnapshot(
                symbol="XAUUSD",
                timestamp=datetime(2025, 3, 21, 13, 45, tzinfo=tz),
                open=2362.0,
                high=2374.5,
                low=2355.0,
                close=2371.2,
                rsi_fast=62.0,
                adx_fast=25.0,
                rsi_slow=58.0,
                adx_slow=21.0,
                pip_size=0.1,
                pip_value=1.0,
                daily_high=2374.5,
                daily_low=2348.0,
                previous_daily_high=2366.0,
                previous_daily_low=2332.0,
                weekly_high=2382.0,
                weekly_low=2298.0,
                previous_week_high=2394.0,
                previous_week_low=2286.0,
                correlation_scores={"WTICOUSD": 0.58, "DXY": -0.6},
                seasonal_bias=0.34,
                seasonal_confidence=0.64,
            ),
            open_positions=[
                ActivePosition(
                    symbol="WTICOUSD",
                    direction=1,
                    size=0.8,
                    entry_price=78.4,
                    opened_at=datetime(2025, 3, 20, 15, 0, tzinfo=tz),
                ),
                ActivePosition(
                    symbol="USDJPY",
                    direction=-1,
                    size=0.5,
                    entry_price=148.2,
                    opened_at=datetime(2025, 3, 20, 9, 0, tzinfo=tz),
                ),
            ],
        )
    )

    return scenarios


def generate_snapshot() -> dict:
    snapshot: dict[str, dict] = {}
    for scenario in build_scenarios():
        decision, market_snapshot = _run_scenario(scenario)
        snapshot[scenario.id] = _scenario_data(decision, market_snapshot)
    return snapshot


def main() -> None:
    data = generate_snapshot()
    root = Path(__file__).resolve().parents[2]
    target = root / "apps" / "web" / "data" / "trading-desk-plan.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=2, sort_keys=True))
    print(f"Wrote {target}")


if __name__ == "__main__":  # pragma: no cover - manual utility
    main()
