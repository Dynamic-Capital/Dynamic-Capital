# TonAPI Connectivity Options

This note audits TonAPI’s connectivity surfaces and maps how to optimize their
usage back-to-back across Dynamic Capital workflows. It extends beyond interface
summaries to cover observability, security, and operating rhythms so teams can
execute an end-to-end integration program without guesswork.

## Quick Reference

| Capability    | Ideal Use Case                                                          | Authentication                                                | Notable Limits                                             |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| LiteServers   | Proof-backed historical or low-level state queries                      | Ed25519 server keys, optional `global.config.json`            | 10-second sliding window, ~50 RPS on standard plans        |
| Webhooks API  | Production event ingestion with retries and delivery telemetry          | Private API key (`Authorization: Bearer` or `token` param)    | Endpoint health checks, retry backoff, per-endpoint quotas |
| Streaming API | Short-term diagnostics, rapid prototyping, or bursty monitoring         | Optional API key (recommended), unauthenticated access capped | Concurrent connection ceilings, marked deprecated          |
| TonAPI Embed  | Self-hosted mirror of TonAPI for air-gapped or sovereignty requirements | Managed via LiteServer keys plus local secrets vault          | Requires self-managed scaling, data parity checks          |

## End-to-End Audit Framework

Use this framework to evaluate existing TonAPI integrations or blueprint new
deployments. Each phase outputs evidence that feeds the next one, ensuring
coverage from infrastructure to business readiness.

### Phase 1 — Current-State Discovery

1. **Inventory connectivity.** Capture every Dynamic Capital workload touching
   TonAPI, the surface used (LiteServers, Webhooks, Streaming), and the data
   classification handled.
2. **Document dependencies.** Map out upstream configuration repos, CI/CD
   pipelines, secrets managers, and monitoring stacks supporting each
   integration.
3. **Score criticality.** Assign impact tiers (mission-critical, important,
   experimental) to prioritize remediation sequencing.

### Phase 2 — Connectivity Validation

1. **LiteServers** — Verify both redundant endpoints are live, confirm proofs
   are being validated, and log rate-limit telemetry.
2. **Webhooks** — Review subscription definitions, replay recent delivery
   failures, and ensure signature verification is enforced.
3. **Streaming** — Check connection ceilings versus active consumers, and
   confirm prototype dashboards flag the impending deprecation.
4. **TonAPI Embed** — Confirm embedded nodes synchronize within five blocks of
   public TonAPI, and validate backup/restore jobs.

### Phase 3 — Security & Compliance Review

1. Ensure all credentials (Ed25519 keys, API tokens) rotate on the corporate
   cadence and are stored in approved secret stores.
2. Validate ingress controls: firewall allowlists for LiteServers, webhook
   endpoint authentication, and TLS certificates.
3. Capture audit artifacts—proof validation logs, delivery receipts, access
   reviews—for quarterly compliance packs.
4. Register TonAPI Embed hosts with infrastructure security to inherit
   vulnerability scanning and patch rotations.

### Phase 4 — Reliability & Performance Testing

1. Execute load tests for LiteServer query bursts and webhook event spikes based
   on projected business volumes.
2. Simulate failure cases (endpoint downtime, webhook retries exhausted,
   streaming disconnects) to confirm automated recovery.
3. Benchmark latency budgets per workflow, documenting current versus target
   thresholds.
4. Run catch-up drills for TonAPI Embed by replaying 24 hours of blocks and
   measuring state divergence.

### Phase 5 — Operationalization & Governance

1. Define owners, runbooks, and SLIs/SLAs for each connectivity surface.
2. Integrate alerts into on-call rotations and ensure observability dashboards
   surface rate-limit, delivery, and connection metrics.
3. Schedule quarterly TonAPI roadmap reviews to retire deprecated usage and
   onboard new features.
4. Align TonAPI Embed lifecycle management (upgrades, snapshot trims) with
   corporate change windows.

## LiteServers

TonAPI LiteServers expose the Lite API via managed infrastructure, providing
authenticated and proof-verified access to the TON blockchain.

### Why choose LiteServers?

- Managed maintenance and automatic archival updates remove operational toil.
- Consensus drift protections ensure data parity with the canonical chain.
- Historical coverage includes the earliest TON blocks for audit workflows.
- Each plan provisions two redundant endpoints to simplify failover design.

### Implementation Checklist

1. Download the plan-specific `global.config.json` or copy the advertised server
   addresses and Ed25519 keys.
2. Connect through a Liteclient-compatible library and verify the initial
   handshake proofs.
3. Monitor rate limits by calling `liteProxy.getRequestRateLimit`; standard
   plans allow roughly 50 requests per 10-second window.
4. Instrument fallback logic so both provisioned endpoints stay healthy.
5. Include LiteServer endpoints in the enterprise configuration registry so
   emergency rotations propagate automatically.

### Observability Checklist

- Ship LiteServer proofs and latency telemetry to the TON connectivity dashboard
  alongside Webhooks and Embed metrics.
- Alert when per-endpoint RPS exceeds 70% of quota for three consecutive
  windows.
- Track peer latency variance to detect upstream congestion before it impacts
  end users.

## Webhooks API

The Webhooks API delivers push-based events and is TonAPI’s recommended
production interface for real-time integration.

### Key Capabilities

- Subscriptions cover account transactions, contract deployments, and TL opcode
  pattern matches.
- Delivery includes retries, status dashboards, and failure telemetry to aid
  incident response.
- Testnet parity is available at `rt-testnet.tonapi.io`, enabling dry runs
  before mainnet go-live.

### Implementation Checklist

1. Register webhook endpoints and store the private API key securely (Bearer
   token or `token` query parameter).
