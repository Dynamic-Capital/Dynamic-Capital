# Agent Canvas — PortfolioAgent

## Mission
Allocate capital across qualified opportunities to maximise risk-adjusted return while respecting capital and policy constraints.

- **KPIs.** Portfolio turnover <1.5× daily, expected Sharpe >1.2, p95 decision latency <150 ms.

## Upstream Interfaces
- `signal.event.opportunity.v1` — scored opportunities with `idempotency_key` and confidence > configured threshold.
- `risk.state.context.v1` — latest exposure bands, VaR budgets, and trim recommendations.
- `policies/portfolio/*.toml` — policy pack snapshots with utility weights and constraints.

## Downstream Interfaces
- `portfolio.intent.allocate.v1` — allocation intents with exposure deltas, reason codes, and `correlation_id`.
- `audit.event.allocation` — structured rationale for each decision (link to policy hash).
- `hedger.intent.cover` — optional hedge requests when positions require offsetting.

## Observations & Data
- Portfolio state snapshots (`portfolio.state.nav`, `portfolio.state.position`).
- Scenario stress tests stored in MinIO (`sim/portfolio/*`).
- Cached NAV/exposure metrics in Redis (`portfolio.metrics`).

## Policy & Decisioning
- Utility function `U = α·R − β·σ − γ·C` with weights from policy config.
- Hard constraints: max leverage 8×, per-symbol VaR limits, liquidity tiers.
- Adaptive rebalancing frequency derived from queue length + market volatility bands.

## SLOs
- p50 latency ≤60 ms; p95 latency ≤140 ms.
- Throughput ≥500 allocation intents/second sustained.
- Constraint violation rate <0.5% of intents.

## Failure Modes & Fallbacks
1. **Constraint breach.** Auto-trim position, notify PolicyGuard, emit audit with remediation tag.
2. **NAV stale.** Fetch backup snapshot, degrade to conservative sizing until cache recovers.
3. **Optimizer offline.** Switch to deterministic fallback (equal-weight allocations) and raise housekeeping ticket.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/portfolio` for mTLS mesh auth.
- Vault-provisioned Postgres credentials (15-minute TTL) and MinIO scoped tokens.
- Encrypt scenario files at rest; restrict access to compliance/portfolio scopes only.

## Runbook Hooks
1. Alert `portfolio-constraint-violation` fires after >3 breaches in 5 minutes.
2. Investigate policy version drift, exposure metrics, Redis TTLs, and pending HALT signals.
3. Apply safe mode (reduced size factor), coordinate HALT if systemic, replay DLQ entries after remediation.

