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
