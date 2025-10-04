from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Sequence
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from algorithms.python.optimization_workflow import (
    OptimizationPlan,
    optimize_trading_stack,
)
from algorithms.python.realtime import InMemoryStateStore
from algorithms.python.trade_logic import MarketSnapshot, RiskParameters, TradeConfig


def _build_snapshots() -> Sequence[MarketSnapshot]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    bars = []
    price = 100.0
    for idx in range(30):
        high = price + 0.4
        low = price - 0.4
        close = price + (0.25 if idx % 2 == 0 else -0.15)
        bars.append(
            RawBar(
                timestamp=start + timedelta(minutes=idx * 5),
                open=price,
                high=high,
                low=low,
                close=close,
            )
        )
        price = close
    job = MarketDataIngestionJob()
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    snapshots = job.run(bars, instrument)
    assert snapshots, "expected ingestion job to return snapshots"
    return snapshots


class MemoryBroker:
    def __init__(self) -> None:
        self.decisions = []
        self.positions = []

    def fetch_open_positions(self):
        return list(self.positions)

    def execute(self, decision):
        self.decisions.append(decision)


def test_optimize_trading_stack_produces_plan():
    snapshots = _build_snapshots()
    search_space = {"neighbors": [1, 2], "label_lookahead": [2]}
    broker = MemoryBroker()
    plan = optimize_trading_stack(
        snapshots,
        search_space,
        base_config=TradeConfig(min_confidence=0.0),
        risk_parameters=RiskParameters(max_daily_drawdown_pct=None),
        broker=broker,
        state_store=InMemoryStateStore(),
    )

    assert isinstance(plan, OptimizationPlan)
    assert plan.insights.snapshot_count == len(snapshots)
    assert "type" in plan.pipeline_state
    assert plan.best_config.neighbors in {1, 2}
    assert plan.backtest_result.performance.total_trades >= 0
    assert plan.risk_manager.params.max_daily_drawdown_pct == pytest.approx(5.0)

    assert plan.realtime_executor is not None
    first_decisions = plan.realtime_executor.process_snapshot(snapshots[0])
    assert isinstance(first_decisions, list)

    # Ensure pipeline state can be reused for persistence workflows
    pipeline_state = plan.pipeline_state
    restored_plan = optimize_trading_stack(
        snapshots[:10],
        {"neighbors": [plan.best_config.neighbors]},
        base_config=plan.best_config,
        risk_parameters=plan.risk_manager.params,
    )
    assert restored_plan.pipeline_state["type"] == pipeline_state["type"]


def test_optimize_trading_stack_reuses_pipeline_when_fingerprint_matches():
    snapshots = _build_snapshots()
    search_space = {"neighbors": [1], "label_lookahead": [2]}

    baseline = optimize_trading_stack(snapshots, search_space)

    follow_up = optimize_trading_stack(
        snapshots,
        search_space,
        previous_plan=baseline,
    )

    assert follow_up.reused_pipeline is True
    assert follow_up.fingerprint == baseline.fingerprint
    assert follow_up.pipeline_state == baseline.pipeline_state


def test_optimize_trading_stack_requires_snapshots():
    with pytest.raises(ValueError):
        optimize_trading_stack([], {"neighbors": [1]})


def test_optimize_trading_stack_aligns_adr_tuning_with_live_logic():
    snapshots = _build_snapshots()
    base_config = TradeConfig(
        use_adr=True,
        manual_stop_loss_pips=25.0,
        manual_take_profit_pips=55.0,
        adr_stop_loss_factor=0.5,
        adr_take_profit_factor=1.1,
    )

    plan = optimize_trading_stack(
        snapshots,
        {"neighbors": [1]},
        base_config=base_config,
    )

    tuned = plan.tuned_config
    assert tuned.use_adr
    assert plan.insights.average_range_pips is not None

    range_pips = plan.insights.average_range_pips
    assert tuned.manual_stop_loss_pips == pytest.approx(
        tuned.adr_stop_loss_factor * range_pips, rel=1e-3
    )
    assert tuned.manual_take_profit_pips == pytest.approx(
        tuned.adr_take_profit_factor * range_pips, rel=1e-3
    )

    base_rr = base_config.manual_take_profit_pips / base_config.manual_stop_loss_pips
    tuned_rr = tuned.adr_take_profit_factor / tuned.adr_stop_loss_factor
    assert tuned_rr == pytest.approx(base_rr, rel=1e-3)
    assert tuned.adr_stop_loss_factor >= base_config.adr_stop_loss_factor
    assert tuned.manual_stop_loss_pips >= base_config.manual_stop_loss_pips

