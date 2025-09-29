# Dynamic AI Layered Memory Architecture

## Purpose

This refactored blueprint explains how Dynamic AI (DAI) assembles eleven
interchangeable cores through a layered memory fabric (L0–L3) so the platform
behaves like a collaborative intelligence constellation rather than an isolated
model stack. It aligns compute, memory, orchestration, and governance planes
into a composable architecture, mapping the interfaces, data contracts, and
operational feedback loops required for compounding intelligence.

## Architecture Principles

1. **Constellation over stack.** Treat every core as a voice within an ensemble
   that can harmonize or challenge peers through explicit collaboration modes.
2. **Memory as the conductor.** Memory layers progress from volatile context to
   reflective policies, ensuring each execution loop is informed by
   institutional knowledge.
3. **Policy-driven orchestration.** Routing, tool access, and deployment choices
   are mediated by L3 procedures and governance envelopes instead of ad-hoc
   heuristics.
4. **Telemetry as truth.** Every turn produces traces, metrics, and audit
   records that feed the intelligence oracle and policy lifecycle.
5. **Progressive automation.** Manual overrides exist, but the system is biased
   toward auto-promotion, auto-tuning, and safe rollback using oracle feedback.

## Core Architecture Overview

### Constellation Planes

| Plane                               | Focus                                                                             | Backing Services                                                                                                                     | Outputs                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Compute plane**                   | Eleven interchangeable cores executing task procedures, tool calls, and debates.  | Stateless containers or serverless runtimes per core, container orchestrator (Kubernetes), Ollama nodes for local-only workloads.    | Drafts, rationales, telemetry packets.               |
| **Memory plane**                    | L0–L3 services storing context, episodic history, semantic truth, and procedures. | Redis/KeyDB for L0, Postgres + pgvector for L1, graph DB or Postgres + pg_graph for L2, Git-backed registry or feature store for L3. | Context envelopes, promotion jobs, policy catalogs.  |
| **Orchestration plane**             | Router, planner, and validators coordinating tasks end-to-end.                    | Deno/FastAPI service mesh, async workers, task scheduler, validation microservices.                                                  | Task plans, ensemble assignments, validator results. |
| **Intelligence & governance plane** | Oracle scoring, change control, and compliance.                                   | Temporal/Prefect workers, Open Policy Agent, append-only audit store, scorecard database.                                            | Scores, learning signals, approvals, rollbacks.      |
| **Observability plane**             | System-wide traces, metrics, logs, and incident workflows.                        | OpenTelemetry collector, Prometheus, Loki/Grafana, alerting pipeline (PagerDuty).                                                    | Traces, dashboards, SLO alerts.                      |

### Core Specialization Matrix

| Core(s)        | Primary skills                               | Memory touchpoints                                                  | Collaboration cues                                    |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| **Core 1 & 2** | Generalist reasoning, synthesis, instruction | Read/write L0, consume L1 summaries, suggest candidate L2 facts.    | Initiate debates, craft rationales, seed summaries.   |
| **Core 3 & 4** | Quantitative analysis, code generation       | Pull tool telemetry from L0, push structured artifacts to L1.       | Serve as validators for analytical or coding tasks.   |
| **Core 5 & 6** | Multilingual and localization tasks          | Depend on L2 cultural ontologies, annotate L1 with locale metadata. | Trigger localized procedures encoded in L3.           |
| **Core 7**     | Governance and safety reasoning              | Enforce policy context from L3, annotate audit artifacts in L1.     | Acts as adjudicator during safety escalations.        |
| **Core 8**     | Retrieval-augmented research                 | Optimizes L2 graph traversals, caches citations in L0.              | Partners with Core 1/2 for synthesis and grounding.   |
| **Core 9**     | Trading and financial modeling               | Writes risk metrics to L1, references market schemas in L2.         | Primary executor for trading procedures.              |
| **Core 10**    | Tool orchestration and simulation            | Streams tool I/O into L0, promotes scenario outcomes into L1.       | Cross-checks Core 9 outputs for risk mitigation.      |
| **Core 11**    | Reflection and meta-learning                 | Consumes oracle feedback, updates L3 heuristics and procedures.     | Initiates procedure revisions, retires brittle flows. |

