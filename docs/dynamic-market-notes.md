# Dynamic Market Notes

## Purpose

- Capture the working model for the Dynamic Market stack that pairs the Dynamic
  Market Maker (DMM), Dynamic Market Data Algo (DMDA), and the treasury policy
  engine.
- Provide actionable reference material that trading, engineering, and treasury
  teams can use when coordinating liquidity actions, automation rollouts, and
  post-trade reporting.
- Serve as a bridge between the high-level Dynamic Capital ecosystem maps and
  the execution runbooks so contributors can reason about dependencies without
  scanning multiple documents.

## Core Surfaces

| Surface                             | Responsibilities                                                                                                                  | Key Inputs                                                                           | Outputs                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **DMDA (Dynamic Market Data Algo)** | Streams tick data, depth snapshots, funding, borrow rates, and liquidity metrics across TON DEX venues and mirrored CEX listings. | TradingView webhooks, exchange WebSocket feeds, on-chain indexers, latency monitors. | Clean mid-price series, volatility bands, imbalance scores, health heartbeats.   |
| **DMM (Dynamic Market Maker)**      | Generates reservation price, spread ladders, and inventory-aware quotes; coordinates hedges and liquidity mining hooks.           | DMDA telemetry, treasury inventory limits, venue configuration.                      | Live quotes, hedge orders, incentive accrual signals, fill quality metrics.      |
| **Treasury Policy Engine**          | Applies buyback/burn rules, reward multipliers, and risk buffers tied to trading performance.                                     | DMM P&L, policy presets, governance overrides.                                       | Treasury transfers, staking multipliers, burn transactions, audit logs.          |
| **Control Plane**                   | Consolidates kill-switches, circuit breaker triggers, and automation schedules.                                                   | Health checks, alert acknowledgements, config snapshots.                             | Incident notifications, state transitions (pause/resume), post-mortem templates. |

## Data Pipeline Notes

1. **Source alignment** – DMDA must normalize timestamps to UTC and align
   exchange-specific symbols to canonical market identifiers before publishing
   snapshots.
2. **Latency SLOs** – Target ≤ 800 ms end-to-end latency for high-frequency
   feeds; escalate if 95th percentile exceeds 1.5 s for two consecutive
   intervals.
3. **Quality scoring** – Attach confidence scores to each snapshot (e.g.,
   missing levels, stale trades) so downstream consumers can widen spreads or
   suppress hedges automatically when data quality degrades.
4. **Backfill strategy** – Retain 48 hours of raw feed data in hot storage for
   replay/testing and roll the remainder into cold storage (TimescaleDB) with
   hourly partitions for analytics.

## Quoting & Inventory Alignment

- **Risk buckets** – Mirror the soft/hard inventory limits defined in the DMM
  specification; expose them as configuration values inside the control plane
  for quick overrides during volatile sessions.
- **Spread choreography** – Combine the Avellaneda–Stoikov outputs with venue
  fee models to ensure quotes remain inside profitability bands after accounting
  for TON gas and maker/taker fees.
- **Inventory skewing** – Use DMDA imbalance scores to pre-emptively skew quotes
  toward the side showing exhaustion, reducing the need for reactive hedges.
- **Fill attribution** – Tag fills with snapshot IDs and venue metadata so
  treasury can reconcile profit share flows and incentive multipliers.

## Daily Operations Checklist

- [ ] Confirm DMDA feed health: heartbeat latency, dropped packet count,
      TradingView webhook backlog.
- [ ] Review overnight inventory distribution vs. policy targets (per venue +
      aggregate).
- [ ] Validate treasury balances against the policy engine ledger before
      initiating new buyback/burn cycles.
- [ ] Inspect alert dashboard for outstanding circuit breaker triggers and
      capture resolution notes.
- [ ] Rotate policy presets if macro conditions changed (e.g., switch from
      "steady state" to "defensive").
- [ ] Publish daily liquidity snapshot (average spread, quote uptime, executed
      volume) to the ops channel.

## Market State Playbooks

| State         | Indicators                                                                | DMM Actions                                                   | Treasury Hooks                                                                   |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Expansion** | Rising volume, low realized volatility, DMDA imbalance < 0.3              | Tighten spreads, lower γ, expand size ladder                  | Schedule steady buybacks, normal reward multipliers                              |
| **Defensive** | Elevated volatility, inventory near soft limit, toxicity spikes           | Increase β skew, widen spread floor, throttle refresh cadence | Shift to defensive preset, pause burns, increase risk buffer allocation          |
| **Recovery**  | Volume normalizing, inventory re-centering, DMDA confidence improving     | Gradually tighten spreads, resume standard cadence            | Resume burns, reinstate boosted staking rewards                                  |
| **Stress**    | Heartbeat outages, price gap > policy threshold, multiple venues degraded | Trigger kill-switch, cancel quotes, rely on hedges only       | Halt discretionary actions, preserve liquidity buffer, convene incident response |

