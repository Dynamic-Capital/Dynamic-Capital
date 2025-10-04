"""Benchmark the DynamicTradingAlgo over a synthetic three-month window.

This script exercises :class:`dynamic.trading.algo.trading_core.DynamicTradingAlgo`
using its paper-trading fallback connector.  For every instrument supported by
the algorithm we simulate a deterministic stream of trades covering the last
three months of daily sessions.  The resulting benchmark captures day-level
history together with aggregate profit and loss statistics (largest win/loss,
win rate, etc.).

The paper broker inside the trading algorithm relies on Python's global
``random`` module.  To keep the benchmark reproducible we derive a
cryptographic seed for every simulated trade, temporarily seed ``random`` with
that value, execute the trade, and then restore the previous RNG state.

Run the module directly to materialise ``benchmarks/results/dynamic-trading-
algo-benchmark.json``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import mean
from typing import Iterable, Iterator, Mapping


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:  # pragma: no cover - import side-effect
    sys.path.insert(0, str(REPO_ROOT))


from dynamic.trading.algo.trading_core import (
    ORDER_ACTION_BUY,
    ORDER_ACTION_SELL,
    DynamicTradingAlgo,
)


DEFAULT_HISTORY_DAYS = 90
DEFAULT_TRADES_PER_DAY = 1
DEFAULT_LOT_SIZE = 1.0
DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parent / "results" / "dynamic-trading-algo-benchmark.json"


@dataclass(slots=True)
class TradeRecord:
    """Summary of an executed trade within the benchmark."""

    symbol: str
    session_date: date
    action: str
    profit: float
    lot: float | None
    price: float | None
    retcode: int


def _deterministic_seed(symbol: str, session_date: date, trade_index: int) -> int:
    """Return a deterministic RNG seed for the trade key."""

    payload = f"{symbol}:{session_date.isoformat()}:{trade_index}".encode("utf-8")
    digest = hashlib.sha256(payload).digest()
    return int.from_bytes(digest[:8], "big", signed=False)


def _simulate_trade(
    algo: DynamicTradingAlgo,
    *,
    symbol: str,
    session_date: date,
    trade_index: int,
    lot: float,
) -> TradeRecord:
    """Execute a deterministic paper trade via ``algo``."""

    seed = _deterministic_seed(symbol, session_date, trade_index)
    previous_state = random.getstate()
    try:
        random.seed(seed)
        action = ORDER_ACTION_BUY if random.random() >= 0.5 else ORDER_ACTION_SELL
        result = algo.execute_trade({"action": action}, lot=lot, symbol=symbol)
    finally:
        random.setstate(previous_state)

    return TradeRecord(
        symbol=symbol,
        session_date=session_date,
        action=action,
        profit=round(result.profit, 2),
        lot=result.lot,
        price=result.price,
        retcode=result.retcode,
    )


def _daterange(end_date: date, days: int) -> Iterator[date]:
    for offset in range(days - 1, -1, -1):
        yield end_date - timedelta(days=offset)


def _summarise_trades(trades: Iterable[TradeRecord]) -> Mapping[str, float | int]:
    profits = [trade.profit for trade in trades]
    if not profits:
        return {
            "total_trades": 0,
            "total_profit": 0.0,
            "gross_profit": 0.0,
            "gross_loss": 0.0,
            "win_rate": 0.0,
            "largest_win": 0.0,
            "largest_loss": 0.0,
            "average_win": 0.0,
            "average_loss": 0.0,
            "profit_factor": None,
        }

    wins = [value for value in profits if value > 0]
    losses = [value for value in profits if value < 0]

    total_profit = round(sum(profits), 2)
    gross_profit = round(sum(wins), 2)
    gross_loss = round(sum(losses), 2)
    win_rate = len(wins) / len(profits) if profits else 0.0
    profit_factor = None
    if gross_loss:
        profit_factor = round(abs(gross_profit / gross_loss), 3)

    average_win = round(mean(wins), 2) if wins else 0.0
    average_loss = round(mean(losses), 2) if losses else 0.0

    return {
        "total_trades": len(profits),
        "total_profit": total_profit,
        "gross_profit": gross_profit,
        "gross_loss": gross_loss,
        "win_rate": round(win_rate, 3),
        "largest_win": round(max(profits), 2),
        "largest_loss": round(min(profits), 2),
        "average_win": average_win,
        "average_loss": average_loss,
        "profit_factor": profit_factor,
    }


def run_benchmark(
    *,
    days: int = DEFAULT_HISTORY_DAYS,
    trades_per_day: int = DEFAULT_TRADES_PER_DAY,
    lot_size: float = DEFAULT_LOT_SIZE,
) -> Mapping[str, object]:
    """Run the benchmark and return the structured report."""

    if days <= 0:
        raise ValueError("days must be positive")
    if trades_per_day <= 0:
        raise ValueError("trades_per_day must be positive")
    if lot_size <= 0:
        raise ValueError("lot_size must be positive")

    algo = DynamicTradingAlgo()
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)

    symbols = sorted(algo.instrument_profiles)
    symbol_payloads: dict[str, object] = {}
    portfolio_trades: list[TradeRecord] = []

    for symbol in symbols:
        instrument_trades: list[TradeRecord] = []
        daily_history: list[dict[str, object]] = []
        cumulative_profit = 0.0

        for session_date in _daterange(today, days):
            day_records: list[TradeRecord] = []
            for trade_index in range(trades_per_day):
                record = _simulate_trade(
                    algo,
                    symbol=symbol,
                    session_date=session_date,
                    trade_index=trade_index,
                    lot=lot_size,
                )
                instrument_trades.append(record)
                day_records.append(record)
                portfolio_trades.append(record)

            day_profit = round(sum(item.profit for item in day_records), 2)
            cumulative_profit = round(cumulative_profit + day_profit, 2)
            largest_win = round(max(item.profit for item in day_records), 2)
            largest_loss = round(min(item.profit for item in day_records), 2)
            daily_history.append(
                {
                    "date": session_date.isoformat(),
                    "profit": day_profit,
                    "cumulative_profit": cumulative_profit,
                    "trades": len(day_records),
                    "wins": sum(1 for item in day_records if item.profit > 0),
                    "losses": sum(1 for item in day_records if item.profit < 0),
                    "largest_win": largest_win,
                    "largest_loss": largest_loss,
                }
            )

        summary = _summarise_trades(instrument_trades)
        best_trade = max(instrument_trades, key=lambda item: item.profit)
        worst_trade = min(instrument_trades, key=lambda item: item.profit)

        symbol_payloads[symbol] = {
            "summary": summary,
            "history": daily_history,
            "largest_win": {
                "profit": best_trade.profit,
                "date": best_trade.session_date.isoformat(),
                "action": best_trade.action,
            },
            "largest_loss": {
                "profit": worst_trade.profit,
                "date": worst_trade.session_date.isoformat(),
                "action": worst_trade.action,
            },
        }

    portfolio_summary = _summarise_trades(portfolio_trades)
    best_portfolio_trade = max(portfolio_trades, key=lambda item: item.profit)
    worst_portfolio_trade = min(portfolio_trades, key=lambda item: item.profit)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "history_days": days,
        "trades_per_day": trades_per_day,
        "lot_size": lot_size,
        "symbols": symbol_payloads,
        "portfolio": {
            "summary": portfolio_summary,
            "largest_win": {
                "symbol": best_portfolio_trade.symbol,
                "profit": best_portfolio_trade.profit,
                "date": best_portfolio_trade.session_date.isoformat(),
                "action": best_portfolio_trade.action,
            },
            "largest_loss": {
                "symbol": worst_portfolio_trade.symbol,
                "profit": worst_portfolio_trade.profit,
                "date": worst_portfolio_trade.session_date.isoformat(),
                "action": worst_portfolio_trade.action,
            },
        },
    }

    return report


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark DynamicTradingAlgo over a rolling history window")
    parser.add_argument("--days", type=int, default=DEFAULT_HISTORY_DAYS, help="Number of calendar days to benchmark")
    parser.add_argument(
        "--trades-per-day",
        type=int,
        default=DEFAULT_TRADES_PER_DAY,
        help="Number of simulated trades per instrument each day",
    )
    parser.add_argument("--lot", type=float, default=DEFAULT_LOT_SIZE, help="Baseline lot size for simulated trades")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Destination file for the benchmark report",
    )
    return parser.parse_args(list(argv) if argv is not None else None)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    report = run_benchmark(days=args.days, trades_per_day=args.trades_per_day, lot_size=args.lot)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())
