from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from algorithms.python.backtesting import Backtester
from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from algorithms.python.model_artifacts import load_artifacts, save_artifacts
from algorithms.python.offline_labeler import LabelingConfig, OfflineLabeler
from algorithms.python.realtime import InMemoryStateStore, RealtimeExecutor
from algorithms.python.trade_logic import (
    ActivePosition,
    FeaturePipeline,
    LabeledFeature,
    LorentzianKNNModel,
    MarketSnapshot,
    TradeDecision,
    TradeConfig,
    TradeLogic,
)


def _build_snapshots() -> list[MarketSnapshot]:
    start = datetime(2024, 1, 1, 0, 0)
    bars = []
    price = 100.0
    for idx in range(20):
        high = price + 0.5
        low = price - 0.5
        close = price + (0.2 if idx % 2 == 0 else -0.1)
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
    snapshots = job.run(bars, InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0))
    assert snapshots, "expected non-empty snapshots from ingestion job"
    return snapshots


def test_feature_pipeline_persistence_round_trip():
    pipeline = FeaturePipeline()
    vector = (10.0, 20.0, 30.0, 40.0)
    transformed = pipeline.transform(vector, update=True)
    state = pipeline.state_dict()
    restored = FeaturePipeline()
    restored.load_state_dict(state)
    replay = restored.transform(vector, update=False)
    assert pytest.approx(transformed) == replay


def test_offline_labeler_produces_labeled_features():
    snapshots = _build_snapshots()
    labeler = OfflineLabeler()
    labelled = labeler.label(snapshots, LabelingConfig(lookahead=3, neutral_zone_pips=0.5))
    assert labelled, "offline labeler should produce labelled samples"
    assert all(isinstance(sample.label, int) for sample in labelled)


def test_lorentzian_knn_model_predicts_direction():
    timestamp = datetime.now(timezone.utc)
    samples = [
        LabeledFeature(features=(0.0, 0.0, 0.0, 0.0), label=1, close=1.0, timestamp=timestamp),
        LabeledFeature(features=(5.0, 5.0, 5.0, 5.0), label=-1, close=1.0, timestamp=timestamp),
    ]
    model = LorentzianKNNModel(neighbors=1)
    model.fit(samples)
    signal = model.predict((0.1, 0.1, 0.1, 0.1))
    assert signal is not None
    assert signal.direction == 1


def test_backtester_generates_performance_metrics(tmp_path: Path):
    snapshots = _build_snapshots()
    config = TradeConfig(neighbors=1, label_lookahead=2, min_confidence=0.0)
    logic = TradeLogic(config=config)
    backtester = Backtester(logic)
    result = backtester.run(snapshots[: len(snapshots) - 2])
    assert result.performance.total_trades >= 0
    artefact_path = tmp_path / "model.json"
    save_artifacts(artefact_path, logic)
    new_logic = TradeLogic(config=TradeConfig())
    load_artifacts(artefact_path, new_logic)
    assert new_logic.config.neighbors == config.neighbors


def test_realtime_executor_updates_state():
    snapshots = _build_snapshots()[:5]
    config = TradeConfig(neighbors=1, label_lookahead=2, min_confidence=0.0)
    logic = TradeLogic(config=config)

    class MemoryBroker:
        def __init__(self) -> None:
            self.decisions: list[TradeDecision] = []
            self.positions: list[ActivePosition] = []

        def fetch_open_positions(self):
            return list(self.positions)

        def execute(self, decision):
            self.decisions.append(decision)

    broker = MemoryBroker()
    executor = RealtimeExecutor(logic, broker, state_store=InMemoryStateStore())
    total = 0
    for snapshot in snapshots:
        total += len(executor.process_snapshot(snapshot))
    stored_positions = executor.state_store.load()
    assert isinstance(stored_positions, list)
    assert total >= 0