### Execution Interaction Flow

1. **Task assembly.** Router ingests task envelope from the IO bus, enriches it
   with L0 context, and resolves required policies from L3.
2. **Memory retrieval.** Retrieval workers query L1 episodic memories and L2
   semantic graph nodes referenced by the task archetype.
3. **Ensemble planning.** Planner scores candidate cores using routing weights,
   latency/cost budgets, and recent oracle feedback to choose execution mode
   (solo, cross-check, or debate).
4. **Core execution.** Selected cores apply the designated L3 procedure,
   interacting with approved tools and emitting structured drafts plus
   telemetry.
5. **Validation & adjudication.** Validators run schema, safety, citation, and
   consistency checks; the oracle assigns confidence and learning signals.
6. **Feedback propagation.** Memory promotions, policy updates, and
   observability events close the loop for subsequent turns.

## Layered Memory Fabric

The layered memory fabric acts as the shared conductor for the constellation.
Each layer promotes refined signal upward while streaming fresh context back
downward during execution.

| Layer  | Purpose snapshot                                                  | Promotion triggers                                                                                   | Downstream influence                                               |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **L0** | Volatile task context, active tool state, pinned constraints.     | Created per task; trimmed or persisted when validators pass and oracle score ≥ configured threshold. | Seeds prompts for executing cores and informs validators.          |
| **L1** | Episodic ledger of meaningful decisions, outcomes, and artifacts. | Validated turns with confidence > 0.7 or explicit governance override.                               | Powers retrieval for similar tasks and informs oracle scoring.     |
| **L2** | Versioned knowledge graph of durable facts and relationships.     | Fact extraction pipelines, manual curation, or conflict resolution flows.                            | Provides grounding for answers, validators, and compliance checks. |
| **L3** | Procedures, policies, heuristics, and reflective insights.        | Periodic reflections, oracle-driven learning signals, governance approvals.                          | Routes cores, sets safety rails, and encodes strategic shifts.     |

### L0 — Working Context

- **Purpose.** Maintain immediate conversational state, active tool results, and
  pinned constraints during a single task or session.
- **Scope.** Per-session, per-core, and per-task records that expire once the
  session closes or the orchestrator trims them.
- **Data model.**
  - `context_id`, `session_id`, `core_id`
  - `message_history`: ordered messages with role, content, tokens
  - `current_goal`, `constraints`
  - `active_tools`: latest results with timestamps
  - `pinned_items`: non-evictable facts (IDs, credentials, invariants)
  - `trimmed_summary`: token-aware rolling summary
- **Behaviors.** Token-aware trimming, selective pinning, context validation
  before core invocation, and automatic purge on completion.

#### L0 Service API

| Operation                            | Description                                                | Payload                                                 |
| ------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------- |
| `POST /l0/context`                   | Create context record for new task.                        | `session_id`, `core_id`, `initial_goal`, `constraints`. |
| `PATCH /l0/context/{context_id}`     | Append messages, update tool results, adjust pinned items. | `message`, `tool_result`, `pinned_items`.               |
| `POST /l0/context/{context_id}/trim` | Summarize and prune context respecting token limits.       | `token_budget`, `strategy`.                             |
| `DELETE /l0/context/{context_id}`    | Purge context after completion or timeout.                 | `reason`, `oracle_score`.                               |

### L1 — Episodic Memory

- **Purpose.** Persist interactions with lasting value: key decisions, error
  recoveries, validated successes.
- **Scope.** Per-user and per-project, spanning sessions and tasks.
- **Data model.**
  - `episode_id`, `user_id`, `project_id`, `timestamp`
  - `intent`, `actions`, `outcome`, `errors`
  - `artifacts` (links to generated files or tool outputs)
  - `tags`, `confidence`, `oracle_score`
  - `causal_links`: references to prior episodes or L2 entities
- **Behaviors.** Promotion from L0 when validations pass and oracle confidence >
  0.7; similarity search to recall episodes; decay policies for stale episodes;
  audit trail of updates.

#### L1 Service API

