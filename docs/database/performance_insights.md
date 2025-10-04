# Supabase Performance Insights

## Executive Overview
The telemetry snapshot reveals that a handful of query families account for the overwhelming majority of database time. The leading offenders are poll-heavy realtime subscriptions, high-churn HTTP queue maintenance, and catalog-introspection workloads triggered by administrative tooling. Left unmitigated, these patterns inflate CPU consumption, crowd out mission-critical traffic, and mask emerging regressions.

**Top-level takeaways**

- **Realtime polling dominates runtime:** `realtime.list_changes` alone burns ~83% of measured execution time because of >600k invocations despite sub-5 ms latencies.
- **Background queue churn is excessive:** Maintenance deletes on `net.http_request_queue` and `_http_response` execute >5.2 M times each, hinting at undersized batches and backlog oscillation.
- **Catalog scrapes are unbounded:** Introspection CTEs and function exports scan most schemas with high per-call latency, tying up system catalogs and cache.
- **Webhook and storage calls show tail latency risk:** High P95 requests point to downstream services or missing indexes.

The following sections quantify each query family, articulate risk, and propose actionable mitigations with owners, effort, and expected impact.

## High-Impact Query Families

| Rank | Query / Area | Role(s) | Total Calls | Total Time | Avg Latency | Primary Risk |
| ---- | ------------- | ------- | ----------- | ---------- | ----------- | ------------ |
| 1 | `realtime.list_changes` | `supabase_admin` | 615,747 | 2,790,328.96 ms | 4.53 ms | CPU starvation & websocket saturation |
| 2 | Queue maintenance (`net.http_request_queue`, `net._http_response`) | `supabase_admin` | 5,252,039 each | 76,167.90 ms / 70,106.36 ms | 0.014 ms | Autovacuum churn & table bloat |
| 3 | Metadata introspection bundle | `supabase_read_only_user`, `authenticator`, `postgres` | 1231 / 216 / 112+ | 27,258–50,693 ms | 40–240 ms | Dashboard slowness & catalog lock contention |
| 4 | Function catalog exports (`pg_proc` joins) | `supabase_admin`, `postgres` | 85 / 50 | 9,282 ms / 8,548 ms | 109–171 ms | Elevated shared buffers pressure |
| 5 | Storage search & webhook dispatch | `service_role`, `postgres` | 172 / 61 | 5,390 ms / 4,774 ms | 31 ms / 78 ms | Tail latency & external dependency stalls |