2. Attach subscriptions per use case; isolate high-volume TL opcode filters into
   dedicated endpoints.
3. Validate inbound signatures or shared secrets before acknowledging payloads.
4. Track retry counts and automate alerting for endpoints approaching failure
   thresholds.
5. Bundle webhook schema contracts into CI so incompatible endpoint changes fail
   builds early.

### Operational Runbooks

- Version webhook subscriptions and store change logs in the integration repo
  for reproducibility.
- Publish a weekly delivery summary (success rate, retries, poison queue
  extractions) to the on-call channel.
- Triage dead-letter payloads within 24 hours and document root causes in the
  incident knowledge base.

## Streaming API (Deprecated)

The Streaming API (SSE/WebSocket) remains online but is marked deprecated in
favor of Webhooks for long-lived production systems.

### When Streaming Still Helps

- Exploratory dashboards that benefit from unauthenticated, low-friction access.
- Short-lived diagnostic tooling where connection ceilings and burst limits are
  acceptable.
- Latency-sensitive experiments needing mempool visibility before webhook
  subscriptions are finalized.

### Implementation Checklist

1. Prefer authenticated sessions even when optional to avoid anonymous
   throttling.
2. Scope subscriptions to specific accounts (up to 1,000 per connection) or
   mempool channels to reduce noise.
3. Plan a migration runway to Webhooks because deprecated services can wind down
   with limited notice.
4. Gate experimental dashboards behind feature flags to decouple them from
   production readiness.

### Exit Strategy Signals

- Maintain a rolling 30-day backlog of streaming feature parity gaps so product
  teams can validate migrations.
- Mark dashboards that still depend on Streaming in the monitoring catalog and
  assign sunset owners.
- Capture lessons learned from each migration sprint and feed them into TonAPI
  Embed/Webhooks playbooks.

## TonAPI Embed

TonAPI Embed offers an on-premise indexer that mirrors TonAPI features for teams
that require sovereign infrastructure, air-gapped operations, or advanced
customization.

### Why TonAPI Embed Matters

- Eliminates external dependency risk for mission-critical workflows that cannot
  tolerate SaaS outages.
- Enables custom retention, enrichment, and local compliance filtering before
  data leaves the organization.
- Provides a controlled staging arena to rehearse chain upgrades and topology
  changes before production rollout.

### Implementation Checklist

1. Provision LiteServer connectivity plus internal Postgres/ClickHouse backends
   sized for target ledger history.
2. Enforce secrets management through the corporate vault and rotate access
   tokens alongside LiteServer keys.
3. Schedule block-diff verification jobs comparing Embed data with the managed
   TonAPI surface every hour.
4. Establish snapshotting and disaster recovery drills so nodes can be rebuilt
   within four hours.
5. Integrate Embed observability into the same dashboards that track
   LiteServer/Webhook health for unified coverage.

### Connectivity Playbooks

- Pair Embed with LiteServers for cross-verification: discrepancies above 0.5%
  trigger manual investigation.
- Use Embed to serve high-volume historical queries while reserving managed
  TonAPI for low-latency event triggers.
- When migrations require maintenance freezes, redirect Webhooks to
  Embed-derived queues to prevent gaps.

## Optimization Roadmap

Translate audit findings into an execution plan using the following time
horizons:

### 0–2 Weeks (Stabilize)

- Close gaps surfaced in Phases 2–3, especially proof validation, webhook
  authentication, and secrets storage.
- Normalize monitoring by exporting LiteServer rate metrics, webhook delivery
  stats, and streaming disconnect counts into centralized dashboards.
- Draft rollback procedures for each connectivity surface and validate they are
  stored alongside on-call runbooks.

### 3–6 Weeks (Optimize)

- Right-size LiteServer capacity by aligning RPS usage with subscription tiers
  and negotiating plan upgrades if sustained >70% utilization.
- Implement contract testing for webhook payloads and add synthetic transactions
  to detect data drifts.
- Consolidate streaming workloads by migrating long-lived consumers to Webhooks
  while preserving exploratory sandboxes.
- Stand up TonAPI Embed pilots with read-only workloads and capture
  infrastructure lessons before scaling.

### 6+ Weeks (Evolve)

- Automate quarterly TonAPI roadmap reviews and feed findings into Dynamic
  Capital’s architecture council.
- Introduce scenario simulations that combine LiteServer historical replays with
  webhook event stress tests to validate business continuity.
- Evaluate hybrid strategies (e.g., caching LiteServer responses, batching
  webhook acknowledgments) to reduce latency and operating cost.
- Document TonAPI Embed production readiness criteria (HA posture, recovery
  point objectives) and socialize them with governance leads.

## Integration Planning

Follow these steps to select and operate the right mix of TonAPI connectivity
options:

1. **Define the data surface.** Separate proof-backed state queries
   (LiteServers) from push notifications (Webhooks) and experiments (Streaming).
2. **Design redundancy back-to-back.** Combine LiteServer endpoint pairs with
   webhook retry policies for continuous coverage.
3. **Model rate and volume.** Size LiteServer RPS windows, webhook event
   throughput, and streaming connection caps before launch.
4. **Automate observability.** Collect rate-limit metrics, webhook delivery
   stats, streaming connection health, and TonAPI Embed sync status inside
   Dynamic Capital monitoring.
5. **Revisit quarterly.** Re-audit TonAPI updates so deprecated surfaces are
   replaced proactively and new features are onboarded quickly.
6. **Codify continuity** by rehearsing failover between managed TonAPI and
   Embed-backed services twice per year.

Combining LiteServers for data integrity, Webhooks for durable event processing,
Streaming for specialized diagnostics, and TonAPI Embed for sovereignty gives
Dynamic Capital comprehensive coverage while aligning with TonAPI’s roadmap.
