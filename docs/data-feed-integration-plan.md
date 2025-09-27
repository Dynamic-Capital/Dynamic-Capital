# Data Feed Integration Plan

## Context and Current State

Dynamic Capital currently leans on a single commercial provider (AwesomeAPI) for
forex, crypto, and Commitments of Traders (COT) data, while Yahoo Finance serves
broad market movers for commodities and U.S. indices. Supabase tables
(`market_news`, `sentiment`, `cot_reports`, and `market_movers`) store the
normalized outputs and power the economic calendar and watchlist experiences.
This concentration introduces availability risk, limits asset coverage, and
prevents access to institutional-grade depth that desks have requested for the
DCT ecosystem.

## Integration Objectives

1. **Redundancy** – Add secondary sources for each asset class to mitigate
   single-vendor outages and rate limits.
2. **Coverage Expansion** – Ingest the macro, sentiment, and cross-asset data
   highlighted in the recommended vendor stack so trading desks can run
   multi-factor signals.
3. **Operational Resilience** – Standardize ingestion patterns, credential
   storage, and observability so newly added feeds meet existing quality bars.

## Recommended Provider Additions

### 1. Forex

| Provider                | Role                                               | Implementation Notes                                                                                                                                                         |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alpha Vantage**       | Primary OHLCV backfill with 5 calls/min free tier. | Build a Deno fetch module mirroring `algorithms/python/awesome_api.py` response parsing. Cache API keys in Supabase Secrets Manager and throttle requests via queue workers. |
| **Finnhub**             | Live quotes + depth snapshots.                     | Extend the Supabase `market_movers` sync to consume Finnhub WebSocket streams; persist level-1 quotes to Redis for <5s latency dashboards.                                   |
| **1Forge**              | Low-latency spot FX redundancy.                    | Register as failover in ingestion orchestrator; trigger when AwesomeAPI latency >2s or error rate >5%.                                                                       |
| **ECB Reference Rates** | Daily benchmark for EUR crosses.                   | Schedule daily cron to store EUR pairs in `market_news` for macro commentary alignment.                                                                                      |

### 2. Commodities

| Provider                      | Role                                         | Implementation Notes                                                                                                              |
| ----------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Trading Economics**         | Primary commodities calendar + spot pricing. | Use their REST API to feed Supabase `market_news` with event metadata; add rate-limited retry policy (HTTP 429 backoff).          |
| **Nasdaq Data Link (Quandl)** | Historical futures curves.                   | Mirror dataset ingestion through the data lake (S3) with daily parquet exports; surface aggregated curves through Supabase views. |
| **Yahoo Finance (yfinance)**  | Lightweight ETF proxies and intraday prices. | Keep existing integration but refactor to use the maintained `yfinance` library to reduce query1 scraping fragility.              |

### 3. Indices & Global Markets

| Provider                  | Role                                        | Implementation Notes                                                                                                                         |
| ------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Twelve Data**           | Global index OHLCV.                         | Add pagination-aware collector to populate `market_movers` with APAC/EU indices. Ensure symbol normalization matches internal taxonomy.      |
| **Polygon.io**            | U.S. index and ETF tick data.               | Stream to Kafka → Supabase via Debezium for sub-second updates; gate behind paid plan API keys.                                              |
| **Investing.com Library** | Supplemental breadth and futures sentiment. | Containerize scraper with rotating proxies; ingest derived metrics (advance/decline, futures premia) into analytics warehouse, not Supabase. |

### 4. Macro-Economic & Cross-Asset

| Provider              | Role                                   | Implementation Notes                                                                                                                    |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **FRED**              | Rates, spreads, macro indicators.      | Expand existing Supabase functions to schedule weekly pulls using the FRED API key. Store series metadata to prevent duplicate entries. |
| **IMF API**           | Balance of payments, GDP, FX reserves. | Build incremental loader keyed by `REF_AREA` and `INDICATOR`; only ingest quarterly/annual updates.                                     |
| **OECD + World Bank** | Supplementary macro stats.             | Package as shared ETL templates so analysts can self-service additional series without code changes.                                    |

### 5. Sentiment & Derivatives

| Provider                        | Role                           | Implementation Notes                                                                                                            |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **CFTC COT (direct)**           | Replace AwesomeAPI proxy.      | Stand up AWS Lambda to download weekly CSVs, normalize to Supabase `cot_reports`, and archive originals in S3 for auditability. |
| **Alternative.me Fear & Greed** | Crypto sentiment overlay.      | Store daily index levels in `sentiment`; expose to UI as crypto risk dial.                                                      |
| **NewsAPI**                     | Headline sentiment scoring.    | Pipe categorized news into `market_news` with NLP scoring (use existing `market_sentiment_sync` scaffolding).                   |
| **Quandl Futures Data**         | Options & futures positioning. | Integrate via Nasdaq Data Link premium endpoints; map to new Supabase table `futures_open_interest`.                            |

## Delivery Roadmap

1. **Weeks 0–2** – Provision API keys, scaffold Deno/Node ingestion modules, and
   define Supabase schema extensions (new tables + views).
2. **Weeks 3–6** – Launch forex + commodities connectors in shadow mode,
   validate parity against AwesomeAPI/Yahoo outputs, and wire health checks into
   the observability stack.
3. **Weeks 7–10** – Roll out macro, sentiment, and derivatives feeds with
   backfilled history and automated retries.
