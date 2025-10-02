# TON AI Trading System Architecture

This document describes how to assemble an end-to-end quantitative trading stack
for the TON (The Open Network) ecosystem.  It builds upon the reusable
components found in `dynamic_ton` and highlights how data, AI modelling, and
on-chain execution interact.

## 1. TON-Native Tooling

Leverage the TON-specific utilities maintained inside `dynamic_ton` alongside
open-source tooling from the wider ecosystem:

- **Core access**: [`ton-http-api`](https://github.com/ton-community/ton-http-api)
  for REST access to blocks and accounts, [`ton-contract-executor`](https://github.com/ton-community/ton-contract-executor)
  for offline smart contract calls, and [`ton-access`](https://tonaccess.io)
  gateways for resilient RPC routing across mainnet and testnet.
- **State & storage**: [`ton-storage`](https://github.com/ton-community/ton-storage)
  to persist large artifacts (model weights, feature snapshots) directly on TON
  storage backends.

These services complement the existing `TonDataCollector` connectors and ensure
that upstream APIs remain redundant and portable.

## 2. Data Collection

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
   - Stream processors such as [Apache Flink](https://flink.apache.org),
     [Bytewax](https://www.bytewax.io), or [Faust](https://faust.readthedocs.io)
     to enrich, aggregate, and fan out market events with sub-second latency.
   - Fallback polling cadence handled by `TonDataCollector` when no streaming
     interface is published.
4. **Message Brokers**
   - `Kafka` remains the default for high-throughput pipelines.
   - [`NATS`](https://nats.io) offers ultra-low latency pub/sub for bot runners
     and alerting services.
   - [`RabbitMQ`](https://www.rabbitmq.com) provides simple, durable queues for
     task distribution where ordering guarantees are required.

The `TonDataCollector` class abstracts these sources by converting the raw JSON
payloads into strongly typed dataclasses (`TonPricePoint`,
`TonLiquiditySnapshot`, `TonWalletDistribution`).  It is asynchronous by design
so it can be embedded in Jupyter notebooks, FastAPI services, or async job
runners.

## 3. Feature Engineering

`TonFeatureEngineer` converts raw network snapshots into a modelling-ready
feature dictionary.  The current implementation derives:

- Price-based metrics (close, midpoint, true range, rolling returns).
- Liquidity information (TON/quote depth, depth ratios, venue utilisation).
- Wallet distribution statistics (top holder share, whale activity).
- Network telemetry (gas costs, bridge latency, total transaction counts).

The engineer maintains a rolling window that can be fed into downstream models
for sequential learning tasks such as LSTMs or PPO agents.

Augment the feature pipeline with a dedicated feature store when scaling to
multiple strategies or teams:

- **Feast** for open-source, declarative feature definitions shared across
  offline and online workloads.
- **Hopsworks** when a managed, end-to-end feature platform is warranted.
- **Tecton** (hybrid OSS/SaaS) for advanced transformation pipelines and
  low-latency online retrieval.

Data validation layers such as `Great Expectations` or `WhyLogs` can be wired
into ingestion jobs to detect schema drift before it reaches the modelling
layer.

## 4. AI Modelling

The `TonModelCoordinator` façade allows any incremental learning model to be
plugged in via the `SupportsModel` protocol.  Example integrations:

- **Supervised Forecasting**: online regressors such as `sklearn.linear_model.SGDRegressor`.
- **Reinforcement Learning**: custom agents that expose `partial_fit` for policy
  updates.
- **Anomaly Detection**: models like `River`'s `OneClassSVM` for detecting
  liquidity shocks.

### Model Monitoring

- **Evidently AI** dashboards quantify prediction drift, data quality, and
  segment health.
- **Arize AI** supplies ML observability workflows for tracing inference issues
  back to problematic features.
- **WhyLogs** captures lightweight data profiles that can be stored on TON
  storage or object stores for long-term auditing.

### Training Workflow

1. Fetch fresh snapshots using `TonDataCollector`.
2. Transform to features via `TonFeatureEngineer`.
3. Call `TonModelCoordinator.train(...)` with aligned targets (future returns,
   risk signals, etc.).
4. Use `TonModelCoordinator.predict(...)` for live signals.

## 5. Execution Layer

- **Smart Contracts**: Deploy FunC/TVM contracts that can consume off-chain
  signals and orchestrate DEX trades via TON Wallet Contracts v4.
- **Bots and Keepers**: Off-chain bots monitor predictions, sign transactions,
  and submit them to TON gateways.
- **Risk Management**: Integrate treasury posture outputs from
  `dynamic_ton.engine` to cap exposure, rebalance liquidity, and manage hedges.
  Enhance guardrails with [`PyRisk`](https://github.com/anfederico/pyrisk) for
  risk factor decomposition, [`QuantStats`](https://github.com/ranaroussi/QuantStats)
  for portfolio analytics, and `QFL` libraries for quantitative finance
  backtesting scenarios.
- **Security Tooling**: Incorporate static and dynamic analyzers such as
  [`Crytic-compile`](https://github.com/crytic/crytic-compile) and
  [`Mythril`](https://mythril-classic.readthedocs.io) for contract security,
  plus `Bandit` for Python services interacting with TON infrastructure.

## 6. Infrastructure Considerations

- **Storage**: Persist raw snapshots in object storage (S3, GCS) and aggregate
  features in a time-series database (InfluxDB, TimescaleDB).
- **Orchestration**: Use Airflow, Dagster, or Prefect for scheduled training and
  execution.
- **Containerization & Serving**: Package services with Docker, orchestrate via
  Kubernetes, and deploy models through [Seldon Core](https://www.seldon.io/seldon-core)
  or [KServe](https://kserve.github.io/website/).
- **API & Dashboards**: Use `FastAPI` for REST/GraphQL interfaces and
  `Streamlit` for rapid analytics consoles.
- **Monitoring**: Emit Prometheus metrics for model performance, API latency,
  and smart contract execution outcomes. Couple with Grafana for visualization
  and Evidently/Arize exports for ML-specific metrics.
- **Security**: Store private keys in HSM or MPC wallets, enforce least privilege
  for deployment pipelines, and monitor for anomalous withdrawal patterns.

## 7. Reference Architecture

```
Data Layer:
  TON Blockchain → TonWeb / PyTON → Kafka / Flink → PostgreSQL (TimescaleDB)

Feature Engineering:
  Raw Data → pandas-ta / tsfresh → Feast Feature Store → Validation (Great Expectations / WhyLogs)

ML Pipeline:
  Features → PyTorch / Stable-Baselines3 → Experiment Tracking (MLflow) → Model Registry

Trading Engine:
  Trained Model → Backtrader / VectorBT → Risk Management Stack → TON Smart Contracts

Monitoring:
  Evidently AI + Grafana + Prometheus
```

## 8. Implementation Roadmap

Adopt a phased rollout to move from prototype to production:

1. **Phase 1 – MVP**: `tonweb + ccxt + pandas + pandas-ta + sklearn/xgboost + backtrader + fastapi`.
2. **Phase 2 – Production**: Layer in `MLflow`, `PostgreSQL/TimescaleDB`,
   containerization with Docker, message streaming via Kafka (or NATS), and
   deep learning frameworks such as `PyTorch`.
3. **Phase 3 – Advanced**: Introduce feature stores, reinforcement learning
   agents (`Stable-Baselines3`), real-time inference services on Kubernetes, and
   full-stack monitoring with Evidently, Arize, and Prometheus/Grafana.

## 9. Next Steps

- Build React dashboards under `apps` to visualise signals, liquidity posture,
  and live execution state.
- Extend the data collector with caching layers and WebSocket ingestion.
- Implement reinforcement learning agents tailored to TON liquidity dynamics.
- Integrate transaction simulators for pre-trade risk checks on DEX venues.
