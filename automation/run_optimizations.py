"""Helper for running the optimisation workflow end-to-end.

This helper mirrors the synthetic scenario covered by the unit tests, executes
the combined review → optimise pipeline, and persists the resulting metrics so
automation flows can audit optimisation evidence without invoking the full
test suite.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from algorithms.python.optimization_workflow import run_review_and_optimize
from algorithms.python.trade_logic import TradeConfig
from dynamic_review import ReviewContext, ReviewInput


def _build_bars() -> list[RawBar]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    price = 125.0
    bars: list[RawBar] = []
    for index in range(36):
        high = price + 0.6
        low = price - 0.5
        close = price + (0.35 if index % 3 == 0 else -0.2)
        bars.append(
            RawBar(
                timestamp=start + timedelta(minutes=index * 5),
                open=price,
                high=high,
                low=low,
                close=close,
            )
        )
        price = close
    return bars


def _build_snapshots() -> Sequence[Any]:
    job = MarketDataIngestionJob()
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    bars = _build_bars()
    snapshots = job.run(bars, instrument)
    if not snapshots:
        raise RuntimeError("Expected market ingestion to yield snapshots")
    return snapshots


def _build_observations() -> Iterable[ReviewInput]:
    yield ReviewInput(
        area="Growth",
        headline="Accelerate acquisition loops",
        impact=0.7,
        urgency=0.6,
        sentiment=0.72,
        confidence=0.75,
    )
    yield ReviewInput(
        area="Operations",
        headline="Stabilise support response times",
        impact=0.65,
        urgency=0.82,
        sentiment=0.32,
        confidence=0.62,
    )
    yield ReviewInput(
        area="Research",
        headline="Validate new signal sources",
        impact=0.58,
        urgency=0.55,
        sentiment=0.6,
        confidence=0.42,
    )


def _serialise_performance(perf: Any) -> dict[str, Any]:
    return {
        "totalTrades": perf.total_trades,
        "wins": perf.wins,
        "losses": perf.losses,
        "hitRate": perf.hit_rate,
        "profitFactor": perf.profit_factor,
        "maxDrawdownPct": perf.max_drawdown_pct,
        "equityCurve": [
            {
                "timestamp": timestamp.isoformat(),
                "equity": equity,
            }
            for timestamp, equity in perf.equity_curve
        ],
    }


def _serialise_fingerprint(fingerprint: Any) -> dict[str, Any]:
    return {
        "count": fingerprint.count,
        "start": fingerprint.start.isoformat() if fingerprint.start else None,
        "end": fingerprint.end.isoformat() if fingerprint.end else None,
        "symbols": list(fingerprint.symbols),
        "contentHash": fingerprint.content_hash,
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the combined review and optimisation workflow")
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "automation" / "logs" / "optimization-run.json",
        help="Destination path for the optimisation summary (JSON)",
    )
    args = parser.parse_args(argv)

    observations = list(_build_observations())
    context = ReviewContext(mission="Expand Dynamic flywheel", cadence="Weekly", attention_minutes=45)
    snapshots = _build_snapshots()

    run_result = run_review_and_optimize(
        observations,
        context,
        snapshots,
        {"neighbors": [1, 2], "label_lookahead": [2]},
        base_config=TradeConfig(min_confidence=0.0),
    )

    plan = run_result.optimization
    backtest = plan.backtest_result
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "automation": "optimization",
        "inputs": {
            "observationCount": len(observations),
            "snapshotCount": len(snapshots),
        },
        "review": run_result.review.as_dict(),
        "optimization": {
            "insights": asdict(plan.insights),
            "bestConfig": asdict(plan.best_config),
            "tunedConfig": asdict(plan.tuned_config),
            "reusedPipeline": plan.reused_pipeline,
            "historyLength": len(plan.history),
            "fingerprint": _serialise_fingerprint(plan.fingerprint),
            "backtest": {
                "endingEquity": backtest.ending_equity,
                "performance": _serialise_performance(backtest.performance),
                "decisionCount": len(backtest.decisions),
                "tradeCount": len(backtest.trades),
            },
        },
    }

    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote optimisation summary to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
