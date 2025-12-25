# Dynamic AGI Multi-Agent System (MAS)

A blueprint for orchestrating Dynamic Capital's autonomous trading agents with hardened contracts, governance, and observability.

## Quick Navigation

| Area | Purpose | Key Artifacts |
| --- | --- | --- |
| [`agents/`](agents/README.md) | Agent canvases and interface maps | `*/canvas.md` |
| [`contracts/`](contracts/README.md) | JSON Schemas + envelope definitions | `*.json` |
| [`policies/`](policies/README.md) | Guardrail policy packs (TOML) | `trading_risk_v1.toml` |
| [`infra/`](infra/README.md) | Deployment guides, Helm/Argo hooks | `k8s/`, `argo/` (pending) |
| [`ops/`](ops/README.md) | Dashboards, runbooks, SLO tracking | `dashboards/mas-overview.json` |
| [`sim/`](sim/README.md) | Replay, Monte Carlo, scenario tooling | `notebooks/`, `replayers/` (planned) |
| [`tools/`](tools/README.md) | Schema + load test utilities | `schema-reg/`, `canary/` (planned) |

## One-Page Snapshot

- **Goal.** Build a resilient, scalable Dynamic AGI execution fabric composed of autonomous agents that coordinate through versioned message contracts—never shared mutable state.
- **Default Stack.** Python • Ray (actors) • FastAPI • Kafka • Postgres • Redis • MinIO/S3 • Kubernetes (ArgoCD) • OpenTelemetry + Prometheus/Grafana • Vault • Istio (mTLS).
- **Non-negotiables.** Versioned schemas, idempotent handlers, dead-letter queues (DLQs), per-agent p95 SLOs, inline policy gate for risky intents, system-wide kill-switch.

## System Principles

1. **Autonomy.** Each agent owns local state and decision logic—no global brain.
2. **Contract-first.** Message schemas function as APIs and are strictly validated.
3. **Loose coupling.** Prefer pub/sub over direct calls; avoid shared database writes.
4. **Safety by design.** Enforce timeouts, retries with jitter, circuit breakers, and HALT intents.
5. **Observability.** Trace every decision from observation → action → outcome.
6. **Evolvability.** Semantic versioning for all messages, policies, and telemetry contracts.

## Architecture Overview

| Layer | Responsibilities | Default Choices |
| --- | --- | --- |
| Edge | Bridges to markets, bots, sensors, mobile apps | MT5 bridge, client SDKs |
| Agent Runtime | Containerised agents (Ray or Kubernetes) | Docker + Ray on K8s |
| Comms Bus | Durable pub/sub topics | Kafka (`*.intent`, `*.event`, `*.state`, `*.audit`, `*.dlq`) |
| State | Durable + cached stores | Postgres, Redis, MinIO/S3 |
| Control Plane | Scaling, canary, feature flags, policy rollout | Orchestrator agent + ArgoCD |
| Observability | Traces, metrics, logs | OpenTelemetry → Prom/Grafana; logs → ELK/ClickHouse |
| Security | Identity, secrets, policy enforcement | Istio mTLS, SPIFFE IDs, Vault, OPA |

## Trading Flow (Dynamic Capital)

Primary chain: **MarketData → Signal → Portfolio → Risk → PolicyGuard → Order → Execution → Hedger → Compliance → Reporter**. Supporting agents (Housekeeping, Optimizer, Orchestrator) coordinate capacity, maintenance, and control-plane workflows.

### Back-to-Back Interface Map

| Upstream → Downstream | Contract(s) | Core Expectation |
| --- | --- | --- |
| MarketData → Signal | `signal.event.opportunity.v1` | Deduplicated, normalised tick streams with max 150 ms lag |
| Signal → Portfolio | `signal.event.opportunity.v1` | Score >|= thresholds; idempotent `idempotency_key` |
| Portfolio → Risk | `portfolio.intent.allocate.v1` | Allocation intents include exposure deltas + reason codes |
| Risk → PolicyGuard | `risk.state.context.v1` | Risk trims + compliance flags propagate within 300 ms |
| PolicyGuard → Order | `order.intent.route.v1` | Signed intents post policy approval; attachments reference policy hash |
| Order → Execution | `order.intent.route.v1` | Routed orders acked within 2× exchange SLA |
| Execution → Hedger | `execution.event.fill.v1` | Fill batches include PnL attribution + hedge hints |
| Hedger → Compliance | `hedger.event.cover` (planned) | Hedging summaries with regulatory annotations |
| Compliance → Reporter | `compliance.event.alert.v1` | Alerts w/ severity; reporter snapshots aggregated hourly |

