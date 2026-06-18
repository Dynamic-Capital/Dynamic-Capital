# Agent Canvas — ExecutionAgent

## Mission
Capture venue fills, reconcile order states, and publish execution metrics for hedging and reporting.

- **KPIs.** Fill ingestion completeness 100%, p95 reconciliation latency <150 ms, slippage computation accuracy within 2 bps.

## Upstream Interfaces
- Venue execution streams (FIX drop copy, REST callbacks, WebSocket fills).
- `order.intent.route.v1` acknowledgements for correlation IDs.

## Downstream Interfaces
- `execution.event.fill.v1` — fill events with price, quantity, slippage metrics.
- `audit.event.execution` — reconciliation logs and venue health states.
- `dlq.execution` — malformed or out-of-order fill events.

## Observations & Data
- Postgres tables `executions`, `fills_pending`, `slippage_metrics`.
- Redis caches for in-flight orders awaiting fills.
- Latency monitors per venue and reconciliation backlog metrics.

## Policy & Decisioning
- Deterministic reconciliation tying fills to orders via `correlation_id` and `msg_id`.
- Slippage calculation using benchmark price from MarketDataAgent snapshots.
- Auto-halt triggers if fill confirmations exceed SLA thresholds.

## SLOs
- p50 fill processing latency ≤80 ms; p95 ≤150 ms.
- Reconciliation backlog cleared within 2 minutes.
- Duplicate fill detection <0.02%.

## Failure Modes & Fallbacks
1. **Fill delay.** Notify OrderAgent, request venue status, and hedge using estimated fills if risk requires.
2. **Mismatch.** Flag to Compliance, hold downstream events, manual reconciliation before release.
3. **Feed outage.** Switch to backup feed, degrade slippage metrics to best-effort.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/execution`.
- Vault rotates venue credentials; encrypt fill archives in MinIO.
- Immutable audit events stored for regulatory retention.

## Runbook Hooks
1. Alert `execution-fill-lag` when backlog >2 minutes or p95 latency exceeds SLO.
2. Validate venue connectivity, order ledger state, and correlation IDs.
3. Coordinate with Hedger for provisional coverage; replay DLQ after reconciliation.

