# Dynamic Capital Multi-Agent Trading Architecture

## Executive Overview

- **Mission Alignment:** Deliver resilient, explainable, and fast execution for
  Dynamic Capital's trading programs by orchestrating specialized agents with
  clear contracts and accountability.
- **Operating Model:** Combine decentralized decision making with shared
  communication standards so that each agent can evolve independently without
  jeopardizing global outcomes.
- **Lifecycle Focus:** Treat agent design as a continuous loop—model, deploy,
  observe, and adapt—supported by the governance and testing practices outlined
  below.

## 1. Core Principles

- **Autonomy:** Each trading agent maintains its own objectives and localized
  state; there is no single global controller.
- **Local Views, Global Wins:** Agents optimize their scoped metrics (latency,
  fill ratio, risk) while coordination patterns ensure overall portfolio
  performance.
- **Loose Coupling:** Communication occurs through asynchronous events and RPC
  calls; shared state is avoided outside of well-defined stores.
- **Explicit Protocols:** Contracts specify message schema, retry policy, and
  observability expectations to maximize trust between services.
- **Fault Tolerance Over Perfection:** Resiliency features such as retries,
  quorum acknowledgement, and fallback strategies come before
  micro-optimizations.

## 2. Agent Canvas Templates

Use the following one-pager to describe each agent prior to implementation or
major revision:

```
Agent: <Name>
Mission: <Primary objective>
Observations: <subscriptions, sensors, APIs>
Actions: <publish, call, actuate>
Beliefs/State: <key-value, models>
Plan/Policy: <rules|planner|RL|heuristics>
Comms Contract: <message schemas + timeouts>
SLOs: <p50/p95, TPS, accuracy>
Failover: <retries, circuit breaker, fallback>
```

### Example: PortfolioAgent

- **Mission:** Allocate capital based on incoming signal quality while
  respecting risk budgets.
- **Observations:** `signals.market.v1`, `risk.policy.v1`, `orders.execution.v1`
  events; REST endpoint for intraday VaR.
- **Actions:** Publish `orders.intent.v1`, invoke HedgerAgent RPC for coverage
  quotes, raise alerts to PolicyAgent.
- **Beliefs/State:** Cached factor scores, open positions, current exposure
  derived from Postgres snapshot, RL policy parameters in Redis.
- **Plan/Policy:** Hybrid approach that combines rule-based guards (exposure
  caps) with reinforcement learning for sizing.
- **Comms Contract:** Messages encoded in JSON/Protobuf with immutable schemas,
  15 second TTL, exponential backoff with jitter on failure.
- **SLOs:** Median decision latency ≤ 40 ms, p95 ≤ 120 ms, throughput ≥ 50 TPS
  during market open, allocation accuracy ≥ 98% relative to backtests.
- **Failover:** Circuit breaker trips after 3 consecutive failures; fallback to
  conservative static allocation and manual approval queue.

## 3. Coordination Patterns

| Pattern              | Best For                                                       | Notes                                                                                |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Market Mechanism** | Liquidity allocation among Portfolio, Hedger, Execution agents | Budget-capped bids adjudicated by PolicyAgent safeguards.                            |
| **Blackboard**       | Shared context (volatility regimes, exchange halts)            | Kafka topic `strategy.blackboard.v1` acts as immutable fact store; consumers dedupe. |
| **Consensus**        | Compliance checkpoints and kill-switch authorization           | Three-node Raft quorum before mutating ledgers or kill commands.                     |
| **Swarm Heuristics** | Exploration and anomaly scouting                               | Local diversity rules trigger upstream scouting reports.                             |

## 4. Communication & Interoperability

- **Transports:**
  - gRPC for synchronous, low-latency requests (e.g., PolicyAgent validations).
  - Kafka for durable publish/subscribe event streams.
  - WebSocket bridge for real-time operator dashboards.
  - MQTT reserved for edge ingestion (IoT price feeds).
- **Message Header Checklist:** Every event or command carries the following
  immutable envelope fields.

