# Agent Canvas — ComplianceAgent

## Mission
Monitor trading activity for regulatory adherence, escalate violations, and manage attestations.

- **KPIs.** Alert detection accuracy ≥98%, false positive rate <5%, response dispatch <2 minutes.

## Upstream Interfaces
- `execution.event.fill.v1` — fills for surveillance checks.
- `hedger.event.cover` — hedge confirmations with compliance annotations.
- `audit.event.*` — risk, policy, and order audit trails for correlation.

## Downstream Interfaces
- `compliance.event.alert.v1` — alerts with severity, remediation guidance, and correlation IDs.
- Regulatory reporting pipelines (S3 snapshots, secure FTP batches).
- `audit.event.compliance` — evidence for investigations and attestation logs.

## Observations & Data
- Rule engines (wash trade, spoofing, position limits) stored in Postgres.
- Case management system statuses.
- Regulatory calendar and blackout schedules.

## Policy & Decisioning
- Deterministic rules (thresholds, pattern detection) combined with ML classifiers for anomaly detection.
- Policy pack ensures jurisdiction-specific obligations and retention requirements.
- HALT acknowledgement required before closing escalations.

## SLOs
- Alert publishing latency ≤60 seconds from triggering event.
- Case triage completion within 15 minutes for severity ≥High.
- Audit log completeness 100% per daily reconciliation.

## Failure Modes & Fallbacks
1. **Alert storm.** Rate-limit duplicates, cluster by correlation ID, coordinate with PolicyGuard for HALT evaluation.
2. **Rule drift.** Revert to previous policy pack, run regression suite, notify legal/compliance leads.
3. **Reporting outage.** Queue reports in MinIO, trigger manual submission process.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/compliance`.
- Vault-managed credentials for regulatory endpoints; field-level encryption on PII.
- Immutable audit store with daily hash chain snapshots to S3.

## Runbook Hooks
1. Alert `compliance-alert-storm` when >N alerts/minute sustained.
2. Validate policy versions, rule engine status, and regulatory calendar.
3. Engage compliance leads, document incident, replay queued reports post-resolution.