### Decision Building Blocks

- Reactive rules (complex event processing) for fast guardrails.
- Deliberative planners (goal stack + A*/PDDL-lite) for multi-step allocations.
- Contextual bandits for policy selection vs. exploration.
- Reinforcement learning for allocation sizing (bounded by policy constraints).
- Negotiation utilities `U = α·R − β·σ − γ·C` tuned via configuration.

## Delivery Lifecycle

1. **Design.** Approve schemas + policies before code. Update canvases with interface changes.
2. **Develop.** TDD: unit + contract tests. Ensure idempotent handlers and deterministic retries.
3. **Build.** Docker images, Trivy scans, SBOM emission.
4. **Validate.** `npm run lint`, `npm run typecheck`, targeted agent tests, schema diff review.
5. **Release.** ArgoCD canary (10% → 50% → 100%) with synthetic topic publishers.
6. **Observe.** Promote only when error <1% and p95 latency within SLO. Rollback via feature flags + HALT drill.

## Observability & SLOs

- **Per agent.** p50/p95 latency, TPS, error %, CPU/RAM, queue lag.
- **Flow.** Time-to-decision, time-to-actuation, success ratio.
- **Business.** PnL, drawdown, Sharpe, slippage.
- Dashboards: see [`ops/dashboards/mas-overview.json`](ops/dashboards/mas-overview.json).
- Alerts: trigger when p95 > target across 3 intervals or DLQ rate spikes beyond runbook thresholds.

## Governance & Risk

- PolicyGuard gates high-risk intents (trades, hedges, device switches).
- Kill switch: `system.halt.intent` must be honoured by every agent.
- Data minimisation + field-level encryption + immutable audit topic.
- Change management: 2 reviewers + simulation evidence for policy/contract PRs.

## Testing & Simulation

- **Trace replay.** Historical day(s) to measure end-to-end KPIs.
- **Chaos.** Kill pods, inject latency, drop partitions; verify fallbacks.
- **Fuzzing.** Payload mutation + schema evolution verification.
- **Soak.** 24–72 h to watch memory, handle counts, backpressure.

## Security Hardening

- SPIFFE/SPIRE SVIDs + Istio mTLS across mesh.
- OPA policies enforce authZ by message type/intent/scope.
- Replay protection via `ttl_ms`, nonces, skew enforcement.
- Vault-managed secrets; ephemeral DB credentials; per-agent rate limits.

## 30-60-90 Implementation Roadmap

| Phase | Focus | Outcomes |
| --- | --- | --- |
| Day 0–30 | Stand up Kafka/Ray, implement 3 core agents, add metrics, DLQ, kill switch, run 24 h soak + chaos kill test | Foundational runtime + baseline telemetry |
| Day 31–60 | Add PolicyGuard + audit topic, introduce trace replay + baseline KPIs, enforce SPIFFE + Vault, implement rate limits/backpressure controls | Controlled risk + observability depth |
| Day 61–90 | Scale to 6–10 agents, ship canary deploys with synthetic flows, automate post-mortems, >80% policy code coverage, launch dashboards, run resilience game-day | Production-grade mesh with governance |

## Operational Checklists

- **Readiness.** Contracts validated/versioned, idempotent handlers + dedupe, timeout/retry with jitter, health probes, telemetry emitted, runbook + alerts defined.
- **Flow Safety.** Policy gate enforced, HALT command honoured/tested, DLQ routed with replay tooling, canary publishers configured, load tests executed.

## Next Actions

1. Refine agent canvases with upstream/downstream mappings (see `agents/`).
2. Flesh out schema evolution guides in `contracts/` and automation in `tools/`.
3. Expand `ops/` with SLO definitions and chaos plans; wire `sim/` trace replay harness.

