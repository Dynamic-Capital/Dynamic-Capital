from datetime import datetime, timedelta, timezone
from pathlib import Path

from algorithms.python.data_pipeline import InstrumentMeta, RawBar
from algorithms.python.dataset_builder import DatasetWriter
from algorithms.python.trade_logic import TradeConfig
from algorithms.python.training_workflow import (
    finalize_optimization_plan,
    label_snapshots_and_package_dataset,
    prepare_market_snapshot_dataset,
    run_hyperparameter_search,
    validate_in_staging,
)


def _build_bars(count: int = 40) -> list[RawBar]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    price = 100.0
    bars: list[RawBar] = []
    for idx in range(count):
        high = price + 0.4
        low = price - 0.4
        close = price + (0.25 if idx % 2 == 0 else -0.15)
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
    return bars


def test_prepare_market_snapshot_dataset(tmp_path: Path):
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    result = prepare_market_snapshot_dataset(
        _build_bars(),
        instrument,
        snapshot_path=tmp_path / "snapshots.csv",
    )
    assert result.snapshots
    assert result.snapshot_path is not None and result.snapshot_path.exists()
    assert result.metadata_path is not None and result.metadata_path.exists()
    assert result.metadata["symbol"] == instrument.symbol
    assert result.metadata["count"] == len(result.snapshots)


def test_label_snapshots_and_package_dataset(tmp_path: Path):
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    prepared = prepare_market_snapshot_dataset(_build_bars(), instrument)
    dataset_dir = tmp_path / "dataset"
    writer = DatasetWriter(dataset_dir, file_format="json")
    result = label_snapshots_and_package_dataset(
        prepared.snapshots,
        dataset_dir,
        metadata={"source": "unit-test"},
        writer=writer,
        pipeline_state_path=tmp_path / "pipeline_state.json",
    )
    assert result.partitions["train"] or result.partitions["validation"]
    assert result.state_path is not None and result.state_path.exists()
    assert "pipeline" in result.pipeline_state


def test_run_hyperparameter_search_returns_best_config(tmp_path: Path):
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    prepared = prepare_market_snapshot_dataset(_build_bars(), instrument)
    writer = DatasetWriter(tmp_path / "dataset", file_format="json")
    labelled = label_snapshots_and_package_dataset(
        prepared.snapshots,
        tmp_path / "dataset",
        writer=writer,
        pipeline_state_path=tmp_path / "pipeline.json",
    )
    search_result = run_hyperparameter_search(
        prepared.snapshots,
        {"neighbors": [1, 2]},
        base_config=TradeConfig(min_confidence=0.0),
        pipeline_state=labelled.pipeline_state["pipeline"],
    )
    assert search_result.best_config.neighbors in {1, 2}
    assert search_result.history


def test_finalize_and_validate_workflow(tmp_path: Path):
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    bars = _build_bars()
    prepared = prepare_market_snapshot_dataset(bars, instrument)
    plan = finalize_optimization_plan(
        prepared.snapshots,
        {"neighbors": [1], "label_lookahead": [2]},
        base_config=TradeConfig(min_confidence=0.0),
    )
    validation = validate_in_staging(plan, prepared.snapshots[:10])
    assert validation.backtest.performance.total_trades >= 0
    assert validation.decisions_processed >= 0
