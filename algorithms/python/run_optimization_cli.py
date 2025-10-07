"""Command-line helper to run trading stack optimisations on CSV datasets."""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Sequence

from .data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from .optimization_workflow import OptimizationPlan, optimize_trading_stack
from .trade_logic import RiskParameters, TradeConfig


def _parse_timestamp(raw: str) -> datetime:
    value = raw.strip()
    if not value:
        raise ValueError("timestamp value cannot be empty")
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    timestamp = datetime.fromisoformat(value)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    return timestamp


def _load_bars(path: Path) -> List[RawBar]:
    with path.open("r", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"timestamp", "open", "high", "low", "close"}
        missing = required.difference(reader.fieldnames or set())
        if missing:
            raise ValueError(
                f"CSV file {path} is missing required columns: {', '.join(sorted(missing))}"
            )
        bars: List[RawBar] = []
        for row in reader:
            try:
                bars.append(
                    RawBar(
                        timestamp=_parse_timestamp(row["timestamp"]),
                        open=float(row["open"]),
                        high=float(row["high"]),
                        low=float(row["low"]),
                        close=float(row["close"]),
                        volume=float(row.get("volume", "0") or 0.0),
                    )
                )
            except Exception as exc:  # pragma: no cover - defensive guardrail
                raise ValueError(f"Failed to parse row {reader.line_num}: {exc}") from exc
    if not bars:
        raise ValueError(f"CSV file {path} does not contain any rows")
    return bars


def _equity_curve_serializable(plan: OptimizationPlan) -> list[dict[str, object]]:
    curve = plan.backtest_result.performance.equity_curve
    return [
        {"timestamp": point[0].isoformat(), "equity": point[1]}
        for point in curve
    ]


def _plan_to_summary(plan: OptimizationPlan) -> dict[str, object]:
    insights = asdict(plan.insights)
    best_config = asdict(plan.best_config)
    tuned_config = asdict(plan.tuned_config)
    performance = plan.backtest_result.performance
    summary = {
        "insights": insights,
        "best_config": best_config,
        "tuned_config": tuned_config,
        "backtest": {
            "ending_equity": plan.backtest_result.ending_equity,
            "performance": {
                "total_trades": performance.total_trades,
                "wins": performance.wins,
                "losses": performance.losses,
                "hit_rate": performance.hit_rate,
                "profit_factor": performance.profit_factor,
                "max_drawdown_pct": performance.max_drawdown_pct,
                "equity_curve": _equity_curve_serializable(plan),
            },
        },
        "realtime_ready": plan.realtime_executor is not None,
    }
    return summary


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the Dynamic Capital optimisation workflow on historical bars",
    )
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to a CSV file containing timestamp, open, high, low, close columns",
    )
    parser.add_argument("--symbol", default="XAUUSD", help="Instrument symbol label")
    parser.add_argument(
        "--pip-size",
        type=float,
        default=0.1,
        help="Pip size used to normalise price deltas",
    )
    parser.add_argument(
        "--pip-value",
        type=float,
        default=1.0,
        help="Pip value for a standard lot of the instrument",
    )
    parser.add_argument(
        "--neighbors",
        type=int,
        nargs="+",
        default=[4, 6, 8],
        help="Candidate neighbour counts for the optimisation search space",
    )
    parser.add_argument(
        "--label-lookahead",
        type=int,
        nargs="+",
        default=[2, 3, 4],
        help="Label lookahead windows evaluated during optimisation",
    )
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=0.0,
        help="Minimum confidence threshold for signals",
    )
    parser.add_argument(
        "--initial-equity",
        type=float,
        default=10_000.0,
        help="Initial equity used for backtests",
    )
    parser.add_argument(
        "--max-drawdown",
        type=float,
        default=5.0,
        help="Daily drawdown guardrail applied to risk parameters (percentage)",
    )
    parser.add_argument(
        "--max-workers",
        type=int,
        help="Optional override for parallel optimisation workers (defaults to CPU-based heuristic)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional path to write the optimisation summary JSON payload",
    )
    return parser


def run(argv: Sequence[str] | None = None) -> dict[str, object]:
    parser = _build_parser()
    args = parser.parse_args(argv)

    bars = _load_bars(args.input)
    instrument = InstrumentMeta(args.symbol, pip_size=args.pip_size, pip_value=args.pip_value)
    ingestion = MarketDataIngestionJob()
    snapshots = ingestion.run(bars, instrument)
    if not snapshots:
        raise SystemExit("ingestion job produced no snapshots; ensure CSV has enough rows")

    search_space = {
        "neighbors": sorted({int(value) for value in args.neighbors}),
        "label_lookahead": sorted({int(value) for value in args.label_lookahead}),
    }

    base_config = TradeConfig(min_confidence=float(args.min_confidence))
    risk_parameters = RiskParameters(
        balance=float(args.initial_equity),
        max_daily_drawdown_pct=float(args.max_drawdown),
    )

    max_workers = None if args.max_workers is None or args.max_workers <= 0 else int(args.max_workers)

    plan = optimize_trading_stack(
        snapshots,
        search_space,
        base_config=base_config,
        risk_parameters=risk_parameters,
        initial_equity=float(args.initial_equity),
        max_workers=max_workers,
    )

    summary = _plan_to_summary(plan)

    print("Optimization summary")
    print(f"Symbol: {args.symbol}")
    print(f"Snapshots processed: {summary['insights']['snapshot_count']}")
    print(
        "Best neighbours: ",
        summary["best_config"]["neighbors"],
    )
    hit_rate = summary["backtest"]["performance"]["hit_rate"]
    print(f"Hit rate: {hit_rate * 100:.2f}%")
    print(
        "Profit factor:",
        f"{summary['backtest']['performance']['profit_factor']:.2f}",
    )
    print(
        "Max drawdown:",
        f"{summary['backtest']['performance']['max_drawdown_pct']:.2f}%",
    )

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(summary, indent=2))
        print(f"Summary written to {args.output}")

    return summary


def main(argv: Sequence[str] | None = None) -> int:
    run(argv)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

