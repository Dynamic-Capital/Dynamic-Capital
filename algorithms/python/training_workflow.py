"""High-level helpers that execute the recommended training workflow."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from .backtesting import Backtester, BacktestResult
from .data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from .dataset_builder import DatasetSplitMetadata, DatasetWriter
from .hyperparameter_search import HyperparameterSearch
from .offline_labeler import LabelingConfig, OfflineLabeler
from .optimization_workflow import OptimizationPlan, optimize_trading_stack
from .realtime import HealthMonitor, InMemoryStateStore, RealtimeExecutor, StateStore
from .trade_logic import LabeledFeature, MarketSnapshot, RiskParameters, TradeConfig


@dataclass(slots=True)
class PreparedSnapshotDataset:
    """Result of running :func:`prepare_market_snapshot_dataset`."""

    snapshots: List[MarketSnapshot]
    instrument: InstrumentMeta
    metadata: Dict[str, object]
    snapshot_path: Optional[Path]
    metadata_path: Optional[Path]


@dataclass(slots=True)
class LabelledDatasetSplits:
    """Payload produced by :func:`label_snapshots_and_package_dataset`."""

    labelled: List[LabeledFeature]
    partitions: Dict[str, DatasetSplitMetadata]
    pipeline_state: Dict[str, object]
    dataset_dir: Path
    state_path: Optional[Path]


@dataclass(slots=True)
class HyperparameterSearchResult:
    """Summary of :func:`run_hyperparameter_search`."""

    best_config: TradeConfig
    best_result: BacktestResult
    history: List[Tuple[TradeConfig, BacktestResult]]


@dataclass(slots=True)
class StagingValidationResult:
    """Outcome of :func:`validate_in_staging`."""

    backtest: BacktestResult
    realtime_executor: RealtimeExecutor
    decisions_processed: int
    health_events: List[Tuple[str, datetime, Dict[str, object]]]


def _default_metadata_path(snapshot_path: Path) -> Path:
    return snapshot_path.with_suffix(snapshot_path.suffix + ".metadata.json")


def prepare_market_snapshot_dataset(
    bars: Iterable[RawBar],
    instrument: InstrumentMeta,
    *,
    job: Optional[MarketDataIngestionJob] = None,
    snapshot_path: Optional[Path] = None,
    metadata_path: Optional[Path] = None,
) -> PreparedSnapshotDataset:
    """Run the ingestion job and optionally persist the resulting snapshots."""

    ingestion_job = job or MarketDataIngestionJob()
    snapshots = ingestion_job.run(bars, instrument)
    if not snapshots:
        raise ValueError("ingestion job returned no snapshots")

    saved_snapshot_path: Optional[Path] = None
    saved_metadata_path: Optional[Path] = None
    if snapshot_path is not None:
        ingestion_job.save_csv(snapshots, snapshot_path)
        saved_snapshot_path = snapshot_path
        if metadata_path is None:
            metadata_path = _default_metadata_path(snapshot_path)

    metadata: Dict[str, object] = {
        "symbol": instrument.symbol,
        "count": len(snapshots),
        "start": snapshots[0].timestamp.isoformat(),
        "end": snapshots[-1].timestamp.isoformat(),
        "rsi_periods": {
            "fast": ingestion_job.rsi_fast,
            "slow": ingestion_job.rsi_slow,
        },
        "adx_periods": {
            "fast": ingestion_job.adx_fast,
            "slow": ingestion_job.adx_slow,
        },
    }

    if metadata_path is not None:
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_path.write_text(json.dumps(metadata, indent=2))
        saved_metadata_path = metadata_path

    return PreparedSnapshotDataset(
        snapshots=snapshots,
        instrument=instrument,
        metadata=metadata,
        snapshot_path=saved_snapshot_path,
        metadata_path=saved_metadata_path,
    )


def label_snapshots_and_package_dataset(
    snapshots: Sequence[MarketSnapshot],
    dataset_dir: Path,
    *,
    label_config: Optional[LabelingConfig] = None,
    writer: Optional[DatasetWriter] = None,
    pipeline_state_path: Optional[Path] = None,
    metadata: Optional[Dict[str, object]] = None,
) -> LabelledDatasetSplits:
    """Label snapshots and materialise deterministic dataset splits."""

    if not snapshots:
        raise ValueError("snapshots sequence is empty")

    labeler = OfflineLabeler()
    labelled = labeler.label(snapshots, label_config)
    if not labelled:
        raise ValueError("offline labeler produced no samples")

    dataset_dir.mkdir(parents=True, exist_ok=True)
    dataset_writer = writer or DatasetWriter(dataset_dir, file_format="parquet")
    partitions = dataset_writer.write(labelled, metadata=metadata or {})

    pipeline_state = labeler.state_dict()
    saved_state_path: Optional[Path] = None
    if pipeline_state_path is not None:
        pipeline_state_path.parent.mkdir(parents=True, exist_ok=True)
        pipeline_state_path.write_text(json.dumps(pipeline_state, indent=2))
        saved_state_path = pipeline_state_path

    return LabelledDatasetSplits(
        labelled=labelled,
        partitions=partitions,
        pipeline_state=pipeline_state,
        dataset_dir=dataset_dir,
        state_path=saved_state_path,
    )


def run_hyperparameter_search(
    snapshots: Sequence[MarketSnapshot],
    search_space: Mapping[str, Iterable],
    *,
    base_config: Optional[TradeConfig] = None,
    scoring: Optional[Callable[[BacktestResult], float]] = None,
    initial_equity: float = 10_000.0,
    pipeline_state: Optional[Dict[str, object]] = None,
) -> HyperparameterSearchResult:
    """Execute a grid search around :class:`TradeLogic`."""

    if not snapshots:
        raise ValueError("snapshots must be non-empty")
    if not search_space:
        raise ValueError("search_space must contain at least one dimension")

    search = HyperparameterSearch(
        snapshots,
        dict(search_space),
        base_config=base_config,
        scoring=scoring,
        initial_equity=initial_equity,
        pipeline_state=pipeline_state,
    )
    best_config, best_result, history = search.run()
    return HyperparameterSearchResult(
        best_config=best_config,
        best_result=best_result,
        history=history,
    )


def finalize_optimization_plan(
    snapshots: Sequence[MarketSnapshot],
    search_space: Mapping[str, Iterable],
    *,
    base_config: Optional[TradeConfig] = None,
    risk_parameters: Optional[RiskParameters] = None,
    scoring: Optional[Callable[[BacktestResult], float]] = None,
    initial_equity: float = 10_000.0,
    broker: Optional[object] = None,
    state_store: Optional[StateStore] = None,
    health_monitor: Optional[HealthMonitor] = None,
) -> OptimizationPlan:
    """Wrapper around :func:`optimize_trading_stack` that mirrors the runbook."""

    return optimize_trading_stack(
        snapshots,
        search_space,
        base_config=base_config,
        risk_parameters=risk_parameters,
        scoring=scoring,
        initial_equity=initial_equity,
        broker=broker,
        state_store=state_store,
        health_monitor=health_monitor,
    )


def validate_in_staging(
    plan: OptimizationPlan,
    snapshots: Sequence[MarketSnapshot],
    *,
    state_store: Optional[StateStore] = None,
    health_monitor: Optional[HealthMonitor] = None,
) -> StagingValidationResult:
    """Replay the plan in backtesting and staging contexts."""

    if not snapshots:
        raise ValueError("snapshots must be provided for staging validation")

    logic = plan.trade_logic
    backtester = Backtester(logic, initial_equity=plan.backtest_result.ending_equity)
    backtest = backtester.run(snapshots)

    executor = plan.realtime_executor
    if executor is None:
        state_store = state_store or InMemoryStateStore()

        class _MemoryBroker:
            def __init__(self) -> None:
                self.decisions: List[object] = []

            def fetch_open_positions(self) -> List[object]:  # pragma: no cover - trivial getter
                return []

            def execute(self, decision: object) -> None:
                self.decisions.append(decision)

        executor = RealtimeExecutor(
            logic,
            _MemoryBroker(),
            state_store=state_store,
            health_monitor=health_monitor,
        )

    decisions_processed = 0
    health_events: List[Tuple[str, datetime, Dict[str, object]]] = []

    monitor = health_monitor or executor.health_monitor
    captured_callback: Optional[Callable[..., object]] = None
    original_record_status: Optional[Callable[..., object]] = None
    if monitor is not None and hasattr(monitor, "record_status"):
        original_record_status = monitor.record_status  # type: ignore[attr-defined]

        def _capture(status: str, *, timestamp: datetime, details: Optional[Dict[str, object]] = None):
            payload = details or {}
            health_events.append((status, timestamp, dict(payload)))
            return original_record_status(status, timestamp=timestamp, details=payload)

        captured_callback = _capture
        monitor.record_status = _capture  # type: ignore[assignment]

    if executor.state_store is None:
        executor.state_store = state_store or InMemoryStateStore()

    for snapshot in snapshots:
        decisions_processed += len(executor.process_snapshot(snapshot))

    if monitor is not None and captured_callback is not None and original_record_status is not None:
        monitor.record_status = original_record_status  # type: ignore[attr-defined]

    return StagingValidationResult(
        backtest=backtest,
        realtime_executor=executor,
        decisions_processed=decisions_processed,
        health_events=health_events,
    )


__all__ = [
    "PreparedSnapshotDataset",
    "LabelledDatasetSplits",
    "HyperparameterSearchResult",
    "StagingValidationResult",
    "prepare_market_snapshot_dataset",
    "label_snapshots_and_package_dataset",
    "run_hyperparameter_search",
    "finalize_optimization_plan",
    "validate_in_staging",
]
