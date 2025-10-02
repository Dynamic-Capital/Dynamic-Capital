# TON AI Trading System Architecture

This document describes how to assemble an end-to-end quantitative trading stack
for the TON (The Open Network) ecosystem.  It builds upon the reusable
components found in `dynamic_ton` and highlights how data, AI modelling, and
on-chain execution interact.

## 1. Data Collection

1. **Blockchain and Indexer APIs**
   - TonCenter JSON-RPC and REST endpoints for block, transaction, and account
     data.
   - TonAPI GraphQL for jetton metadata, wallet statistics, and liquidity
     analytics.
2. **DEX Market Data**
   - [STON.fi](https://ston.fi) and [DeDust](https://dedust.io) REST endpoints
     for pools, trades, and OHLCV candles.
3. **Real-Time Streaming**
   - WebSocket feeds (where available) for push-based updates.
   - Fallback polling cadence handled by `TonDataCollector`.

The `TonDataCollector` class abstracts these sources by converting the raw JSON
payloads into strongly typed dataclasses (`TonPricePoint`,
`TonLiquiditySnapshot`, `TonWalletDistribution`).  It is asynchronous by design
so it can be embedded in Jupyter notebooks, FastAPI services, or async job
runners.

## 2. Feature Engineering

`TonFeatureEngineer` converts raw network snapshots into a modelling-ready
feature dictionary.  The current implementation derives:

- Price-based metrics (close, midpoint, true range, rolling returns).
- Liquidity information (TON/quote depth, depth ratios, venue utilisation).
- Wallet distribution statistics (top holder share, whale activity).
- Network telemetry (gas costs, bridge latency, total transaction counts).

The engineer maintains a rolling window that can be fed into downstream models
for sequential learning tasks such as LSTMs or PPO agents.

## 3. AI Modelling

The `TonModelCoordinator` façade allows any incremental learning model to be
plugged in via the `SupportsModel` protocol.  Example integrations:

- **Supervised Forecasting**: online regressors such as `sklearn.linear_model.SGDRegressor`.
- **Reinforcement Learning**: custom agents that expose `partial_fit` for policy
  updates.
- **Anomaly Detection**: models like `River`'s `OneClassSVM` for detecting
  liquidity shocks.

### Training Workflow

1. Fetch fresh snapshots using `TonDataCollector`.
2. Transform to features via `TonFeatureEngineer`.
3. Call `TonModelCoordinator.train(...)` with aligned targets (future returns,
   risk signals, etc.).
4. Use `TonModelCoordinator.predict(...)` for live signals.

## 4. Execution Layer

- **Smart Contracts**: Deploy FunC/TVM contracts that can consume off-chain
  signals and orchestrate DEX trades via TON Wallet Contracts v4.
- **Bots and Keepers**: Off-chain bots monitor predictions, sign transactions,
  and submit them to TON gateways.
- **Risk Management**: Integrate treasury posture outputs from
  `dynamic_ton.engine` to cap exposure, rebalance liquidity, and manage hedges.

## 5. Infrastructure Considerations

- **Storage**: Persist raw snapshots in object storage (S3, GCS) and aggregate
  features in a time-series database (InfluxDB, TimescaleDB).
- **Orchestration**: Use Airflow, Dagster, or Prefect for scheduled training and
  execution.
- **Monitoring**: Emit Prometheus metrics for model performance, API latency,
  and smart contract execution outcomes.
- **Security**: Store private keys in HSM or MPC wallets, enforce least privilege
  for deployment pipelines, and monitor for anomalous withdrawal patterns.

## 6. Next Steps

- Build React dashboards under `apps` to visualise signals, liquidity posture,
  and live execution state.
- Extend the data collector with caching layers and WebSocket ingestion.
- Implement reinforcement learning agents tailored to TON liquidity dynamics.
- Integrate transaction simulators for pre-trade risk checks on DEX venues.
