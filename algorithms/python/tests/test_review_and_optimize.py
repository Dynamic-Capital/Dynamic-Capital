from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Sequence

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from algorithms.python.optimization_workflow import (
    ReviewOptimizationRun,
    run_review_and_optimize,
)
from algorithms.python.trade_logic import MarketSnapshot, TradeConfig
from dynamic_review import ReviewContext, ReviewInput, ReviewReport


def _build_snapshots() -> Sequence[MarketSnapshot]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    price = 125.0
    bars = []
    for idx in range(36):
        high = price + 0.6
        low = price - 0.5
        close = price + (0.35 if idx % 3 == 0 else -0.2)
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
    assert snapshots, "expected market ingestion to produce snapshots"
    return snapshots


def test_run_review_and_optimize_generates_combined_cycle():
    observations = [
        ReviewInput(
            area="Growth",
            headline="Accelerate acquisition loops",
            impact=0.7,
            urgency=0.6,
            sentiment=0.72,
            confidence=0.75,
        ),
        ReviewInput(
            area="Operations",
            headline="Stabilise support response times",
            impact=0.65,
            urgency=0.82,
            sentiment=0.32,
            confidence=0.62,
        ),
        ReviewInput(
            area="Research",
            headline="Validate new signal sources",
            impact=0.58,
            urgency=0.55,
            sentiment=0.6,
            confidence=0.42,
        ),
    ]
    review_context = ReviewContext(
        mission="Expand Dynamic flywheel",
        cadence="Weekly",
        attention_minutes=45,
    )

    snapshots = _build_snapshots()

    result = run_review_and_optimize(
        observations,
        review_context,
        snapshots,
        {"neighbors": [1, 2], "label_lookahead": [2]},
        base_config=TradeConfig(min_confidence=0.0),
    )

    assert isinstance(result, ReviewOptimizationRun)
    assert isinstance(result.review, ReviewReport)
    assert result.review.health_score >= 0
    assert result.review.agenda, "review agenda should not be empty"
    assert any("Operations" in risk for risk in result.review.risks)
    assert any("Research" in follow_up for follow_up in result.review.follow_ups)

    optimization = result.optimization
    assert optimization.insights.snapshot_count == len(snapshots)
    assert optimization.best_config.neighbors in {1, 2}
    assert optimization.backtest_result.performance.total_trades >= 0


def test_run_review_and_optimize_requires_observations():
    snapshots = _build_snapshots()
    review_context = ReviewContext(
        mission="Guard treasury health",
        cadence="Monthly",
        attention_minutes=30,
    )

    with pytest.raises(ValueError):
        run_review_and_optimize(
            [],
            review_context,
            snapshots,
            {"neighbors": [1]},
            base_config=TradeConfig(),
        )