| Field               | Purpose                                      | Default              |
| ------------------- | -------------------------------------------- | -------------------- |
| `msg_id`            | Unique identifier for deduplication          | UUIDv7               |
| `type` / `version`  | Schema evolution control                     | `*.v1`               |
| `correlation_id`    | Trace linking across agents                  | Root request UUID    |
| `causation_id`      | Parent message pointer                       | Previous `msg_id`    |
| `ttl_ms`            | Replay protection window                     | `3 × p95 latency`    |
| `sender` / `intent` | Authorization + routing hints                | Agent name + action  |
| `idempotency_key`   | Exactly-once semantics for mutating commands | Hash of business key |
| `sig`               | Ed25519 signature for authenticity           | Mandatory            |

- **Timeouts & Retries:** Apply exponential backoff with jitter; timeouts should
  default to three times the observed p95 latency and degrade gracefully into
  fallbacks or DLQ handoff.

### Schema Snippet

```json
{
  "msg_id": "uuid",
  "type": "order.intent",
  "version": "v1",
  "correlation_id": "uuid",
  "ttl_ms": 15000,
  "sender": "agent.portfolio",
  "intent": "ALLOCATE",
  "payload": { "symbol": "XAUUSD", "risk": 0.5, "side": "LONG" },
  "sig": "ed25519:..."
}
```

## 5. Decision & Learning Blocks

- **Reactive Rules:** Complex event processing triggers hedges when volatility
  spikes or liquidity evaporates.
- **Deliberative Planning:** Goal-oriented planners schedule order slicing and
  liquidity sourcing given market microstructure constraints.
- **Learning Components:**
  - Multi-armed bandits select between competing execution venues.
  - Reinforcement learning for allocation sizing under risk-adjusted utility.
  - Supervised learning models produce forecast signals.
- **Negotiation:** Agents adopt Zeuthen concessions with utility function \(U =
  \alpha R - \beta \sigma - \gamma C\) balancing returns, volatility, and
  communication cost.

## 6. Reference Architecture

- **Edge Layer:** Optional bridges for MT5 and FIX simulators streaming into
  Kafka.
- **Agent Layer:** Dockerized agents orchestrated via Kubernetes with Ray for
  distributed training workloads.
- **Communication Bus:** Kafka/NATS hybrid; command topics separated from event
  topics.
- **State Stores:** Postgres for durable positions, Redis for hot caches,
  MinIO/S3 for artifacts and RL checkpoints.
- **Observability:** OpenTelemetry tracing into Prometheus and Grafana; logs
  shipped to ClickHouse/ELK.
- **Control Plane:** OperatorAgent monitors health, manages scaling policies,
  and coordinates blue/green deployments.
- **Security:** mTLS mesh (Istio) with SPIFFE identities, OPA enforcement,
  Vault-backed secret distribution.

## 7. Preferred Tech Stack

- **Python-first:** Ray actors, FastAPI services, Pydantic models, Faust
  streaming apps.
- **Optional JVM:** JADE or Akka for specialized agents.
- **Streaming:** Kafka plus Faust for stream processing; NATS JetStream for
  low-latency command paths.
- **ML/RL:** PyTorch, RLlib for RL pipelines, integrated with feature store in
  Redis.
- **CI/CD:** GitHub Actions → Docker registry → Kubernetes (ArgoCD/Flux).

## 8. Minimal Working Example

1. **Actors:** Start with `SignalAgent` → `PortfolioAgent` and extend with
   `RiskAgent` (exposure guard) plus `HedgerAgent` (offset sourcing).
2. **Bus:** Replace the in-memory `Bus` actor with `KafkaBus` that publishes to
   `signals.market.v1` and consumes from `orders.intent.v1`.
3. **Policies:** Embed rule checks inside `RiskAgent` for max notional,
   drawdown, and VaR breaches before forwarding intents.
4. **Observability:** Emit `DecisionMade`, `OrderRejected`, and `HedgePlaced`
   events to feed dashboards and replay testing.
5. **Lifecycle:** Package agents as Ray Serve deployments for local testing,
   then containerize with shared base images for CI parity.

## 9. Organizational Design Steps

1. Define quantitative goals (order latency < 150 ms p95, fill rate > 98%,
   Sharpe > 1.2).
2. Decompose workflow into sensing, decision, action, and governance agents.
3. Select coordination pattern per flow (market mechanism for allocation,
   consensus for compliance).