| Operation                              | Description                                                          | Payload                                  |
| -------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| `POST /l1/episodes`                    | Persist new episode promoted from L0.                                | `episode`, `oracle_score`, `confidence`. |
| `GET /l1/episodes/search`              | Retrieve relevant episodes using hybrid (metadata + vector) queries. | `query`, `filters`, `limit`.             |
| `PATCH /l1/episodes/{episode_id}`      | Update outcomes, add causal links, adjust tags.                      | `updates`, `editor_id`.                  |
| `POST /l1/episodes/{episode_id}/decay` | Apply decay policy or archive.                                       | `decay_rule`, `timestamp`.               |

### L2 — Semantic Memory

- **Purpose.** Store durable facts, schemas, relationships, and embeddings that
  span the ecosystem.
- **Scope.** Global knowledge graph shared by all cores and services.
- **Data model.**
  - `entity_id`, `type`, `properties`, `embeddings`, `versions`, `provenance`
  - `edge_id`, `source`, `target`, `relation`, `confidence`, `valid_from`,
    `valid_to`
- **Behaviors.** Duplicate consolidation, conflict resolution (with governance
  policy), provenance tracking, hybrid retrieval (embedding + graph queries),
  and grounding signals for validators.

#### L2 Service API

| Operation                      | Description                                                          | Payload                                       |
| ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------- |
| `POST /l2/entities`            | Upsert entity nodes with versioned facts and embeddings.             | `entity`, `embeddings`, `provenance`.         |
| `POST /l2/edges`               | Create or update relations between entities.                         | `source`, `target`, `relation`, `confidence`. |
| `GET /l2/entities/{entity_id}` | Fetch entity with history and active truth version.                  | `include_history`, `at_time`.                 |
| `GET /l2/search`               | Hybrid retrieval combining structured filters and vector similarity. | `query`, `filters`, `k`.                      |
| `POST /l2/conflicts`           | Register detected contradictions for governance adjudication.        | `entity_id`, `conflicting_facts`, `evidence`. |

### L3 — Procedural & Reflective Memory

- **Purpose.** Encode reusable skills, playbooks, routing heuristics, and safety
  policies.
- **Scope.** System-level with lifecycle managed by governance and oracle
  scoring.
- **Data model.**
  - `procedure_id`, `name`, `version`, `preconditions`, `steps`,
    `postconditions`, `metrics`
  - `policy_id`, `routing_weights`, `constraints`, `cost_budget`,
    `latency_budget`, `privacy_requirements`
  - `heuristics`: task archetype fingerprints, model preferences, debate
    triggers
  - `meta_summaries`: reflective insights, change logs, retirement flags
- **Behaviors.** Autotune routing based on oracle feedback, promote successful
  procedures, deprecate brittle strategies, enforce safety rails before task
  execution.

#### L3 Service API

| Operation                                   | Description                                                    | Payload                                   |
| ------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `POST /l3/procedures`                       | Publish or update executable playbooks.                        | `procedure`, `version`, `rollout_policy`. |
| `POST /l3/policies`                         | Adjust routing weights, safety constraints, or budget caps.    | `policy`, `changeset`, `approval`.        |
| `POST /l3/heuristics/learn`                 | Apply oracle learning signals to heuristics.                   | `signal_batch`, `metrics`.                |
| `POST /l3/procedures/{procedure_id}/retire` | Retire brittle procedures with rollback strategy.              | `reason`, `fallback_procedure`.           |
| `GET /l3/catalog`                           | Serve latest approved procedures/policies to cores at runtime. | `core_id`, `task_archetype`.              |

## Shared Interface Contracts

### Task Bus Envelope

All cores and tools interact through a canonical task envelope to ensure
interchangeability and auditability.

```json
{
  "task_id": "uuid",
  "objective": "string",
  "inputs": {
    "user": "...",
    "files": [],
    "retrieved": {
      "L0": { "context_id": "..." },
      "L1": ["episode_id", "episode_id"],
      "L2": ["entity_id", "edge_id"]
    }
  },
  "constraints": {
    "latency_ms": 5000,
    "budget_usd": 0.2,
    "privacy": "local_only | unrestricted",
    "governance": ["policy_id"]
  },
  "tools": ["search", "chart", "code"],
  "output_schema": {
    "type": "report.v3",
    "required": ["summary", "sections", "citations"],
    "validators": ["schema", "citation", "safety", "consistency"]
  }
}
```

