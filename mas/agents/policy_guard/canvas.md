# Agent Canvas — PolicyGuardAgent

## Mission
Act as a safety gate for high-risk intents, enforcing policy packs, segregation of duties, and kill-switch compliance.

- **KPIs.** Policy enforcement success ≥99.9%, p95 review latency <90 ms, HALT propagation <5 seconds.

## Upstream Interfaces
- `risk.state.context.v1` — trimmed allocations and risk context.
- Policy pack updates from `policies/*` via control plane.
- Governance approvals (manual overrides) stored in `ops/runbooks` references.

## Downstream Interfaces
- `order.intent.route.v1` — signed and authorised orders ready for routing.
- `system.halt.intent` — kill-switch broadcast to all agents.
- `audit.event.policy` — compliance log with reviewer, policy hash, and action.

## Observations & Data
- Policy hash matrix across agents to detect drift.
- Pending override queue with expiry timers.
- HALT acknowledgement receipts from each agent.

## Policy & Decisioning
- Deterministic evaluation of risk policy packs (TOML) and compliance checklists.
- Manual override workflow requires dual approval and expiry to auto-revoke.
- Rate limiting to prevent policy bypass spamming; enforces exponential backoff.

## SLOs
- p50 evaluation latency ≤45 ms; p95 ≤90 ms.
- HALT propagation acknowledgement within 5 seconds.
- Override queue processing <1 minute average.

## Failure Modes & Fallbacks
1. **Policy drift.** Block outbound intents, resync policies, notify risk/compliance teams.
2. **Override backlog.** Escalate to governance, auto-expire stale overrides, increase staffing.
3. **HALT failure.** Trigger redundancy path via control plane, verify agent heartbeats, escalate incident severity.

## Security & Compliance
- SPIFFE SVID `spiffe://dynamic.capital/agent/policyguard`.
- Vault-signed approvals, tamper-evident audit logs, OPA policies for authZ.
- Strict segregation: no direct market connectivity; only policy evaluation privileges.

## Runbook Hooks
1. Alert `policy-halt-miss` when HALT acknowledgements fall below 100%.
2. Check policy hashes, override queue size, and audit log integrity.
3. Engage governance bridge, enforce manual halt if automation fails, document incident.

