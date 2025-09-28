# Dynamic Capital Agent Layer

Agent canvases capture the contract-first interfaces, state, and guardrails for the Dynamic Capital trading MAS. Each subdirectory exposes a `canvas.md` with:

- Mission and primary KPIs
- Observations, actions, and state ownership
- Upstream and downstream interfaces (topics/contracts)
- Policies, SLOs, failure handling, security posture, and runbook triggers

## Agent Inventory

| Agent | Mission Snapshot | Primary Contracts |
| --- | --- | --- |
| MarketDataAgent | Normalise and stream curated ticks with <150 ms lag | `signal.event.opportunity.v1` (inputs to Signal) |
| SignalAgent | Score opportunities and publish intents above threshold | `signal.event.opportunity.v1` |
| PortfolioAgent | Allocate capital vs. risk budget | `portfolio.intent.allocate.v1`, `audit.event.allocation` |
| RiskAgent | Enforce limits, trim exposure, broadcast risk state | `risk.state.context.v1` |
| PolicyGuardAgent | Gate risky intents with policy packs and HALT controls | `order.intent.route.v1` |
| OrderAgent | Route approved orders to venues, manage retries | `order.intent.route.v1`, `order.event.ack` (planned) |
| ExecutionAgent | Track exchange fills, compute slippage, ack routing | `execution.event.fill.v1` |
| HedgerAgent | Net exposures and request hedges/offsets | `hedger.intent.cover` / `hedger.event.cover` (planned) |
| ComplianceAgent | Monitor obligations, escalate violations | `compliance.event.alert.v1` |
| ReporterAgent | Publish consolidated operational + PnL snapshots | `reporter.event.snapshot.v1` |

Support agents (Housekeeping, Optimizer, Orchestrator) will reuse the same template when introduced.

## How to Update a Canvas

1. Edit the relevant `canvas.md` to reflect new contracts, SLOs, or policies.
2. Cross-check the Back-to-Back interface map in [`../README.md`](../README.md) and update if adjacencies change.
3. Attach supporting policy/config changes within the same PR.
4. Run `npm run format` to keep markdown styled consistently.