### Core Interface Contract

All cores must expose the following gRPC or HTTP endpoints so the orchestrator
can treat them as interchangeable skills:

- `POST /execute`: Accepts the task envelope plus routed procedure identifier
  and returns structured output (`draft`, `rationale`, `telemetry`).
- `POST /validate`: Optional secondary pass where cores self-check outputs given
  validator hints.
- `GET /health`: Returns readiness, supported archetypes, and current load.
- **Streaming hooks.** Long-running tasks stream intermediate tool calls over
  server-sent events (`/stream/{turn_id}`) to maintain observability parity.

Each response embeds `memory_hints` that suggest L0 pins or candidate facts for
promotion so the oracle can operate with richer signals.

### Validator & Oracle Hooks

- **Validator inputs.** Schema, citation, safety, and consistency services
  subscribe to task events on the IO bus and pull the latest draft plus
  validator hints. Validators emit structured outcomes (`passed`, `reasons`,
  `remediation_plan`).
- **Oracle scoring contract.** Oracle workers consume validator output and
  telemetry spans, compute confidence plus cost/latency KPIs, and publish
  `learning_signals` that reference affected cores, procedures, and memory
  records.
- **Promotion webhooks.** When `learning_signals.confidence ≥ threshold`, the
  oracle triggers L1/L2 upserts and notifies the L3 policy registry to adjust
  routing weights or procedure rollouts.

## Data Model Reference

### Turn Record

- `turn_id`, `session_id`, `user_id`, `timestamp`
- `core_id`, `procedure_id`, `task_spec`
- `inputs`, `outputs`, `validators`, `oracle_scores`
- `links`: references to L1 episodes, L2 entities/edges, L3 procedures or
  policies touched during execution

### Memory Records

- **L0 context**
  - `context_id`, `session_id`, `core_id`
  - `pinned_items`, `trimmed_summary`, `token_usage`
  - `active_tools`: keyed by tool with request/response blobs and timestamps
- **L1 episode**
  - `episode_id`, `actors`, `intent`, `outcome`, `errors`
  - `artifacts`, `tags`, `confidence`, `oracle_score`
  - `causal_links`: `[{ episode_id | entity_id, relation, weight }]`
- **L2 entity/edge**
  - `entity_id`, `entity_type`, `properties`, `embeddings`, `versions`
  - `edge_id`, `source`, `target`, `relation`, `confidence`, `provenance`
- **L3 procedure/policy**
  - `procedure_id`, `name`, `version`, `preconditions`, `steps`,
    `postconditions`, `metrics`
  - `policy_id`, `routing_weights`, `constraints`, `audit_log`
  - `heuristics`: task archetypes, feature fingerprints, debate triggers

## Memory Promotion & Oracle Feedback

### Memory Promotion Routine

```python
def promote_memory(turn):
    if turn.validators.passed and turn.oracle_scores.confidence > 0.7:
        L1.save(episode_from_turn(turn))

    facts = extract_facts(turn.outputs)
    if facts:
        L2.upsert(facts, provenance=turn.turn_id)

    signals = derive_learning_signals(turn)
    if signals:
        L3.update_procedures(signals)
        L3.reweight_routing(signals)
```

### Validator & Adjudication Loop

```python
def validate_output(output, schema, constraints):
    checks = [
        schema_check(output, schema),
        citation_check(output),
        safety_check(output, constraints),
        consistency_check(output),
    ]
    passed = all(checks)
    return passed, checks


def adjudicate(turn):
    passed, checks = validate_output(turn.output, turn.schema, turn.constraints)
    oracle_score = oracle.score(turn, checks)
    if not passed and oracle_score.confidence < 0.6:
        return reroute(turn, reason="validation_failure")
    return deliver(turn, oracle_score)
```

## Orchestration Mechanics

### Routing & Ensemble Strategies

