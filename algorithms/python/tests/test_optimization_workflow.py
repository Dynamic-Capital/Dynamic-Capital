from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Sequence

import pytest

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


def test_optimize_trading_stack_requires_snapshots():
    with pytest.raises(ValueError):
        optimize_trading_stack([], {"neighbors": [1]})

