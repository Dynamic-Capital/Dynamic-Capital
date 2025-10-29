# Agent Canvas — SignalAgent

## Mission
Transform curated market events into scored trading opportunities while enforcing explainability and guardrails.

- **KPIs.** Precision ≥65% on executed signals, recall ≥55%, p95 scoring latency <120 ms.

## Upstream Interfaces
- `signal.event.opportunity.v1` (from MarketDataAgent) — deduplicated ticks/features.
- Feature store snapshots (`signal.features.*` in Redis/MinIO).
- Model registry updates (versioned ML artefacts via MinIO + policy approvals).

## Downstream Interfaces
- `signal.event.opportunity.v1` (outgoing) — enriched opportunities with scores, tags, and `idempotency_key`.
- `audit.event.signal` — model provenance, feature attribution, drift metrics.
- `dlq.signal` — failed validations for replay/simulation.

## Observations & Data
- Feature windows, drift detectors, concept drift alerts.
- Latency metrics per model variant, queue depth monitors.

## Policy & Decisioning
- Score threshold defined via policy pack (`policies/signal/*.toml`).
- Bandit orchestrator selects between model variants with exploration cap.
- HALT compliance: stop signal emission if PolicyGuard issues HALT intent.

## SLOs
- p50 scoring latency ≤70 ms; p95 ≤120 ms.
- Drift detection MTTA <5 minutes.
- False-positive rate (signals rejected by Portfolio) <15%.

## Failure Modes & Fallbacks
1. **Model drift.** Switch to baseline model, alert ML ops, increase monitoring frequency.
2. **Feature lag.** Serve cached features, lower frequency, flag reduced confidence downstream.
3. **Queue saturation.** Scale Ray actors or throttle ingestion, coordinate with MarketDataAgent.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/signal`.
- Vault-issued credentials for feature store and MinIO artefacts.
- Record model hashes and approvals in immutable audit topic.

## Runbook Hooks
1. Alert `signal-drift` triggered by KS test failure or drift > threshold.
2. Validate model/version, feature freshness, and policy hash alignment.
3. Engage ML ops to retrain or roll back; replay DLQ once fixed.