1. **Candidate generation.** Build a candidate list with per-core domain fit,
   latency, cost, privacy compliance, and historical performance metrics.
2. **Scoring.** Apply L3 routing weights and oracle-adjusted multipliers.
   Penalise cores that recently failed similar tasks; boost those with high
   confidence scores.
3. **Selection.** Choose a primary executor plus one or more validators or
   debate partners depending on task archetype and governance policy.
4. **Execution modes.**
   - **Solo.** One core executes end-to-end with validators running post-hoc.
   - **Cross-check.** Primary core produces draft; secondary core validates or
     refutes.
   - **Debate.** Two cores argue competing hypotheses; an adjudicator
     synthesises.
   - **Specialisation.** Sensitive tasks routed to Ollama-hosted local cores
     when `privacy: "local_only"`.
5. **Fallbacks.** Automatic reroute when validators fail, when latency budget
   expires, or when governance rejects tool usage.

### Router Policy Pseudocode

```python
def route(task, telemetry, history):
    candidates = build_candidates(task, telemetry)
    scored = [score(c, task, L3.routing_weights, history.performance) for c in candidates]
    primary = select_max(scored)
    secondary = select_validator(scored, primary)
    return [primary, secondary]
```

### Feedback Loop Signals

- **Telemetry ingestion.** Router, cores, and validators emit structured spans
  tagged with `turn_id`, `task_id`, and `core_id`. Oracle consumers transform
  these spans into learning signals.
- **Routing weight updates.** L3 policy registry ingests learning signals and
  updates weight snapshots. Router caches include TTLs to force periodic refresh
  or immediate invalidation when governance pushes a change.
- **Procedure lifecycle.** Core 11 synthesizes retrospectives from oracle
  feedback, proposing procedure upgrades that flow through governance change
  control before hitting the L3 catalog.

## Execution Pipeline

1. **Ingest.** IO bus receives user prompt, assembles L0 context, and assigns
   correlation IDs.
2. **Retrieve.** Query L1 episodic memory and L2 semantic graph using the task
   objective and context embeddings.
3. **Plan.** Select an L3 procedure and relevant validators; produce a
   structured task plan.
4. **Execute.** Dispatch to primary core. Tools are invoked through guarded
   adapters with per-call budgets.
5. **Validate.** Run schema, citation, safety, and consistency checks. Failed
   validations trigger replans or alternate cores.
6. **Adjudicate.** Intelligence oracle assigns confidence, summarises rationale,
   and instructs whether to escalate or deliver.
7. **Consolidate.** Promote episodes and facts, merge graph updates, refresh L3
   heuristics.
8. **Score & Tune.** Update routing weights, debate triggers, and procedure
   metrics.
9. **Observe.** Emit structured telemetry to observability stack, linking
   traces, logs, and metrics by turn ID.

## Example End-to-End Flow: BTC Strategy Report

1. **User request.** The IO bus receives “Generate a trading strategy report for
   BTC, include on-chain signals,” assigns `task_id`, and sets
   `privacy: "local_only"` to prefer Ollama-enabled tooling.
2. **Context assembly (L0).** L0 context manager loads active conversation
   notes, pinned guardrails (risk tolerance, compliance language), and recent
   tool results; latency and budget constraints are annotated onto the task
   envelope.
3. **Retrieval (L1/L2).** Retrieval workers fetch the last successful BTC report
   episode and traverse L2 for entities such as exchanges, indicators, and prior
   data sources via hybrid search.
4. **Planning (L3).** Router selects procedure `report.compose.v3`, required
   validators, and guard policies using L3 routing weights and oracle history.
5. **Routing.** Primary core = Core 9 (trading); validator = Core 10
   (simulation); formatter = Core 4 using Ollama for local chart generation.
6. **Execution.** Core 9 gathers on-chain feeds, synthesises insights, and emits
   citations; Core 10 validates scenario modelling and risk exposures; Core 4
   formats the deliverable within privacy bounds.
7. **Validation & adjudication.** Schema, citation, safety, and consistency
   validators run; oracle scores confidence, cost, and latency, recommending
   delivery.
