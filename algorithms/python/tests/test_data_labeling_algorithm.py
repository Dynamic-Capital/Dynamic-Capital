from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from typing import Iterable, Mapping

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.data_labeling_algorithm import (  # noqa: E402
    AdaptiveLabelingConfig,
    DynamicAdaptiveLabelingAlgorithm,
    LiveLabelSyncService,
    OnlineAdaptiveLabeler,
)
from algorithms.python.trade_logic import LabeledFeature, MarketSnapshot  # noqa: E402


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
    algo = DynamicAdaptiveLabelingAlgorithm()

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

    labelled = DynamicAdaptiveLabelingAlgorithm().label(snapshots, config)

    assert all(sample.label == 0 for sample in labelled)


def test_dynamic_threshold_tracks_volatility() -> None:
    snapshots = _build_snapshots([100.0, 105.0, 95.0, 110.0, 90.0, 95.0])
    config = AdaptiveLabelingConfig(lookahead=1, neutral_zone_pips=1.0, volatility_window=3)
    algo = DynamicAdaptiveLabelingAlgorithm()

    labelled = algo.label(snapshots, config)
    thresholds = [sample.metadata["threshold_pips"] for sample in labelled]

    assert len(thresholds) >= 3
    assert thresholds[2] > thresholds[1] >= config.neutral_zone_pips

    distribution = DynamicAdaptiveLabelingAlgorithm.summarise_distribution(labelled)
    assert pytest.approx(sum(distribution.values()), rel=1e-6) == 1.0


def test_online_labeler_matches_offline_labels() -> None:
    snapshots = _build_snapshots([100.0, 100.4, 100.9, 101.6, 102.2, 101.8, 103.0])
    config = AdaptiveLabelingConfig(lookahead=2, neutral_zone_pips=0.5, volatility_window=4)

    offline = DynamicAdaptiveLabelingAlgorithm().label(snapshots, config)
    online = OnlineAdaptiveLabeler(config=config)

    streamed: list[LabeledFeature] = []
    for snapshot in snapshots:
        streamed.extend(online.push(snapshot))

    assert streamed
    assert len(streamed) == len(offline)

    for offline_sample, online_sample in zip(offline, streamed):
        assert offline_sample.label == online_sample.label
        assert offline_sample.metadata["symbol"] == online_sample.metadata["symbol"]
        assert offline_sample.metadata["lookahead_target"] == online_sample.metadata["lookahead_target"]
        assert offline_sample.metadata["threshold_pips"] == pytest.approx(
            online_sample.metadata["threshold_pips"]
        )


def test_live_label_sync_service_persists_rows() -> None:
    class _RecordingWriter:
        def __init__(self) -> None:
            self.rows: list[dict] = []

        def upsert(self, rows: Iterable[Mapping[str, object]]) -> int:
            payload = list(rows)
            self.rows.extend(payload)
            return len(payload)

    snapshots = _build_snapshots([100.0, 100.4, 100.9, 101.6, 102.2])
    config = AdaptiveLabelingConfig(lookahead=1, neutral_zone_pips=0.3, volatility_window=3)
    labelled = DynamicAdaptiveLabelingAlgorithm().label(snapshots, config)
    writer = _RecordingWriter()
    synced_at = datetime(2024, 6, 1, 12, 0, tzinfo=timezone.utc)
    service = LiveLabelSyncService(writer, clock=lambda: synced_at)

    count = service.sync(labelled[:2])

    assert count == 2
    assert len(writer.rows) == 2
    row = writer.rows[0]
    assert row["symbol"] == snapshots[0].symbol
    assert row["label"] in {-1, 0, 1}
    assert row["synced_at"] == synced_at
    assert row["source_timestamp"].tzinfo is not None
    assert isinstance(row["features"], list)
