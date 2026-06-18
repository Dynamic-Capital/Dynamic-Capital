# Agent Canvas — ReporterAgent

## Mission
Aggregate trading, risk, and compliance signals into actionable dashboards and regulatory snapshots.

- **KPIs.** Snapshot freshness ≤5 minutes, p95 aggregation latency <120 ms, data quality issues <0.5%.

## Upstream Interfaces
- `execution.event.fill.v1`, `risk.state.context.v1`, `compliance.event.alert.v1` — primary telemetry streams.
- Business KPIs from analytics warehouse (via read replicas).
- Policy versions to annotate reports.

## Downstream Interfaces
- `reporter.event.snapshot.v1` — consolidated operational + financial metrics.
- Grafana dashboards (JSON in `ops/dashboards/`).
- Regulatory/board reports exported to S3 + Slack/Email alerts.

## Observations & Data
- Warehouse tables (`pnl_daily`, `risk_overview`, `compliance_cases`).
- Redis caches for live metrics and SLA tracking.
- Metadata store for report lineage and versions.

## Policy & Decisioning
- Schedule-driven aggregation with on-demand triggers for incidents.
- Quality gates: schema validation, null checks, SLO budgets.
- HALT annotation to highlight paused flows.

## SLOs
- Snapshot publish latency ≤120 ms after data availability.
- Data completeness 100% for mandatory fields.
- Notification delivery success ≥99%.

## Failure Modes & Fallbacks
1. **Data lag.** Retry ingestion, fall back to last-known-good snapshot with stale flag.
2. **Quality failure.** Halt publication, notify stakeholders, execute remediation checklist.
3. **Export failure.** Queue snapshots for re-export, escalate to ops team.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/reporter`.
- Vault-issued credentials for warehouse and storage targets.
- Encrypt exported reports, apply retention policies per jurisdiction.

## Runbook Hooks
1. Alert `reporter-stale-snapshot` when freshness exceeds 5 minutes.
2. Inspect upstream stream health, quality gate logs, and policy annotations.
3. Publish interim status update, remediate, then replay missed snapshots.