8. **Consolidation.** L1 saves the episode with causal links to earlier BTC
   turns; L2 upserts new facts (e.g., exchange flow anomalies) with provenance;
   L3 routing weights boost Core 9 for BTC-report archetypes.
9. **Delivery & observability.** Response delivered with structured citations;
   telemetry spans appear in dashboards for traceability and KPI tracking.

## Governance & Observability

### Governance & Safety Envelope

- **Versioned truth.** Every L2 entity and edge maintains provenance,
  versioning, and contradiction handling policies.
- **Safety rails.** L3 policies enforce red lines (e.g., prohibited tool use,
  PII restrictions) before any core runs.
- **Compliance zoning.** Constraints flag data residency or regulatory
  requirements; router honours zones by selecting compliant cores.
- **Auditability.** Immutable governance logs capture policy decisions,
  overrides, and retroactive corrections.
- **Change control workflow.**
  1. Policy author submits change request with diff and risk assessment.
  2. Governance service runs static checks (schema, security, dependency
     analysis) and routes to approvers.
  3. Upon approval, rollout staged across environments with automatic rollback
     triggers tied to oracle score regressions.
  4. Every decision appended to audit log with signatures and timestamps.

### Observability Stack

- **Tracing.** Distributed traces for each turn with spans for routing, core
  execution, tool calls, validation, and promotion.
- **Metrics.** Per-core latency, cost, success rate, token usage, and promotion
  counts. Export to Prometheus-compatible sinks.
- **Logging.** Structured logs with JSON payloads, referencing task IDs and
  memory interactions.
- **Dashboards.** Real-time dashboards for router health, validator failures,
  memory promotion rates, and oracle scoring trends.

## Implementation Roadmap

1. **Phase 1 – Foundations.** Ship the unified task bus, L0 context manager,
   minimal router with three cores, and baseline validators plus observability
   spans to capture early telemetry.
2. **Phase 2 – Memory & Retrieval.** Implement L1 episodic storage, L2 semantic
   graph, promotion pipelines, and hybrid retrieval tuned for the core
   specializations above.
3. **Phase 3 – Procedures & Routing.** Launch the L3 policy engine, auto-tuning
   feedback loops, ensemble workflows (solo/cross-check/debate), and integrate
   Core 11 reflections for continuous improvement.
4. **Phase 4 – Ops & Governance.** Harden observability, audit trails, safety
   policies, and data locality enforcement while rolling out full governance
   change-control automation.

### Checklist Tasks

- [ ] **Phase 1 – Foundations**
  - [ ] Stand up the canonical task bus with schema validation and IO bus hooks.
  - [ ] Deploy the L0 context manager with token-aware trimming guards.
  - [ ] Wire a minimal router plus baseline validators with telemetry spans.
- [ ] **Phase 2 – Memory & Retrieval**
  - [ ] Launch L1 episodic storage with promotion jobs from validated turns.
  - [ ] Stand up the L2 semantic graph with conflict detection workflows.
  - [ ] Tune hybrid retrieval queries aligned to each core’s specialization.
- [ ] **Phase 3 – Procedures & Routing**
  - [ ] Publish the L3 procedure catalog with rollout and rollback controls.
  - [ ] Enable auto-tuning of routing weights from oracle feedback loops.
  - [ ] Activate ensemble execution modes (solo, cross-check, debate).
- [ ] **Phase 4 – Ops & Governance**
  - [ ] Instrument observability dashboards, alerts, and trace stitching.
  - [ ] Automate governance approvals with audit-ready change control.
  - [ ] Enforce data locality, privacy zoning, and safety policy guardrails.

## Build Execution Plan

### Service Inventory