4. Formalize communication contracts, SLOs, and retry logic.
5. Model policies with rules, ML, and explicit utility constraints.
6. Plan state ownership, retention, and lineage requirements.
7. Engineer SRE practices: timeouts, circuit breakers, canary deployments.
8. Construct threat model (authentication, replay protection, rate limiting).
9. Develop test matrix: unit, simulation, chaos, and soak tests.
10. Operate via dashboards, alerts, post-mortems, and drift detection.

## 10. Governance & Safety

- PolicyAgent validates every action against compliance and risk policies.
- Agents must attach explanations to actions; log features and decisions for
  audit.
- High-risk actions route through a human approval topic.
- Global kill-switch (`HALT`) must be honored by all agents.
- Enforce least-privilege data access, rotating keys, and signed messages.

## 11. Testing & Simulation Strategy

- **Trace Replays:** Use recorded trading days to benchmark latency, PnL, and
  risk metrics.
- **Adversarial Faults:** Inject delayed, missing, and out-of-order messages,
  skewed clocks, and partial outages to validate resilience.
- **Economic Games:** Stress-test cooperation via payoff matrices (e.g.,
  execution vs. hedging) to discourage utility-maximizing defection.
- **Chaos Automation:** Schedule periodic kill tests that remove agents, degrade
  networks, or throttle dependencies while measuring recovery time.

## 12. Metrics & Observability

- **Per Agent:** p50/p95 latency, TPS, error rate, CPU/RAM usage.
- **End-to-End:** Time-to-decision, time-to-actuation, success ratio.
- **Economic:** PnL, drawdown, Sharpe ratio, slippage, inventory variance.
- **Reliability:** MTTR, availability, dead-letter queue depth.
- **Instrumentation Tips:** Adopt OpenTelemetry SDKs, forward traces via OTLP to
  Prometheus/Grafana, and maintain exemplar links from alerts to correlated
  spans.

## 13. Deployment Checklist

- Version and validate schemas via registry.
- Provide health/readiness probes and smoke tests.
- Execute canary rollouts with feature flags and progressive traffic shifting.
- Store secrets in Vault (never plain text env vars).
- Enforce mTLS mesh and OPA policies.
- Configure backpressure handling and dead-letter queues.
- Define autoscaling rules (HPA driven by CPU and queue depth).
- Maintain runbooks aligned with observability alerts.

## 14. Domain Blueprints

- **Trading & Treasury:** MarketData → Signal → Portfolio → Order → Execution →
  Risk → Hedge → Compliance → Reporter; coordination via market mechanisms and
  policy gates; constraints include daily loss limit and VaR caps.
- **Hospitality Operations:** Booking → RoomAssign → Housekeeping → Inventory →
  Pricing → Concierge → Feedback; contract-net coordination and dynamic pricing
  markets with occupancy KPIs.
- **IoT Energy:** Sensor → Forecast → Optimizer → Switch/Actuator →
  FaultDetector → Reporter; blackboard coordination with swarm balancing; KPIs
  around peak shaving and downtime.

## 15. Security Hardening

- Agents authenticate using SPIFFE/SPIRE SVIDs and sign messages with Ed25519.
- Replay protection via TTL, nonce, signatures; stale messages rejected.
- Apply rate limits and quotas per identity; isolate noisy neighbors.
- Sandbox experimental policies (WASM/Lua) with CPU/memory constraints.
- Periodically rotate signing keys and validate against revocation lists.

## 16. CI/CD Pattern

1. Lint and unit tests.
2. Build Docker images.
3. Scan images (Trivy).
4. Push to registry.
5. Deploy via ArgoCD with progressive rollout.
6. Run contract tests against schema registry.
7. Execute synthetic canaries publishing end-to-end flows post-deploy.
8. Capture post-deploy metrics for 24 hours and gate promotion on SLO deltas.

## 17. Quick Start Checklist

| Step                  | Outcome                                                              |
| --------------------- | -------------------------------------------------------------------- |
| Platform setup        | Choose Kafka or NATS and Ray or Kubernetes to establish the runtime. |
| Contract design       | Define ≥5 message types and ≥3 agents to clarify interfaces.         |
| Policy guardrails     | Extend the Ray example with RiskAgent enforcement to cap exposure.   |
| Reliability hardening | Add metrics plus DLQ coverage and run ≥1 hour soak tests.            |
| Operability           | Draft one-page runbooks per agent via the canvas template.           |
