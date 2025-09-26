from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.backtest_analysis import (
    analyze_backtest,
    compute_backtest_summary,
    rank_backtests,
)
from algorithms.python.backtesting import BacktestResult
from algorithms.python.trade_logic import CompletedTrade, PerformanceMetrics


def _build_equity_curve(start: datetime, values: list[float]) -> list[tuple[datetime, float]]:
    return [(start + timedelta(days=index), value) for index, value in enumerate(values)]


def _sample_backtest(ending_equity: float = 11_200.0) -> BacktestResult:
    start = datetime(2024, 1, 1, tzinfo=UTC)
    equity_curve = _build_equity_curve(start, [10_000.0, 10_400.0, 10_200.0, 11_000.0, ending_equity])
    trades = [
        CompletedTrade(
            symbol="EURUSD",
            direction=1,
            size=0.1,
            entry_price=1.0,
            exit_price=1.01,
            open_time=start,
            close_time=start + timedelta(days=1),
            profit=400.0,
            pips=40,
        ),
        CompletedTrade(
            symbol="EURUSD",
            direction=-1,
            size=0.1,
            entry_price=1.01,
            exit_price=1.015,
            open_time=start + timedelta(days=1),
            close_time=start + timedelta(days=2),
            profit=-200.0,
            pips=-20,
        ),
        CompletedTrade(
            symbol="EURUSD",
            direction=1,
            size=0.1,
            entry_price=1.0,
            exit_price=1.012,
            open_time=start + timedelta(days=2),
            close_time=start + timedelta(days=3),
            profit=800.0,
            pips=80,
        ),
    ]
    performance = PerformanceMetrics(
        total_trades=len(trades),
        wins=2,
        losses=1,
        hit_rate=2 / 3,
        profit_factor=2.0,
        max_drawdown_pct=8.5,
        equity_curve=equity_curve,
    )
    return BacktestResult(decisions=[], trades=trades, performance=performance, ending_equity=ending_equity)


def test_compute_backtest_summary_calculates_key_metrics() -> None:
    result = _sample_backtest()

    summary = compute_backtest_summary(result)

    assert summary.initial_equity == 10_000.0
    assert round(summary.total_return_pct, 2) == 12.0
    assert summary.trade_count == 3
    assert round(summary.average_trade, 2) == 333.33
    assert round(summary.expectancy, 2) == 333.33
    assert summary.profit_factor == 2.0
    assert summary.max_drawdown_pct == 8.5


def test_analyze_backtest_orders_best_and_worst_trades() -> None:
    result = _sample_backtest(ending_equity=9_200.0)
    result.trades.append(
        CompletedTrade(
            symbol="EURUSD",
            direction=-1,
            size=0.1,
            entry_price=1.015,
            exit_price=1.02,
            open_time=result.trades[-1].close_time,
            close_time=result.trades[-1].close_time + timedelta(days=1),
            profit=-2_000.0,
            pips=-200,
        )
    )
    result.performance.total_trades = len(result.trades)
    result.performance.losses = 2
    result.performance.hit_rate = 0.5
    result.performance.profit_factor = 0.6
    result.performance.max_drawdown_pct = 18.0

    analysis = analyze_backtest(result, top_trades=2)

    assert [round(trade.profit, 2) for trade in analysis.best_trades] == [800.0, 400.0]
    assert [round(trade.profit, 2) for trade in analysis.worst_trades] == [-2000.0, -200.0]
    assert any(rec.title == "Negative expectancy" for rec in analysis.recommendations)


def test_rank_backtests_orders_by_metric() -> None:
    base = _sample_backtest()
    weaker = _sample_backtest(ending_equity=10_400.0)
    stronger = _sample_backtest(ending_equity=12_000.0)

    history = [("base", base), ("weaker", weaker), ("stronger", stronger)]

    ranked = rank_backtests(history, metric="total_return_pct", top_n=2)

    assert [item.config for item in ranked] == ["stronger", "base"]

