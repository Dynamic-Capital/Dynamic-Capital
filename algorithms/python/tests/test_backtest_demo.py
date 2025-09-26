from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.backtest_demo import run_mock_backtest


def test_run_mock_backtest_produces_profitable_report() -> None:
    result, analysis, report = run_mock_backtest()

    assert result.trades, "mock backtest should produce at least one trade"
    assert analysis.summary.trade_count == len(result.trades)
    assert report["net_profit"] > 0
    assert report["summary"]["trade_count"] == len(result.trades)
    assert report["summary"]["total_return_pct"] > 0
    assert report["trades"], "report should include serialised trades"
    assert len(report["trades"]) == len(result.trades)
    assert report["trades"][0]["profit"] == result.trades[0].profit
    assert report["summary_text"].startswith("Starting balance $50,000.00")
    # Ensure best/worst trades carry serialised timestamps
    first_best = report["best_trades"][0]
    assert first_best["open_time"].endswith("+00:00")
    assert report["summary"]["equity_curve"], "equity curve should be populated"