4. **Week 11+** – Promote new sources to primary once error budgets remain green
   for 30 days; keep AwesomeAPI as tertiary fallback.

## Target Architecture

- **Ingestion** – Each provider gets a dedicated Deno service (living under
  `algorithms/deno`) with a common abstraction for rate-limit aware fetching,
  response validation (Zod schemas), and batched upserts into Supabase via RPC
  functions. Reusable helpers (queue scheduling, retry policies, telemetry
  emitters) live in `shared/data-ingestion`.
- **Streaming** – Real-time feeds (Finnhub, Polygon.io) flow through the existing
  Redis pub/sub fabric. Queue workers normalize events into canonical symbol and
  venue identifiers before writing to the `market_movers_live` table.
- **Batch Backfill** – Historical pulls (Alpha Vantage, FRED, IMF, Nasdaq Data
  Link) run as daily GitHub Actions workflows. Artifacts (CSV/Parquet) are
  stored in S3 with version tags and mirrored to Supabase through the copy API
  so analysts can query via SQL immediately.
- **Downstream Consumption** – The `economic-calendar` edge function fans out the
  unified Supabase views to the React clients. Vercel edge caching is enabled to
  keep P95 latency <200ms despite larger payloads.

## Schema & Storage Changes

| Table/View                          | Purpose                                                     | Owner |
| ----------------------------------- | ----------------------------------------------------------- | ----- |
| `market_movers_live` (new)          | Level-1 snapshots from Finnhub/Polygon.io.                  | Data  |
| `macro_series` (new)                | Normalized FRED/IMF/OECD time series with metadata JSON.    | Data  |
| `futures_open_interest` (new)       | Quandl futures exposure aggregated by contract and expiry.  | Data  |
| `provider_health` (new)             | Captures latency, error, and freshness metrics per vendor.  | SRE   |
| `market_news` (updated)             | Adds `sentiment_score` and `source_vendor` columns.         | Data  |
| `cot_reports` (updated)             | Adds raw CFTC identifiers and audit trail references (S3).  | Data  |

Migration scripts live in `supabase/migrations/<date>_provider_expansion.sql`
and include reversible `DOWN` statements. Coordinate releases with Supabase row
level security (RLS) updates to ensure analysts keep read-only access.

## Security & Compliance

- Provision provider credentials in Supabase Secrets Manager with unique
  service accounts per environment (dev/staging/prod). Rotate via GitHub Actions
  `secrets:rotate-provider-keys` workflow.
- Restrict outbound IPs using the managed NAT gateway to satisfy Polygon.io and
  Trading Economics allow lists.
- Enable audit logging for the new AWS S3 bucket to track all artifact reads and
  writes. Monthly compliance reviews pull these logs into the GRC dashboard.

## Testing & Validation Strategy

1. **Contract Tests** – For each connector, add Deno test suites asserting
   response schemas and transformation logic (`npm run test:connectors`).
2. **Backfill Verification** – Compare daily aggregates between legacy
   AwesomeAPI/Yahoo Finance datasets and the new sources for a 30-day overlap to
   confirm <1% variance.
3. **Load Testing** – Replay peak trading hours via k6 scripts to confirm Redis
   and Supabase handle the increased throughput with <10% CPU headroom loss.
4. **Failover Drills** – Simulate provider outages quarterly by toggling feature
   flags in LaunchDarkly and verifying orchestrator switchover within SLA.

## Resource & Ownership Plan

| Stream                | Squad             | Key Deliverables                              |
| --------------------- | ----------------- | --------------------------------------------- |
| Forex & Indices       | Velocity Trading  | Alpha Vantage/Finnhub connectors, live routing |
| Commodities & Macro   | Macro Insights    | Trading Economics, FRED/IMF ingestion          |
| Sentiment & Derivatives | Quant Research    | CFTC direct pipeline, NewsAPI NLP scoring      |
| Platform & Tooling    | Core Platform     | Secrets mgmt, observability, CI enhancements    |

Weekly integration syncs track blockers, and an Asana board holds milestones.

## Risk Mitigation

- **Vendor Quotas** – Configure adaptive polling intervals driven by remaining
  quota metrics to avoid hard rate-limit breaches.
- **Data Drift** – Monitor schema or field definition changes by validating
  against stored JSON schemas each run. Alert via PagerDuty when mismatches
  occur.
- **Cost Overruns** – Instrument per-provider cost dashboards using billing API
  exports; alert finance when monthly run-rate exceeds budget by >10%.
- **Operational Load** – Introduce runbook automation (via Opsgenie) for common
  remediation tasks like re-running failed backfills or rotating keys.

## Operational Guardrails

- Add provider-specific dashboards (latency, error rates, freshness) to the
  observability lake and alert when SLAs drift.
- Store credentials exclusively in Supabase Secrets Manager and rotate every 90
  days; document rotations in `SECRETS.md`.
- Update runbooks in `docs/economic-calendar.md` and
  `docs/trading-data-organization.md` once integrations are live so support
  teams have reference procedures.
- Ensure `npm run format`, `npm run lint`, `npm run typecheck`, and targeted
  tests remain green after each connector lands.

## Success Criteria

- At least two independent data sources feeding every asset class dashboard.
- Supabase tables contain historical backfill for the last 24 months across
  forex, commodities, indices, macro, and sentiment datasets.
- Incident response runbooks demonstrate <15 minute failover between providers
  during simulated outages.