### 1. `realtime.list_changes`
- **Signal:** ~46.5 minutes total runtime with negligible row materialization.
- **Hypothesis:** Clients are aggressively polling rather than streaming, or multiplexed channels are underutilized.
- **Mitigations (Owners: Platform Realtime Squad, Effort: Medium, Impact: High):**
  - Deploy channel-level backoff policies and enforce a minimum poll interval via Realtime configuration.
  - Batch acknowledgements or diff retrieval so consumers request multiple changes per call.
  - Cache changefeed snapshots for idle channels on the server to serve fast-follower reads without hitting Postgres.
  - Instrument per-project poll frequency and set alerts when client/device cohorts exceed thresholds.
  - **Supabase tuning:** Enable [Realtime broadcast "presence" mode](https://supabase.com/docs/guides/realtime/presence) selectively so that poll-only clients migrate to websocket streams; set `REPLICATION_MIN_MESSAGES` to prefer WAL streaming over polling for high-volume tables.

### 2. Queue maintenance (`net.http_request_queue` / `net._http_response`)
- **Signal:** >10.5 M combined DELETE operations with minimal rows touched per call.
- **Hypothesis:** Workers are draining items synchronously with a micro-batch size of 1–2, causing constant churn.
- **Mitigations (Owners: Messaging Infrastructure, Effort: Low, Impact: High):**
  - Increase dequeue limits (e.g., 50–100 rows) and batch archival operations in a single transaction.
  - Move archival to a dedicated cron job or Supabase Function that processes aged responses asynchronously.
  - Tune autovacuum thresholds (`autovacuum_vacuum_scale_factor`, `analyze_scale_factor`) specifically for the queue tables to prevent bloat.
  - Create covering indexes on `(created)` / `(id)` if not present to accelerate range deletes.
  - **Supabase tuning:** Configure Supabase Queue workers with `MAX_BATCH_SIZE` and `VISIBILITY_TIMEOUT` overrides via project config, and enable per-table [supabase-db `toast_tuple_target`](https://www.postgresql.org/docs/current/runtime-config-toast.html) adjustments to keep hot rows inline.

### 3. Metadata introspection pack
- **Signal:** Catalog crawls spend 40–240 ms per call, repeating across roles (dashboard, API, CLI).
- **Hypothesis:** UI components fetch full schema metadata on each load without caching.
- **Mitigations (Owners: Developer Experience Team, Effort: Medium, Impact: Medium):**
  - Materialize metadata snapshots in Redis or Edge Functions and invalidate on migration events.
  - Gate expensive endpoints behind rate limits tied to service accounts to curb brute-force crawling.
  - Add schema allowlists to queries (`WHERE table_schema = ANY($allowed)`) before shipping to clients.
  - Provide offline documentation bundles to reduce reliance on live catalog scans during development.
  - **Supabase tuning:** Utilize Supabase Platform Settings → API → "PostgREST cache" to set aggressive TTLs for metadata endpoints and enable `db-prepared-statements` to reuse introspection query plans.

### 4. Function catalog exports (`pg_proc` joins)
- **Signal:** JSON aggregation CTEs generate multi-hundred line payloads with 100–170 ms latency.
- **Hypothesis:** Full function exports run on-demand for every dashboard visit instead of incremental syncs.
- **Mitigations (Owners: Platform Tooling, Effort: Medium, Impact: Medium):**
  - Snapshot function metadata nightly into a dedicated table and expose via a lightweight view/API.
  - Add triggers on `pg_proc` and `pg_trigger` to append change events into a queue for incremental refresh.
  - Filter to explicitly supported schemas to shrink joins (`WHERE pn.nspname = ANY($limited_schemas)`).
  - **Supabase tuning:** Enable the [Function Hooks beta](https://supabase.com/blog/function-hooks) to mirror catalog events into storage without repeated heavy queries, and raise `statement_timeout` for maintenance jobs only via `supabase db reset-config` to avoid global increases.

### 5. Storage search and webhook traffic
- **Signal:** `storage.search` P95 = 118 ms; `net.http_post` averages 78 ms with external dependencies.
- **Hypothesis:** Lack of selective indexes and synchronous webhook handling inside user transactions.
- **Mitigations (Owners: Storage Squad & Integrations, Effort: Medium, Impact: Medium):**
  - Add composite indexes on `(bucket_id, name_prefix)` or `(bucket_id, last_accessed)` depending on filter usage.
  - Route outbound webhooks to a durable job queue (Supabase Queue, Temporal, or custom worker) to decouple from transaction latency.
  - Capture downstream HTTP response codes/latencies in logs to identify flaky destinations.
  - **Supabase tuning:** For storage, flip on ["Serve from edge cache"](https://supabase.com/docs/guides/storage/cdn) for hot buckets and raise the storage API rate limiter threshold for authenticated service roles only; for webhooks, set project-level `DB_ALLOWED_IPS` to narrow egress and reduce TLS negotiation overhead.

## Supabase Configuration Tune-Ups

| Area | Control Plane Lever | Recommendation | Expected Win |
| ---- | ------------------- | -------------- | ------------ |
| Realtime | Project Settings → Realtime | Set `broadcast.rateLimit` to 500 msg/min per client and enable multiplexed channels | ↓ polling traffic by 35–45% |
| Database | `supabase db config set` | Lower `shared_buffers` to 25% RAM and raise `effective_io_concurrency` to 200 for NVMe storage | Stabilized IO latency during spikes |
| API | Settings → API → Performance | Turn on PostgREST query caching for metadata endpoints, set TTL=300 s | Cuts catalog load by ~60% |
| Storage | Settings → Storage | Enable CDN caching and background image resizing worker | ↓ storage.search latency by 30% |
| Functions | Edge Functions dashboard | Schedule nightly metadata sync job with retriable timeout (120 s) | Removes dashboard-triggered full scans |

## Cross-Cutting Action Plan

| Priority | Initiative | Description | Owner | Effort | Impact | Target Date |
| -------- | ---------- | ----------- | ----- | ------ | ------ | ----------- |
| P0 | Realtime Polling Guardrails | Enforce minimum poll interval, instrument poll metrics, deploy caching | Platform Realtime Squad | M | H | +2 weeks |
| P0 | HTTP Queue Batch Drains | Increase batch size, add cron processor, retune autovacuum | Messaging Infrastructure | L | H | +2 weeks |
| P1 | Metadata Snapshot Service | Cache catalog responses & invalidate on migration events | Developer Experience | M | M | +4 weeks |
| P1 | Function Manifest Materialization | Nightly snapshot & incremental trigger pipeline | Platform Tooling | M | M | +5 weeks |
| P2 | Storage & Webhook Hardening | Add indexes, async webhooks, latency logging | Storage Squad & Integrations | M | M | +6 weeks |
| P2 | DB Parameter Hardening | Apply Supabase config tunings (shared buffers, IO concurrency, WAL segment sizing) | DBA Guild | M | H | +6 weeks |

## Implementation Progress

| Initiative | Status | Delivery Notes |
| ---------- | ------ | -------------- |
| Realtime telemetry guardrails | ✅ | Added `monitoring.refresh_query_family_rollups` to snapshot `pg_stat_statements`, exposed via the `performance-scorecard` Edge Function, and scheduled a 5-minute pg_cron refresh job. |
| HTTP queue batch drains | ✅ | Introduced `net.dequeue_http_request_batch` with `SKIP LOCKED` semantics, scheduled recurring archives through `net.archive_http_response_batch`, and backstopped with creation-time indexes. |
| Metadata/Function caching | ⏳ | Pending follow-up: requires Redis materialization layer and trigger wiring. |
| Storage & webhook hardening | ⏳ | Awaiting confirmation of access patterns before designing composite indexes. |

## Validation & Guardrails

1. **Telemetry scorecard:** Track weekly `total_time` deltas per query family and flag regressions >10%.
2. **Cost envelope:** Monitor Supabase project credit burn; target ≥18% reduction post-remediation.
3. **Customer experience probes:** Run synthetic clients against realtime and storage endpoints every 5 minutes from three regions and publish the SLO dashboard to the incident channel.
4. **Configuration drift watch:** Automate `supabase db config diff` in CI so manual console tweaks are captured and reviewed.

## Instrumentation & Monitoring Enhancements

1. **Adopt per-query SLIs:** Track call volume, total runtime contribution, and failure rates via Supabase Logs and ship metrics to Prometheus/Grafana.
2. **Establish anomaly alerts:** Trigger PagerDuty incidents when query families deviate ±20% from trailing 7-day baselines.
3. **Correlate with application traces:** Emit OpenTelemetry spans for queue workers, realtime subscribers, and webhook flows to tie database load with application contexts.
4. **Monthly performance reviews:** Include the dashboard in the ops review to ensure regression detection.

## Next Steps & Accountability

1. **Kickoff remediation workstream (Week 0):** Align engineering squads on priorities, confirm owners, and book weekly syncs.
2. **Deploy realtime and queue fixes (Week 2):** Validate reduced call volume in telemetry and compare CPU utilization week-over-week.
3. **Deliver caching layers (Week 4):** Ship metadata snapshot service and function manifest pipeline; add smoke tests to CI.
4. **Review storage/webhook metrics (Week 6):** Ensure new indexes reduce `storage.search` P95 by >40% and asynchronous webhooks eliminate DB transaction stalls.
5. **Retro & iterate (Week 8):** Document wins, outstanding risks, and feed insights into capacity planning.

Executing the roadmap above should reclaim significant database headroom, stabilize admin tooling latency, and provide durable observability to guard against future regressions.
