# TON Market Making Implementation Plan

## Overview
This document translates the target pseudo-flow for the Dynamic Capital TON market-making system into concrete implementation tasks. It covers venue connectivity, state persistence, scheduling, monitoring, and operational governance required to deliver a compliant rollout for the Maldives-focused audience.

## Core Quoting Loop
1. **Market Data Ingestion**
   - Subscribe to best bid/ask, full depth, trades, and funding updates from supported TON venues (initially the TON DEX and CEX REST endpoints).
   - Maintain rolling mid price, inventory `q`, and realized/unrealized P&L in the in-memory state cache backed by Redis/Supabase.
2. **Volatility and Risk Metrics**
   - Compute the exponential weighted moving average (EWMA) volatility using lookback `L` on streamed mid-price returns. Persist per-asset volatility snapshots for auditability.
3. **Quote Generation**
   - Implement the Avellaneda-Stoikov parameters exactly as specified: reservation price `r` and symmetric spread `delta` with guardrails for floor spread and skewing by inventory via `beta`.
   - Apply `round_to_tick` using venue tick-size metadata. Expose configuration via admin controls.
4. **Order Placement**
   - For each refresh interval, call `replace_quote` on both bid and ask with size sourced from `size_fn`. Honor hard and soft inventory limits, canceling quotes and pausing when limits are hit.
5. **Fill Handling**
   - Consume order execution webhooks or polling to update inventory `q`, realized P&L, and mark-to-market valuations. Persist fills to the state store and append to an immutable audit log.

## Venue Adapters
### TON DEX Adapter
- **Endpoints**: REST public endpoints for orderbook and trades; authenticated endpoints for order submission, cancellation, and balance queries.
- **Authentication**: Use API key + secret with HMAC signature (confirm with venue docs). Store credentials in Vault/Supabase Secrets, inject at runtime via environment variables.
- **Rate Limiting**: Wrap each REST call with adaptive throttling to avoid exceeding venue limits; emit Prometheus counters for throttled requests.

### TON CEX Adapter
- Mirror the structure of the DEX adapter but encapsulate venue-specific parameters (tick size, min size, rate limits).
- Provide a common interface `submit_order`, `cancel_order`, `fetch_orderbook`, `fetch_trades`, and `fetch_balances` so the strategy core remains venue-agnostic.

## State Store
- Primary: **Redis** for low-latency state (inventory, outstanding orders, recent fills). Use Redis Streams to capture fills and parameter changes.
- Secondary: **Supabase** (PostgreSQL) tables:
  - `mm_state` (current inventory, P&L, risk limits, timestamps).
  - `positions` (per asset, per venue exposures with realized/unrealized P&L columns).
  - `fills` (all executions with venue IDs, fees, side, price, size).
- Implement an idempotent writer that syncs Redis snapshots into Supabase at defined intervals (every 60 seconds) and during graceful shutdown.

## Scheduler & Housekeeping
- Build an asyncio service that:
  - Runs the quoting loop at `REFRESH_INTERVAL` using `asyncio.create_task`.
  - Schedules housekeeping jobs: funding payments reconciliation, buyback cadence, state persistence, and risk limit recalibration via `asyncio.TaskGroup`.
  - Integrates with cron-like triggers (e.g., APScheduler) for daily and hourly jobs such as reporting and data retention cleanup.

## Monitoring & Telemetry
- **Prometheus Metrics**
  - Quotes: spread, skew, size, success/failure counts.
  - Inventory: current `q`, soft/hard limit utilization.
  - P&L: realized, unrealized, mark-to-market by venue.
  - Venue latency and error rates.
- **Dashboards**
  - Grafana panels for spreads, depth consumed/provided, fill-rate, and volatility regimes.
  - Supabase dashboards for investor transparency with aggregated liquidity mining rewards and treasury balances.
- **Alerting**
  - PagerDuty or Telegram alerts for limit breaches, API failures, or volatility flags triggering widen/pause actions.

## Admin Controls (Telegram Mini App)
- Build a lightweight Telegram Mini App that authenticates via bot tokens and restricts access to authorized wallet addresses or accounts.
- Functionality:
  - Pause/resume/widen quoting across venues.
  - Adjust configuration parameters (spread floor, beta, gamma, kappa, inventory limits) with change reason.
  - Display real-time inventory, P&L, and recent fills.
- All parameter changes should be logged to Supabase and optionally anchored on-chain via a TON data contract for auditability.

## Governance & Compliance
- Publish public dashboards summarizing liquidity provision, treasury balances, and buyback history.
- Add clear Maldives-compliant disclosures covering market-making risks, treasury usage, and buyback limitations.
- Enforce buyback throttling via scheduler (e.g., min 4-hour interval) and monitor for manipulative patterns.
- Retain immutable logs of parameter changes and trading decisions with timestamps, operator ID, and rationale.

## Rollout Plan
1. **Sandbox (Weeks 1–2)**
   - Backtest Avellaneda-Stoikov parameters on historical DCT trades.
   - Calibrate fill-rate parameter `kappa` by venue.
2. **Dry Run (Week 3)**
   - Deploy to testnet or minimal size on mainnet with full telemetry.
   - Validate inventory limits, circuit breakers, and admin controls.
3. **Pilot (Weeks 4–6)**
   - Allocate small treasury capital; monitor 24/7 with on-call rotation.
   - Launch capped liquidity mining incentives tied to fill quality metrics.
4. **Scale (Week 7+)**
   - Introduce cross-venue hedging (e.g., TON perpetuals) to offset inventory risk.
   - Tighten spreads in controlled increments once stability is demonstrated.

## Next Steps
- Finalize venue API specifications and credentials.
- Stub core strategy service with dependency interfaces (venue adapters, state store, scheduler).
- Prioritize Prometheus instrumentation and admin tooling to ensure observability before scaling capital.
