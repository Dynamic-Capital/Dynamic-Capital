# Trading Operations Runbook

This runbook describes the end-to-end operational lifecycle for the Lorentzian
k-NN strategy that powers Dynamic Capital's discretionary trading stack.

## 1. Daily Data Refresh

1. Export the previous trading day's OHLC candles from the broker or data
   vendor.
2. Run the historical ingestion job:
   ```python
   from pathlib import Path

   from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar

   job = MarketDataIngestionJob()
   bars = [...]  # Iterable of RawBar instances ordered chronologically
   instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
   snapshots = job.run(bars, instrument)
   job.save_csv(snapshots, Path("data/xauusd_snapshots.csv"))
   ```
3. Store the resulting snapshots in the research data lake (e.g. S3 or Supabase
   storage) and update the catalogue entry with the generated metadata file.

## 2. Offline Labelling & Dataset Packaging

1. Pull the latest curated snapshots and feed them through the offline labeler:
   ```python
   from algorithms.python.offline_labeler import LabelingConfig, OfflineLabeler

   labeler = OfflineLabeler()
   labelled = labeler.label(snapshots, LabelingConfig(lookahead=4, neutral_zone_pips=2.0))
   ```
2. Persist the feature-scaling state returned by `labeler.state_dict()` so the
   same normalisation can be reapplied during evaluation and production reloads.
3. Split the labelled samples into train/validation/test sets with
   `DatasetWriter`, committing the resulting Parquet files and metadata.json to
   version control to guarantee reproducibility across experiments.

## 3. Model Training & Hyperparameter Search

1. Define a search grid in code (or YAML) covering neighbour counts, lookahead
   windows, neutral zones, and ADR factors.
2. Execute the search:
   ```python
   from algorithms.python.hyperparameter_search import HyperparameterSearch

   search = HyperparameterSearch(snapshots, {"neighbors": [4, 8, 16], "label_lookahead": [2, 4, 6]})
   best_config, best_result, history = search.run()
   ```
3. Review the resulting `BacktestResult` metrics (hit rate, profit factor,
   drawdown) and promote the best configuration into the staging registry.
4. Freeze the trained artefacts via `model_artifacts.save_artifacts`, storing
   the scaler state, neighbour set, and configuration document.

## 4. Pre-Deployment Validation

1. Run the automated pytest suite (`pytest algorithms/python/tests`) to verify
   label edge-cases, ADR handling, and risk gating logic.
2. Replay the chosen configuration through the `Backtester` using an out-of-
   sample dataset to produce an equity curve and risk analytics report.
3. Log the backtest summary in the research notebook and obtain sign-off from
   risk management before moving to production.

## 5. Production Deployment

1. Publish the saved model artefacts to the model registry or object storage
   bucket accessible by the live trading service.
2. Update the production configuration file to reference the new artefact path
   and risk guardrails (daily drawdown, lot limits, etc.).
3. Perform a canary deploy by spinning up a single inference replica. Monitor
   the health feed exposed by `RealtimeExecutor` and confirm that trade
   decisions align with expectations in the staging environment.
4. Promote the release to all replicas once the canary remains healthy for a
   full trading session.

## 6. Ongoing Monitoring & Maintenance

1. Continuously track the exported performance metrics (hit rate, profit factor,
   drawdown) published by the `RiskManager` monitoring hooks.
2. Schedule weekly data refresh + retraining jobs. Archive the generated
   artefacts with semantic version tags (e.g. `lorentzian-knn-v2024.05.01`).
3. Review operational dashboards each trading day to ensure ADR feeds, broker
   connectors, and persistence stores remain healthy.
4. Trigger the rollback procedure (redeploy the previous artefact version) if
   production performance deviates materially from backtest expectations or if
   risk limits are breached.
