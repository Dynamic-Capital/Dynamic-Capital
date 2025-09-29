# Dynamic AI Layered Memory Architecture

## Purpose

This document specifies how Dynamic AI deploys eleven interchangeable cores
through a layered memory fabric (L0–L3) so that the platform behaves like a
collaborative intelligence constellation rather than an isolated model stack. It
captures the end-to-end control plane—from task ingestion to governance feedback
loops—and provides concrete data models, routing policies, and implementation
phases.

## System Topology

- **Core agents (Core 1–11).** Homogeneous runtimes that expose task execution,
  tool invocation, and validation hooks. Cores are stateless between turns and
  rely on memory services for continuity.
- **Memory layers (L0–L3).** Shared services that transform transient context
  into durable institutional knowledge. Each layer has its own schema, retention
  policy, and promotion rules.
- **Orchestrator.** A policy-driven router that builds task specs, selects
  cores, coordinates ensembles, and emits structured telemetry to the
  intelligence oracle.
- **Intelligence oracle.** Scores every turn, updates episodic and semantic
  memory, and tunes routing weights and procedures in L3.
- **Governance envelope.** Safety, compliance, and versioning checks that wrap
  every task lifecycle. Governance controls which cores may run, what tools they
  can call, and how facts get promoted.
- **IO bus.** Canonical envelopes for tasks, events, and tool calls so that all
  cores speak the same contract and can be swapped without code changes.
- **Observability fabric.** Traces, metrics, structured logs, and audit trails
  with turn-level correlation IDs.

## Layered Memory Fabric

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

## Task Bus Schema

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

## Routing & Ensemble Strategies

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

## Turn Lifecycle

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

## Data Governance & Safety

- **Versioned truth.** Every L2 entity and edge maintains provenance,
  versioning, and contradiction handling policies.
- **Safety rails.** L3 policies enforce red lines (e.g., prohibited tool use,
  PII restrictions) before any core runs.
- **Compliance zoning.** Constraints flag data residency or regulatory
  requirements; router honours zones by selecting compliant cores.
- **Auditability.** Immutable governance logs capture policy decisions,
  overrides, and retroactive corrections.

## Observability Strategy

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
   minimal router with three cores, and baseline validators.
2. **Phase 2 – Memory & Retrieval.** Implement L1 episodic storage, L2 semantic
   graph, promotion pipelines, and hybrid retrieval.
3. **Phase 3 – Procedures & Routing.** Launch the L3 policy engine, auto-tuning
   feedback loops, ensemble workflows, and debate mode.
4. **Phase 4 – Ops & Governance.** Harden observability, audit trails, safety
   policies, and data locality enforcement.

## Build Automation

- Run `npm run build:dynamic-ai` to execute the Dynamic AI build across all four
  roadmap phases.
- Scope builds to a specific phase with
  `npm run build:dynamic-ai -- --phase <phaseId>`; repeat the option to run
  multiple targeted phases (for example, `--phase phase2`).
- Discover the available identifiers with `npm run build:dynamic-ai -- --list`.
- The helper exposes the current phase through the `DYNAMIC_AI_PHASE`
  environment variable so downstream tooling can branch on phase-specific
  requirements during the build.
- Inspect the console output for phase banners to confirm the build progressed
  through Foundations → Memory & Retrieval → Procedures & Routing → Ops &
  Governance without interruption.

## Localization & Identity

- **Maldivian voice.** Embed localized phrasing and cultural motifs into system
  prompts and notifications through L3 policy templates.
- **Mentorship & trading playbooks.** Encode canonical trading reports,
  mentorship scripts, and compliance disclaimers as L3 procedures with strict
  validators and citation requirements.
- **Oracle integration.** Feed accuracy, novelty, and adherence metrics back
  into the oracle each turn to continually improve routing and procedure
  efficacy.

## Next Steps

- Finalize the schema for the IO bus and implement JSON schema validation across
  services.
- Stand up a prototype L1/L2 store (e.g., PostgreSQL + pgvector) with promotion
  workers triggered by oracle events.
- Build governance automation around policy versioning, change approval, and
  rollback.
- Develop developer-facing tooling to simulate turns, inspect memory promotions,
  and replay decision traces.
