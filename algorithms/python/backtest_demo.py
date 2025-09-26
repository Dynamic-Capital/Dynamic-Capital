"""Utility to backtest the Lorentzian k-NN strategy on synthetic data.

This module stitches together the existing ingestion, trading, and analysis
pipelines so we can quickly demonstrate how the trading logic behaves in a
controlled environment.  The synthetic market data is intentionally simple –
we only need enough structure for the strategy to generate trades – which makes
it ideal for CI environments or documentation examples where real market data
is not required.

The entry point :func:`run_mock_backtest` creates a set of mock price bars,
feeds them through :class:`~algorithms.python.data_pipeline.MarketDataIngestionJob`
to produce :class:`~algorithms.python.trade_logic.MarketSnapshot` rows, and then
replays them through the standard :class:`~algorithms.python.backtesting.Backtester`.
The resulting :class:`~algorithms.python.backtest_analysis.BacktestAnalysis`
object is serialised into a JSON-friendly report containing both numeric metrics
and a concise human readable summary.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, List, Sequence

from .backtest_analysis import BacktestAnalysis, analyze_backtest
from .backtesting import BacktestResult, Backtester
from .data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from .trade_logic import (
    CompletedTrade,
    RiskManager,
    RiskParameters,
    TradeConfig,
    TradeLogic,
)

MOCK_SYMBOL = "XAUUSD"


def _mock_price_series(
    *,
    start: datetime,
    bars: int,
    base_price: float,
    bullish_step: float,
    bearish_step: float,
) -> List[RawBar]:
    """Generate a deterministic zig-zag series of OHLC bars.

    The shape mirrors the helper used in the unit tests so the Lorentzian k-NN
    model receives a mix of bullish and bearish sequences.  This helps the
    strategy accumulate labelled samples quickly without requiring external
    market data.
    """

    history: List[RawBar] = []
    price = base_price
    for index in range(bars):
        # Bias the sequence to trend higher while still including periodic pullbacks.
        cycle = index % 6
        if cycle in (0, 1, 2, 4):
            delta = bullish_step
        else:
            delta = -bearish_step
        close = price + delta
        high = max(price, close) + bullish_step * 0.5
        low = min(price, close) - bearish_step * 0.5
        history.append(
            RawBar(
                timestamp=start + timedelta(minutes=index * 5),
                open=price,
                high=high,
                low=low,
                close=close,
            )
        )
        price = close
    return history


def _build_snapshots(series: Sequence[RawBar]) -> List["MarketSnapshot"]:
    job = MarketDataIngestionJob()
    instrument = InstrumentMeta(symbol=MOCK_SYMBOL, pip_size=0.1, pip_value=1.0)
    return job.run(series, instrument)


def run_mock_backtest(
    *,
    initial_equity: float = 50_000.0,
    bars: int = 120,
    label_lookahead: int = 3,
) -> tuple[BacktestResult, BacktestAnalysis, Dict[str, Any]]:
    """Execute a backtest on synthetic data and return structured results.

    Parameters
    ----------
    initial_equity:
        The mock account balance used by both the risk manager and backtester.
    bars:
        Number of five-minute candles to synthesize for the demo.
    label_lookahead:
        Controls how far forward price action is examined when auto-labelling
        samples for the Lorentzian k-NN model.  The backtest stops ``label_lookahead``
        bars before the end of the series to avoid peeking into the future.
    """

    if bars <= label_lookahead:
        raise ValueError("bars must be greater than label_lookahead to run a backtest")

    synthetic_bars = _mock_price_series(
        start=datetime(2024, 1, 1, tzinfo=UTC),
        bars=bars,
        base_price=1_950.0,
        bullish_step=1.4,
        bearish_step=0.9,
    )
    snapshots = _build_snapshots(synthetic_bars)

    config = TradeConfig(
        neighbors=1,
        label_lookahead=label_lookahead,
        min_confidence=0.0,
        manual_stop_loss_pips=25.0,
        manual_take_profit_pips=45.0,
        break_even_pips=8.0,
        use_adr=False,
    )
    risk_params = RiskParameters(balance=initial_equity, risk_per_trade=0.005)
    logic = TradeLogic(config=config, risk=RiskManager(risk_params))
    backtester = Backtester(logic, initial_equity=initial_equity)

    cutoff = len(snapshots) - label_lookahead if label_lookahead else len(snapshots)
    result = backtester.run(snapshots[:cutoff])
    analysis = analyze_backtest(result, initial_equity=initial_equity, top_trades=5)

    report = _serialise_report(analysis)
    report.update(
        {
            "initial_equity": initial_equity,
            "ending_equity": analysis.summary.ending_equity,
            "net_profit": analysis.summary.ending_equity - initial_equity,
        }
    )
    report["summary_text"] = _format_summary_text(report)
    return result, analysis, report


def _serialise_report(analysis: BacktestAnalysis) -> Dict[str, Any]:
    summary = analysis.summary
    summary_dict = asdict(summary)
    summary_dict["equity_curve"] = [
        {"timestamp": timestamp.isoformat(), "equity": equity}
        for timestamp, equity in summary.equity_curve
    ]

    def _serialise_trade(trade: CompletedTrade) -> Dict[str, Any]:
        return {
            "symbol": trade.symbol,
            "direction": trade.direction,
            "size": trade.size,
            "entry_price": trade.entry_price,
            "exit_price": trade.exit_price,
            "profit": trade.profit,
            "pips": trade.pips,
            "open_time": trade.open_time.isoformat(),
            "close_time": trade.close_time.isoformat(),
            "metadata": dict(trade.metadata),
        }

    serialised_trades = [_serialise_trade(trade) for trade in analysis.trades]

    return {
        "summary": summary_dict,
        "trades": serialised_trades,
        "best_trades": [_serialise_trade(trade) for trade in analysis.best_trades],
        "worst_trades": [_serialise_trade(trade) for trade in analysis.worst_trades],
        "recommendations": [asdict(rec) for rec in analysis.recommendations],
    }


def _format_summary_text(report: Dict[str, Any]) -> str:
    summary = report["summary"]
    total_return = summary["total_return_pct"]
    win_rate = summary["win_rate"] * 100
    expectancy = summary["expectancy"]
    trade_count = summary["trade_count"]
    net_profit = report["net_profit"]
    initial_equity = report["initial_equity"]
    ending_equity = report["ending_equity"]
    return (
        f"Starting balance ${initial_equity:,.2f} grew to ${ending_equity:,.2f} "
        f"({total_return:.2f}% total return). "
        f"Executed {trade_count} trades with a win rate of {win_rate:.1f}% "
        f"and an expectancy of ${expectancy:.2f} per trade. "
        f"Net profit: ${net_profit:,.2f}."
    )


def main() -> None:
    """Run the mock backtest and print a JSON report to stdout."""

    _, _, report = run_mock_backtest()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":  # pragma: no cover - CLI convenience
    main()
