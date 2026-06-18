# Agent Canvas — HedgerAgent

## Mission
Offset residual exposures by executing hedging strategies across correlated instruments while preserving capital efficiency.

- **KPIs.** Hedge coverage ≥95% within target window, p95 decision latency <180 ms, hedge slippage <3 bps.

## Upstream Interfaces
- `execution.event.fill.v1` — realised fills and residual exposures.
- `portfolio.intent.allocate.v1` — target exposures for context.
- `risk.state.context.v1` — limits and remaining headroom for hedges.

## Downstream Interfaces
- `hedger.intent.cover` (outgoing) — hedge execution requests (to OrderAgent once implemented).
- `hedger.event.cover` — confirmations sent to Risk and Compliance.
- `audit.event.hedger` — rationale for hedge strategies and parameters.

## Observations & Data
- Correlation matrices, hedge ratios, liquidity tiers stored in Postgres/Redis.
- Historical hedge effectiveness metrics in MinIO for analysis.

## Policy & Decisioning
- Optimisation routine selects hedge instruments based on risk-adjusted utility.
- Enforce do-not-trade lists and stress constraints from PolicyGuard.
- HALT compliance: stop initiating new hedges; unwind only if instructed via policy.

## SLOs
- p50 hedge decision latency ≤100 ms; p95 ≤180 ms.
- Hedge completion within 2 minutes of residual exposure detection.
- Hedge failure rate <1% per day.

## Failure Modes & Fallbacks
1. **Liquidity shortfall.** Switch to secondary instruments, escalate to Portfolio/Risk.
2. **Correlation breakdown.** Increase hedge ratio uncertainty buffer, notify PolicyGuard.
3. **Order channel outage.** Queue hedge intents, coordinate manual hedging via desk.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/hedger`.
- Vault-managed credentials for hedge venues; encryption for correlation data sets.
- Audit trail includes policy hash, hedge ratio source, and decision timestamp.

## Runbook Hooks
1. Alert `hedger-coverage-gap` when hedge coverage <95% for >5 minutes.
2. Inspect exposure residuals, venue availability, and policy overrides.
3. Engage manual desk and compliance; replay queued hedges post-resolution.

