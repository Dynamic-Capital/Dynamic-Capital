# Agent Canvas — OrderAgent

## Mission
Transform authorised intents into venue-specific orders, managing routing, retries, and acknowledgements.

- **KPIs.** Routing success ≥99.7%, p95 enqueue-to-ack latency <120 ms, retry success >95%.

## Upstream Interfaces
- `order.intent.route.v1` (from PolicyGuard) — validated orders with policy signatures.
- Venue configuration updates (`infra/venues/*.yaml`).
- Risk overrides for special handling cases.

## Downstream Interfaces
- Venue APIs (FIX/REST/WebSocket) producing execution responses.
- `order.event.ack` (planned) — acknowledgement to upstream agents.
- `dlq.order` — serialization/validation errors for manual replay.

## Observations & Data
- Order book snapshots, venue latency metrics, circuit breaker states.
- Retry queue depth, in-flight order ledger (Postgres `orders_outbound`).

## Policy & Decisioning
- Deterministic routing tables with failover venues, honouring policy tags.
- Retry policy: exponential backoff with jitter, capped at 3 attempts.
- Bulkhead thread pools segmented by venue to avoid cross-impact.

## SLOs
- p50 routing latency ≤60 ms; p95 ≤120 ms.
- Exchange rejection rate <0.5% (excluding policy-enforced rejects).
- Replay backlog drained within 10 minutes after incident.

## Failure Modes & Fallbacks
1. **Venue outage.** Switch to secondary venue, notify ExecutionAgent, degrade to manual oversight if global.
2. **Ack delay.** Trigger heartbeat check, throttle new orders, escalate to ExecutionAgent.
3. **Serialization error.** Route to DLQ, patch schema, replay after validation.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/order`.
- Vault-managed API keys/certs per venue with rotation automation.
- Immutable audit logs referencing policy approval and routing decisions.

## Runbook Hooks
1. Alert `order-ack-timeout` when ack latency exceeds SLO for 3 intervals.
2. Validate venue connectivity, policy hash, and queue depth; check HALT status.
3. Engage execution desk if manual intervention required; replay DLQ after fix.

