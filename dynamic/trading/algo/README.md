# Trading · Algorithmic Execution

This directory hosts systematic trading components such as execution bots,
strategy planners, and middleware adapters.

Highlights:

- Core trading loop (`trading_core.py`) with signal normalisation helpers.
- Role-based algorithms (CEO/CFO/COO), metadata engines, and pool management.
- Supporting adapters for telemetry, script orchestration, and traffic control.
- HTTP trade connector (`integrations/trade_api_connector.py`) mapping the
  `DynamicTradingAlgo` execution surface onto broker REST APIs. Configure via
  `TRADE_EXECUTION_API_*` environment variables when deploying automation,
  including `TRADE_EXECUTION_MAX_ATTEMPTS` / `TRADE_EXECUTION_RETRY_BACKOFF`
  for built-in retry hardening.
- Data collection client (`integrations/data_collection_api.py`) for streaming
  trade decisions and telemetry into analytics stores. Configure via
  `DATA_COLLECTION_API_*` or `TRADE_DATA_API_*` environment variables and
  enable retry semantics with `DATA_COLLECTION_MAX_ATTEMPTS` /
  `DATA_COLLECTION_RETRY_BACKOFF`.

When introducing new strategies document their configuration knobs, telemetry
feeds, and guardrails here.
