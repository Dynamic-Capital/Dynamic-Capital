# Agent Canvas — MarketDataAgent

## Mission
Ingest, cleanse, and normalise raw market feeds into deterministic event streams with <150 ms wall-clock lag.

- **KPIs.** Feed uptime 99.95%, p95 normalisation latency <75 ms, duplication rate <0.01%.

## Upstream Interfaces
- External venues/brokers (FIX, WebSocket, REST) secured via dedicated connectors.
- Housekeeping maintenance alerts for data centre or venue outages.

## Downstream Interfaces
- `signal.event.opportunity.v1` — curated tick/feature snapshots for SignalAgent.
- `audit.event.marketdata` — pipeline health metrics for observability.
- `dlq.marketdata` — schema or signature failures routed for replay tooling.

## Observations & Data
- Latency monitors per venue, reference data caches (`marketdata.reference.*` in Redis).
- Schema registry for incoming feed definitions.
- Circuit breaker states and throttling counters persisted in Postgres.

## Policy & Decisioning
- Deterministic enrichment and dedupe keyed by `(symbol, ts, source_id)`.
- Backpressure logic: pause ingestion when downstream lag > configured threshold.
- HALT command triggers immediate stream suspension with health probe downgrade.

## SLOs
- p50 processing latency ≤40 ms; p95 ≤75 ms.
- Error budget: <0.1% malformed events per rolling hour.
- Recovery: failover to secondary venue within 30 seconds.

## Failure Modes & Fallbacks
1. **Feed drift.** Detect schema mismatch, route to DLQ, notify SignalAgent of pause.
2. **Latency spike.** Enable throttling, shard ingestion workers, escalate to infrastructure team.
3. **Venue outage.** Switch to redundant source, flag reduced confidence to downstream consumers.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/marketdata` for mesh auth.
- Secrets managed via Vault dynamic credentials per venue connector.
- Encrypt stored historical ticks in MinIO with compliance retention policy.

## Runbook Hooks
1. Alert `marketdata-latency` when p95 >75 ms for 3 intervals.
2. Verify connector health, schema registry version, and Kafka lag.
3. If unresolved, trigger HALT for affected symbols and engage vendor escalation.

