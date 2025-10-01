# Dynamic AGS Playbook

## Table of Contents

1. [One-Page Overview](#0-one-page-overview)
2. [Architecture](#1-architecture-reference)
3. [Governance Model](#2-governance-model)
4. [Synchronization Patterns](#3-synchronization-patterns)
5. [Task Lifecycle](#4-task-lifecycle-dag)
6. [Quality & Safety Evaluation](#5-quality--safety-evaluation)
7. [Reliability Patterns](#6-reliability-patterns)
8. [Observability & Audit](#7-observability--audit)
9. [Data Design](#8-data-design-supabase-friendly)
10. [Configuration & Policies](#9-configuration--policies-yaml)
11. [Sync Runbooks](#10-sync-runbooks-sops)
12. [Security & Compliance](#11-security--compliance)
13. [KPIs & Alerts](#12-kpis--alerts)
14. [Example Flows](#13-example-flows-yours)
15. [Minimal Code Patterns](#14-minimal-code-patterns)
16. [Implementation Checklist](#15-implementation-checklist)
17. [Quickstart](#16-quickstart-your-stack)
18. [Audit Checklist](#17-audit-checklist)

## 0. One-Page Overview

**Goal:** Orchestrate multiple AI engines and agents (reasoning LLM, data tools,
execution bots, planners, evaluators) with tight governance, synchronized state,
reliable memory, and end-to-end observability.

**Core pillars (G-S-M-O-R):**

- **Governance:** roles, permissions, policies, human-in-the-loop.
- **Sync:** state propagation (events + shared memory), time sync, idempotency.
- **Memory:** short-term (context), mid-term (task state), long-term (knowledge
  base, vector DB).
- **Observability:** logs, traces, metrics, evaluations; audit trails.
- **Reliability:** retries, circuit breakers, fallback plans; incident
  playbooks.

## 1. Architecture (Reference)

- **Orchestrator (Conductor):** routes tasks, enforces policies.
- **Planner Agent:** decomposes goals into sub-tasks (graph).
- **Specialist Agents:** e.g., Trading, Research, Retrieval, Data ETL, Exec
  (code/tools), Comms (Telegram).
- **Critic/Evaluator Agent:** checks outputs (quality, safety, compliance).
- **Memory Layer:** Redis (STM), Postgres/Supabase (LTM/meta), Vector DB
  (semantic).
- **Event Bus:** Kafka/Redpanda or lightweight Redis Streams for message
  passing.
- **Control Plane:** config, feature flags, keys, policies.
- **Observability:** OpenTelemetry + ELK/ClickHouse + Grafana (or Supabase
  logs + simple dashboards).
- **Minimal stack (fits your setup):** Supabase (Auth/DB/Storage) + Redis
  (cache/queue) + Webhooks (TradingView/TON/Payments) + Telegram Bot + Simple
  worker (Deno/Supabase Edge Functions).

## 2. Governance Model

### 2.1 Roles

| Role         | Core Responsibilities                                                   | Access Notes                                                   |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Owner**    | Define policy and risk limits; approve high-risk (T3) actions.          | Dual approval for irreversible actions; owns policy YAML.      |
| **Operator** | Execute runbooks, manage incidents, triage alerts.                      | Elevated runtime permissions, no direct key custody.           |
| **Reviewer** | Audit outputs, validate critic results, spot-check compliance.          | Read-only access to artifacts, audit logs, evaluation metrics. |
| **Agents**   | Planner, researcher, retriever, trader, executor, communicator, critic. | Scoped service accounts with least-privilege keys.             |

### 2.2 Policies

| Tier   | Typical Actions                  | Approval Path                                        | Evidence Required                                  |
| ------ | -------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| **T0** | READ, RESEARCH, RETRIEVE         | Auto on green tests.                                 | Regression/evaluation pass.                        |
| **T1** | WRITE_DB, SUMMARIZE, DRAFT_REPLY | Auto on green tests.                                 | Structured logs + critic score.                    |
| **T2** | PUBLISH, SOCIAL_POST             | Critic ≥ 0.8 + operator soft-approval.               | Critic rubric, final artifact, notification trail. |
| **T3** | TRADE, PAYMENT, WITHDRAWAL       | Critic ≥ 0.9 + operator + owner approvals + dry-run. | Dry-run report, risk analysis, signed approvals.   |

### 2.3 Guardrails

- PII masking, prompt-injection filters, tool-use allowlist, rate limits.
- Trade limits (daily loss cap, max size, concurrent positions).
- Payment gates (KYC/AML checklist, amount caps, cooldown windows).

## 3. Synchronization Patterns

### 3.1 State & Time

- Canonical clock: NTP; all services store timestamps in UTC; one place converts
  to local time for UI.
- Idempotency keys: `task_id + step + hash(input)` for safe retries.
- Exactly-once semantics (practical): at-least-once + idempotent consumers.

### 3.2 Message Passing

- **Event types:** `TASK_CREATED`, `STEP_READY`, `STEP_DONE`, `NEED_APPROVAL`,
  `PUBLISH_OK`, `INCIDENT_RAISED`.
- **Contract:** JSON schema with versioning.

```json
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "event_type": "STEP_DONE",
  "task_id": "T-2025-09-28-0012",
  "agent": "researcher:v2",
  "ts": "2025-09-28T08:45:17Z",
  "payload": {
    "inputs_ref": "supa://tasks/T-2025-09-28-0012/inputs.json",
    "outputs_ref": "supa://tasks/T-2025-09-28-0012/research.md",
    "quality_score": 0.86
  },
  "idempotency_key": "T-2025-09-28-0012:research:hash123"
}
```

### 3.3 Shared Memory

- **Short-term (Redis):** working set; time-boxed to 24–48h.
- **Medium-term (Supabase/Postgres):** task DAGs, approvals, artifacts, audit
  logs.
- **Long-term (Supabase Storage):** dataset snapshots roll into Supabase Storage
  and replicate to the shared `public.one_drive_assets` manifest. AGS workflows
  now rely on the `EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg` OneDrive
  share as the authoritative external mirror, so keep the S3 wrapper credentials
  healthy.【F:docs/WRAPPERS_INTEGRATION.md†L1-L64】【F:supabase/functions/dags-domain-health/index.ts†L40-L78】

> **Operational note:** Run
> `SELECT object_key FROM public.one_drive_assets
> WHERE object_key ILIKE 'dags/%' LIMIT 1;`
> during audits. Investigate immediately if the query returns `NULL` so the
> governance mirror stays authoritative for
> restores.【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L60-L97】【F:supabase/functions/dags-domain-health/index.ts†L40-L78】

## 4. Task Lifecycle (DAG)

1. **Intake:** request normalized → `TASK_CREATED`.
2. **Plan:** planner outputs sub-tasks graph (with risk tags).
3. **Retrieve:** retriever fills context from vector DB/DB/files.
4. **Act:** specialist executes (tool/API/code).
5. **Critic:** evaluate (tests, policies, style).
6. **Approval (if needed):** human gate for T2/T3.
7. **Publish/Execute:** send to user, place trade, post update, etc.
8. **Archive:** logs, artifacts, embeddings; update metrics.

**SLA targets (example):**

| Metric                   | Target                       |
| ------------------------ | ---------------------------- |
| P50 end-to-end (T0–T1)   | ≤ 8s                         |
| P50 end-to-end (T2)      | ≤ 45s                        |
| Human-gated (T3)         | Time to approval SLA < 5 min |
| Task failure rate        | < 1%                         |
| Duplicate execution rate | < 0.3%                       |

## 5. Quality & Safety Evaluation

- **Automatic checks:** unit tests for tools, schema validation, output
  assertions (e.g., “must contain JSON with keys x,y,z”),
  toxicity/prompt-injection filters.
- **LLM-as-Judge (critic):** rubric scoring (factuality, completeness, policy,
  risk).
- **Regression eval sets:** curate gold tasks for recurring flows (signals,
  summaries, support).
- **Rollback criteria:** if critic < threshold or policy violation → rollback,
  escalate.

**Critic rubric (sample):**

- Policy compliance (0/1)
- Evidence cited (0–2)
- Factuality (0–3)
- Clarity (0–2)
- Risk flags (0/1)

Pass ≥ 7/9 and no red flags.

## 6. Reliability Patterns

| Mechanism           | Default Configuration                                                                                                | Notes                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Retries**         | Exponential backoff with jitter, max 3 attempts.                                                                     | Include idempotency keys for safe replay. |
| **Circuit breaker** | Open after 5 consecutive failures in 60s; half-open after 2 min.                                                     | Route to fallback queue while open.       |
| **Fallbacks**       | Retrieval → local cache; payment/trade → `pending-exec` queue + alert; LLM timeout → smaller context + faster model. | Validate fallback health weekly.          |

## 7. Observability & Audit

- **Logs:** structured JSON; correlation IDs = `task_id`.
- **Metrics:**
  - Core: latency P50/P95, success rate, critic score, approval wait, token
    usage, per-agent error rate.
  - Trading: win rate, max drawdown, SL/TP adherence, slippage.
- **Traces:** span per step (OpenTelemetry).
- **Audit Trails:** immutable table for T2/T3: who approved, what changed,
  before/after artifacts.

## 8. Data Design (Supabase-Friendly)

**Tables (minimal):**

- `tasks(task_id, created_at, actor, goal, risk_tier, status)`
- `task_steps(step_id, task_id, agent, input_ref, output_ref, status, quality_score, started_at, ended_at)`
- `approvals(approval_id, task_id, step_id, tier, approver, decision, reason, ts)`
- `artifacts(artifact_id, task_id, type, storage_ref, checksum, created_at)`
- `events(event_id, task_id, type, payload_json, idempotency_key, ts)`
- `limits(account_id, daily_loss_cap, max_order_size, ...)`
- `audit_logs(id, actor, action, object, before_json, after_json, ts)`

**Indexes:** `tasks.status`, `task_steps.task_id`, `events.idempotency_key`
(unique).

## 9. Configuration & Policies (YAML)

```yaml
version: 1
limits:
  trading:
    max_daily_loss_pct: 5
    max_drawdown_pct: 10
    max_positions: 3
  payments:
    max_single_tx_usdt: 500
    cool_down_minutes: 30
risk_tiers:
  T0: ["READ", "RESEARCH", "RETRIEVE"]
  T1: ["WRITE_DB", "SUMMARIZE", "DRAFT_REPLY"]
  T2: ["PUBLISH", "SOCIAL_POST"]
  T3: ["TRADE", "PAYMENT", "WITHDRAWAL"]
approvals:
  T2: ["critic>=0.8", "operator_approval"]
  T3: ["critic>=0.9", "operator_approval", "owner_approval", "dry_run_required"]
agents:
  planner: "planner:v2"
  researcher: "researcher:v3"
  retriever: "retriever:v1"
  trader: "trader:xauusd-v6"
  exec: "executor:v2"
  communicator: "telegram-comms:v3"
  critic: "critic:guard-v4"
```

## 10. Sync Runbooks (SOPs)

### 10.1 Desync / Duplicate Execution

- **Symptoms:** repeated trades/posts, out-of-order steps.
- **Checks:** event bus delay? idempotency collision? Redis TTL expired?
- **Fix:**
  1. Pause orchestrator consumers.
  2. Deduplicate events by `idempotency_key`.
  3. Rebuild `task_steps` from latest good artifacts.
  4. Reopen consumers; monitor P95 latency and duplicate rate.

### 10.2 Tool Failure

- **Symptoms:** 5xx from external API; critic failures spike.
- **Fix:**
  1. Trip circuit breaker; route to fallback tool.
  2. Notify operator; attach failing request/response pairs.
  3. After recovery, run canary tasks; tighten timeouts.

### 10.3 Memory Drift (Stale Context)

- **Symptoms:** outdated facts, wrong embeddings.
- **Fix:**
  1. Invalidate cache; re-embed affected sources.
  2. Mark tasks using stale chunks and re-run retrieval + critic.
  3. Compare the Supabase state against the OneDrive manifest
     (`public.one_drive_assets`) before restoring context back into the DAG so
     the replay uses the freshest
     artefacts.【F:docs/WRAPPERS_INTEGRATION.md†L39-L64】【F:supabase/functions/dags-domain-health/index.ts†L40-L78】

## 11. Security & Compliance

- **Secrets:** env-only; rotate quarterly; scope per agent/tool.
- **Data handling:** PII masked in logs; retention policy (90d raw, 1y metrics).
- **Human-overrides:** emergency stop on T3 pipelines; “break-glass” key with
  dual-control.

## 12. KPIs & Alerts

- **Core KPIs:** Success rate ≥ 99%, critic pass ≥ 95%, duplicate execution <
  0.3%, mean approval time (T3) < 5 min, trading rule violations = 0.
- **Alerts:**
  - Duplicate rate > 1% (critical)
  - Circuit open > 5 min (warn)
  - Critic pass < 85% (warn)
  - Drawdown breach or position > limit (critical)

## 13. Example Flows (Yours)

### 13.1 Trading Signal → Telegram

1. `TASK_CREATED` (T2) with market context.
2. Planner → researcher, retriever, trader.
3. Critic validates RR, SL/TP, risk.
4. Operator approves (soft).
5. Communicator posts to Telegram → `PUBLISH`.
6. Archive → metrics update.

### 13.2 VIP Payment → Access Control (T3)

1. Payment intent created → `NEED_APPROVAL` if above cap.
2. On approval, Exec calls Telegram API to add user.
3. Write `user_subscriptions`; set expiry; schedule removal job.
4. Audit log with before/after.

## 14. Minimal Code Patterns

### 14.1 Idempotent Consumer (Pseudo)

```ts
const seen = await db.getByIdempKey(evt.idempotency_key);
if (seen) return "SKIP";
await db.insertEvent(evt);
await handle(evt);
```

### 14.2 Critic Contract (JSON In/Out)

```json
{
  "input_ref": "supa://artifacts/A123/output.md",
  "checks": ["policy", "factuality", "format", "risk"],
  "threshold": 0.80
}
```

### 14.3 Task DAG (Compact)

```json
{
  "task_id": "T-2025-09-28-0012",
  "nodes": [
    { "id": "plan", "agent": "planner" },
    { "id": "retrieve", "agent": "retriever", "after": ["plan"] },
    { "id": "act", "agent": "exec", "after": ["retrieve"] },
    { "id": "critic", "agent": "critic", "after": ["act"] },
    { "id": "approve", "agent": "human", "tier": "T2", "after": ["critic"] },
    { "id": "publish", "agent": "communicator", "after": ["approve"] }
  ]
}
```

## 15. Implementation Checklist

**Phase 1 – Foundations**

1. Create Supabase tables and indexes (Section 8).
2. Wire Redis for STM and idempotency keys.
3. Define YAML policies (Section 9) and load at boot.

**Phase 2 – Orchestration**

4. Implement event schemas and versioning.
5. Add critic rubric and gold evaluation set.
6. Add circuit breaker and fallback paths.

**Phase 3 – Observability & Resilience**

7. Ship dashboards: latency, duplicate rate, critic pass, approvals.
8. Run chaos tests (tool down, slow bus, stale memory).
9. Document human approval SOPs.
10. Audit the OneDrive mirror by ensuring
    `SELECT object_key FROM public.one_drive_assets WHERE object_key ILIKE 'dags/%';`
    returns rows, the `dags-domain-health` endpoint reports a healthy mirrored
    dataset with a sample manifest entry, and capture the manifest delta
    alongside Supabase Storage
    snapshots.【F:docs/WRAPPERS_INTEGRATION.md†L39-L64】【F:supabase/migrations/20251104090000_enable_s3_wrapper.sql†L60-L97】【F:supabase/functions/dags-domain-health/index.ts†L40-L78】【F:supabase/functions/_shared/domain-health.ts†L101-L167】
11. Drill incident runbooks quarterly.

## 16. Quickstart (Your Stack)

- **Supabase Edge Functions:** orchestrator, critic, communicator webhooks.
- **TradingView → Webhook:** → orchestrator `TASK_CREATED`.
- **Telegram Bot:** announcements and approvals (`/approve T3-... yes`).
- **Storage:** artifacts in Supabase Storage; reference via `supa://` URIs.
- **Vector DB:** if none, start with pgvector in Supabase.

## 17. Audit Checklist

Use these audit passes to verify the Dynamic AGS stack remains compliant,
observable, and production ready. Capture evidence (screen recordings, Supabase
screenshots, log excerpts) for each check and store it under the task's artifact
directory.

### 17.1 Quarterly Governance & Safety Audit

1. **Policy Alignment:** Confirm YAML policies (Section 9) match the latest
   owner directives and that risk tier overrides are documented in `approvals`
   metadata.
2. **Role Reviews:** Validate that Owner, Operator, Reviewer, and agent service
   accounts follow least-privilege assignments in Supabase Auth and cloud IAM.
3. **Guardrail Effectiveness:** Spot check prompt-injection filters,
   trade/payment caps, and dual-control flows by running the critic against
   intentionally malformed payloads.
4. **Human-in-the-Loop Logs:** Ensure T2/T3 approvals show immutable audit
   entries with approver identity, timestamps, and attached artifacts.

### 17.2 Monthly Reliability & Observability Audit

1. **SLO Tracking:** Compare latency, duplicate execution, critic pass, and
   incident frequency metrics to Section 12 targets. Flag breaches for
   remediation plans.
2. **Fallback Drills:** Execute at least one chaos test per quarter (retrieval
   outage, payment processor failure, LLM timeout) and confirm runbooks in
   Section 10 produce the expected recovery steps.
3. **Idempotency Validation:** Review the latest `events` table for unique
   `idempotency_key` counts vs. total events to detect hidden duplicates or
   retries.
4. **Tracing & Logs:** Sample OpenTelemetry traces to confirm each DAG step
   emits spans with correlation IDs and that log retention policies are honored.

### 17.3 Memory & Knowledge Integrity Audit

1. **Redis TTL Hygiene:** Inspect Redis for expired or orphaned short-term keys
   and verify the orchestrator rehydrates context from mid-term storage when
   needed.
2. **Vector Store Freshness:** Re-embed a random 5% sample of knowledge base
   documents, comparing cosine similarity deltas to detect drift or outdated
   embeddings.
3. **Task DAG Consistency:** Cross-reference `task_steps` records with stored
   artifacts to ensure no orphaned outputs or missing critic evaluations remain.
4. **Incident Postmortems:** Confirm that any incidents tagged as memory-related
   include remediation tickets and schedule follow-up audits within 30 days.
