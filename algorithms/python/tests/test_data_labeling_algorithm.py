from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.data_labeling_algorithm import (  # noqa: E402
    AdaptiveLabelingAlgorithm,
    AdaptiveLabelingConfig,
)
from algorithms.python.trade_logic import MarketSnapshot  # noqa: E402


def _build_snapshots(prices: list[float]) -> list[MarketSnapshot]:
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    snapshots: list[MarketSnapshot] = []
    for idx, price in enumerate(prices):
        snapshots.append(
            MarketSnapshot(
                symbol="XAUUSD",
                timestamp=base + timedelta(minutes=idx * 5),
                close=price,
                rsi_fast=50.0 + idx,
                adx_fast=20.0,
                rsi_slow=45.0,
                adx_slow=18.0,
                pip_size=0.1,
                pip_value=1.0,
            )
        )
    return snapshots


def test_adaptive_labeling_algorithm_labels_snapshots() -> None:
    snapshots = _build_snapshots([100.0, 100.2, 100.8, 101.5, 102.5, 101.0])
    config = AdaptiveLabelingConfig(lookahead=2, neutral_zone_pips=0.5, volatility_window=3)
    algo = AdaptiveLabelingAlgorithm()

    labelled = algo.label(snapshots, config)

    assert labelled, "algorithm should emit labelled samples"
    first = labelled[0]
    assert "threshold_pips" in first.metadata
    assert first.metadata["lookahead"] == 2

    expected_future = snapshots[2].close
    assert first.label == (1 if expected_future > snapshots[0].close else -1)


def test_adaptive_labeling_respects_neutral_zone() -> None:
    snapshots = _build_snapshots([100.0, 100.05, 100.1, 100.15, 100.2])
    config = AdaptiveLabelingConfig(lookahead=1, neutral_zone_pips=5.0, volatility_window=2)

    labelled = AdaptiveLabelingAlgorithm().label(snapshots, config)

    assert all(sample.label == 0 for sample in labelled)


def test_dynamic_threshold_tracks_volatility() -> None:
    snapshots = _build_snapshots([100.0, 105.0, 95.0, 110.0, 90.0, 95.0])
    config = AdaptiveLabelingConfig(lookahead=1, neutral_zone_pips=1.0, volatility_window=3)
    algo = AdaptiveLabelingAlgorithm()

    labelled = algo.label(snapshots, config)
    thresholds = [sample.metadata["threshold_pips"] for sample in labelled]

    assert len(thresholds) >= 3
    assert thresholds[2] > thresholds[1] >= config.neutral_zone_pips

    distribution = AdaptiveLabelingAlgorithm.summarise_distribution(labelled)
    assert pytest.approx(sum(distribution.values()), rel=1e-6) == 1.0
