# Agent Canvas — RiskAgent

## Mission
Continuously enforce risk, leverage, and compliance constraints before orders advance downstream.

- **KPIs.** Policy compliance rate ≥99.5%, p95 evaluation latency <110 ms, trim effectiveness >90%.

## Upstream Interfaces
- `portfolio.intent.allocate.v1` — proposed allocations with exposure deltas and rationales.
- `hedger.event.cover` (future) — hedge outcomes influencing available headroom.
- Policy packs (`policies/risk/*.toml`) — limits, VaR thresholds, leverage caps.

## Downstream Interfaces
- `risk.state.context.v1` — approved sizes, trims, warnings, and compliance annotations.
- `audit.event.risk` — decision logs with policy hash + triggered checks.
- `dlq.risk` — validation failures for forensic replay.

## Observations & Data
- Postgres tables: `risk_limits`, `risk_breaches`, `exposure_snapshots`.
- Redis caches for intra-day exposure and headroom metrics.
- External regulatory feed statuses (trading halts, symbol suspensions).

## Policy & Decisioning
- Deterministic rules for leverage, VaR, concentration; sequential evaluation ensures reproducibility.
- Probabilistic stress checks for scenarios >95th percentile.
- HALT intent from PolicyGuard enforces zero exposure expansion.

## SLOs
- p50 evaluation latency ≤70 ms; p95 ≤110 ms.
- Error budget: <0.3% of intents require manual intervention.
- State broadcast lag <250 ms from receipt.

## Failure Modes & Fallbacks
1. **Policy mismatch.** Halt allocations, sync policy version, notify Portfolio + PolicyGuard.
2. **Exposure cache stale.** Recompute from Postgres baseline, throttle throughput until refreshed.
3. **Reg feed outage.** Apply conservative limits, escalate to compliance for manual oversight.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/risk`.
- Vault rotates DB creds every 10 minutes; restricts policy files to risk/compliance scopes.
- Sign risk outputs to support non-repudiation in audit trail.

## Runbook Hooks
1. Alert `risk-policy-drift` when policy hash differs across agents.
2. Confirm schema versions, recompute exposures, and verify HALT channel status.
3. Resume allocations progressively; replay DLQ after verifying trims.