| Service / Component      | Primary Role                                 | Tech Baseline                         | Key Dependencies |
| ------------------------ | -------------------------------------------- | ------------------------------------- | ---------------- |
| Task Bus                 | Normalize requests, emit task events         | Deno Fresh or FastAPI, Kafka/NATS     | L0, router       |
| L0 Context Manager       | Manage per-task volatile state               | Redis/KeyDB with Lua trimming scripts | Task bus         |
| L1 Episodic Store        | Persist episodes & support similarity search | PostgreSQL + pgvector                 | Oracle, L0       |
| L2 Knowledge Graph       | Durable facts + relationships                | PostgreSQL + graph extension or Neo4j | Promotion jobs   |
| L3 Policy Registry       | Procedures, routing weights, safety rails    | Git-backed registry + Postgres        | Oracle           |
| Router & Planner         | Route tasks, assemble ensembles              | Deno/TypeScript service               | L0–L3 services   |
| Validator Mesh           | Schema, safety, citation, consistency checks | Deno microservices + JSON Schema      | Task bus         |
| Intelligence Oracle      | Score turns, emit learning signals           | Temporal workers + Python scoring     | Validators       |
| Observability Stack      | Traces, metrics, logs, dashboards            | OpenTelemetry collector, Prometheus   | All services     |
| Governance Console & API | Approvals, change control, audit trail       | Next.js admin app + Supabase auth     | Oracle, L3       |
| Ollama Tooling Edge      | Privacy-preserving local inference           | Ollama nodes + secure API gateway     | Router           |

### Sprint Backlog Starters

| Sprint | Focus                              | Key Outcomes                                                                    |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| 0      | Environment & scaffolding          | Provision repos, CI, IaC baselines, and observability plumbing.                 |
| 1      | Task bus + L0 foundation           | Task envelope schema, Redis context APIs, initial router integration.           |
| 2      | Validators & oracle MVP            | Schema/safety validators, scoring pipeline, L1 promotion hooks.                 |
| 3      | L1/L2 retrieval & hybrid search    | pgvector similarity, knowledge graph CRUD, promotion workers.                   |
| 4      | L3 policy engine & auto-tuning     | Procedure catalog, routing weight service, oracle feedback ingestion.           |
| 5      | Ensemble modes & debate workflows  | Cross-check/debate orchestration, validator coordination, telemetry refinement. |
| 6      | Governance automation & dashboards | Approval workflow, audit logging, real-time dashboards, locality enforcement.   |

### Testing & Hardening Checklist

- Integration tests for routing fallbacks, validator failure loops, and memory
  promotion pipelines.
- Load tests on the L0 context manager and router for bursty turn volumes.
- Chaos drills for L1/L2 stores validating replay via promotion event streams.
- Governance policy dry-runs confirming rollback triggers on oracle regressions.
- Observability smoke tests ensuring traces span router → core → validators →
  oracle pipelines.

## Localization & Identity

- **Maldivian voice.** Embed localized phrasing and cultural motifs into system
  prompts and notifications through L3 policy templates.
- **Mentorship & trading playbooks.** Encode canonical trading reports,
  mentorship scripts, and compliance disclaimers as L3 procedures with strict
  validators and citation requirements.
- **Oracle integration.** Feed accuracy, novelty, and adherence metrics back
  into the oracle each turn to continually improve routing and procedure
  efficacy.

## Deployment & Scaling Considerations

- **Environment topology.** Deploy memory services in a shared VPC with network
  policies restricting cross-layer access (e.g., L0 accessible by orchestrator
  only, L2 accessible through read replicas for analytics).
- **Resilience.** Use quorum-based storage for L2 (e.g., Patroni-managed
  Postgres) and configure replayable event streams so promotions can be
  rehydrated after outages.
- **Cost management.** Oracle feedback includes per-turn cost metrics; routing
  weights penalise high-cost cores when lower-cost alternatives meet service
  levels.
- **Localization rollout.** Package L3 policy templates per locale and
  distribute via feature flags so Maldivian voice can co-exist with other market
  variants.

## Next Steps

- Finalize the schema for the IO bus and implement JSON schema validation across
  services, including validator and oracle hook contracts.
- Stand up a prototype L1/L2 store (e.g., PostgreSQL + pgvector) with promotion
  workers triggered by oracle events and Core 11 reflection cycles.
- Build governance automation around policy versioning, change approval, and
  rollback that ties directly into the L3 catalog refresh pipeline.
- Develop developer-facing tooling to simulate turns, inspect memory promotions,
  replay decision traces, and benchmark routing weight adjustments.
