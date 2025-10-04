# Supabase Performance Insights

## Overview
This report summarizes the most expensive queries captured in the provided telemetry snapshot. Metrics include total execution time, per-call latency, row throughput, and cache behavior. The goal is to highlight remediation opportunities that lower overall resource consumption.

## High-Impact Query Families

### 1. `realtime.list_changes`
- **Role:** `supabase_admin`
- **Total calls:** 615,747
- **Total time:** 2,790,328.96 ms (~46.5 minutes)
- **Average latency:** 4.53 ms
- **Rows read:** 4
- **Observations:** Despite very low row retrieval, this function dominates runtime because of extreme call volume.
- **Recommendations:**
  - Batch changefeed consumers to reduce call frequency.
  - Introduce server-side caching for unchanged channels.
  - Validate polling configuration to ensure clients respect exponential backoff during idle periods.

### 2. Queue maintenance (`net.http_request_queue` / `net._http_response`)
- **Roles:** `supabase_admin`
- **Total calls:** 5,252,039 for each maintenance query
- **Total time:** 76,167.90 ms and 70,106.36 ms respectively
- **Average latency:** 0.014–0.013 ms per call
- **Rows touched:** 61 across both queries
- **Observations:** Ultra-high frequency vacuum-style maintenance indicates the queue is heavily cycled.
- **Recommendations:**
  - Increase batch size limits to drain multiple entries per invocation.
  - Schedule asynchronous workers to process backlog instead of synchronous deletions.
  - Ensure autovacuum thresholds accommodate the write pattern to avoid table bloat.

### 3. Metadata introspection pack
- **Roles:** `supabase_read_only_user`, `authenticator`, `postgres`
- **Total calls:** 1231 (`metadata` CTE), 216 (`pg_timezone_names`), 112/506/84 (table+column listings)
- **Total time:** 50,693 ms to 27,258 ms per query group
- **Observations:** Admin dashboards trigger broad catalog scans with long execution times (>40 ms).
- **Recommendations:**
  - Cache metadata payloads in application state and only refresh when schema migrations occur.
  - Restrict API consumers from issuing redundant catalog crawls by introducing rate limits or stronger RBAC policies.
  - Prefilter schemas/tables using allowlists to shorten result sets.

### 4. Function catalog exports (`pg_proc` joins)
- **Roles:** `supabase_admin`, `postgres`
- **Total calls:** 85 and 50, respectively
- **Total time:** 9,282 ms and 8,548 ms
- **Average latency:** 109–171 ms per call
- **Observations:** Wide CTE expansions with JSON aggregation place heavy load on `pg_proc`.
- **Recommendations:**
  - Materialize a daily function manifest table with triggers on `pg_proc` for incremental updates.
  - Limit exposed schemas to reduce the cardinality of JSON arrays.

### 5. Storage search and webhook traffic
- **Roles:** `service_role`, `postgres`
- **Queries:** `storage.search`, `net.http_post`
- **Total time:** 5,390 ms and 4,774 ms
- **Observations:** High P95 (118 ms) suggests underlying storage filters or external HTTP targets may be the bottleneck.
- **Recommendations:**
  - Profile storage filter predicates and add indexes for common `prefix`/`bucket_id` combinations.
  - Queue outbound webhooks through a job runner with retries instead of synchronous execution inside transactions.

## Systemic Actions
- Implement telemetry alerts that flag functions when call counts spike beyond historical baselines.
- Review Supabase Realtime configuration to minimize needless polling and adopt WebSocket keepalive optimizations.
- Apply caching and memoization for metadata-heavy routes, potentially via Edge Functions or CDN-backed APIs.
- Audit role permissions to ensure service roles are reserved for trusted backends; tighten per-query RBAC where feasible.

## Next Steps
1. Convene the platform team to validate batching and caching strategies for realtime consumers within the next sprint.
2. Create a Supabase performance dashboard tracking total time contribution per query family week over week.
3. Schedule autovacuum and job-runner tuning session focused on the HTTP queue tables.

By executing the remediation plan above, the team can reclaim significant database capacity while delivering faster response times to downstream services.