## Telemetry & Reporting

- **Dashboards** – Segment monitoring by feed quality, quoting health, hedging
  activity, and treasury flows. Each widget should expose drill-down links to
  raw logs or CSV exports for audits.
- **Alerting** – Integrate PagerDuty/Telegram for latency breaches, drawdown
  limits, and treasury mismatches. Include human-in-the-loop acknowledgements to
  avoid automation loops during partial outages.
- **Post-trade analytics** – Run daily attribution to compare realized edge vs.
  theoretical δ_t, fill slippage, and hedge effectiveness. Feed insights back
  into spread presets and policy multipliers.
- **Regulatory archive** – Store signed weekly summaries (PDF/Markdown) with
  inventory positions, buyback transactions, and staking adjustments for
  compliance reviews.

## Integration Hooks

1. **Supabase** – Store structured data (`market_snapshots`, `inventory_ledger`,
   `policy_actions`) with row-level security so ops dashboards and bots can read
   aggregated metrics without direct DMM access.
2. **Edge Functions** – Provide lightweight proxies that expose sanitized
   telemetry (e.g., current spread, policy preset) to the Mini App without
   leaking sensitive hedging parameters.
3. **Trading Bots** – When integrating community-facing bots, throttle access to
   DMDA data via rate limiting and anonymize venue identifiers until disclosure
   policies are finalized.
4. **Analytics Warehouse** – Stream aggregated metrics into the warehouse for BI
   tooling; ensure schema evolves via migration scripts tracked in version
   control.

## Risk & Control Notes

- **Circuit breakers** – Align volatility, drawdown, and data staleness triggers
  with the DMM spec. Document recovery procedures per trigger and require
  dual-operator sign-off before resuming quoting.
- **Gas/fee management** – Monitor TON fee markets; when congestion spikes,
  automatically shrink ladder sizes and lengthen refresh cadence while surfacing
  fee budgets to treasury.
- **Governance overrides** – Maintain a runbook for invoking emergency policy
  overrides, including required multisig participants, communication templates,
  and rollback steps.
- **Model drift** – Periodically benchmark Avellaneda–Stoikov parameters against
  realized order book behaviour and update γ/κ presets through controlled
  experiments.

## Implementation Timeline Template

| Phase                                 | Goals                                                                                                     | Owner Cues                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Phase 0 — Discovery**               | Inventory existing feeds, venue adapters, treasury policies. Draft desired KPIs and monitoring baselines. | Ops lead schedules interviews, data engineer maps feed coverage.              |
| **Phase 1 — Data Hardening**          | Normalize DMDA schemas, implement latency scoring, backfill cold storage retention.                       | Data engineer validates pipelines, QA confirms replay tooling.                |
| **Phase 2 — Quoting Enhancements**    | Parameterize γ/β presets, integrate imbalance-aware skewing, tighten fill attribution logging.            | Quant engineer runs backtests, infra lead deploys config toggles.             |
| **Phase 3 — Treasury Sync**           | Wire P&L feeds into policy engine, define buyback cadence presets, automate ledger reconciliation.        | Treasury PM signs off on allocation workflows.                                |
| **Phase 4 — Monitoring & Governance** | Stand up dashboards, alert routing, incident templates, and governance override runbooks.                 | Reliability engineer tests failovers; compliance reviewer archives approvals. |

## Coordination Notes

- Schedule weekly triad reviews (quant + ops + treasury) to reconcile metrics,
  parameter drifts, and policy changes.
- Keep a shared Confluence/Notion page summarizing open action items with links
  back to GitHub issues for traceability.
- Encourage cross-training so on-call engineers understand policy levers and
  treasury staff can interpret DMDA telemetry.

## Reference Checklist

- [ ] DMDA feed schemas documented and versioned.
- [ ] Venue adapters list up-to-date with health status and deployment targets.
- [ ] Policy presets (bootstrap, steady state, defensive) validated with sample
      parameter files.
- [ ] Treasury ledger reconciled with on-chain explorers and audit logs stored
      in Supabase.
- [ ] Incident response templates linked in PagerDuty/Telegram rotations.
- [ ] Daily/weekly reporting cadence confirmed with audience owners (internal
      desk, community, regulators).
