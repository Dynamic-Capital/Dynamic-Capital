# Dynamic Capital Model Context Protocol

## Mission Alignment

The Model Context Protocol (MCP) anchors every model-facing workflow in this
repository—from the Telegram Mini App to the Dynamic Hedge engine—around a
single, auditable contract for sourcing, packaging, and delivering intelligence.
Optimizing MCP for Dynamic Capital means:

- Giving the Telegram deposit assistant, Go orchestration service, and Supabase
  edge functions a shared definition of the context they consume.
- Routing investor, market, and operational knowledge through the same
  guardrails that already power `supabase/functions`, `dynamic_ai`,
  `dynamic_bridge`, and the web surfaces in `apps`.
- Preserving compliance and latency guarantees while the platform scales
  multi-LLM experimentation and trading automation.

## Applicability

This protocol governs any component that prepares or consumes model-ready
context, including:

- **Runtime services** – Supabase edge functions (e.g.,
  `supabase/functions/miniapp`, `.../dynamic-hedge`), the Go service under
  `go-service`, and the WebSocket bridges in `dynamic_bridge`.
- **AI orchestration** – Modules inside `dynamic_ai`, retrieval tooling in
  `dynamic_memory`, and evaluation harnesses in `dynamic_library` and `grok-1`.
- **Client experiences** – Telegram bot flows, the Next.js Mini App (`apps`),
  analyst dashboards, and broadcast automations.
- **Operational tooling** – Observability and compliance utilities inside
  `broadcast`, `integrations`, and Supabase SQL/scripting defined in
  `supabase/migrations`.

## Context Value Streams

| Value Stream                           | Primary Surfaces                                                                                   | Core Context Packages                                                        | Repository Touchpoints                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Telegram deposit & KYC automation**  | Supabase functions `receipt-*`, `verify-*`, `payments-*`; Telegram bot sync jobs; Go webhook relay | Task manifest + investor snapshot + compliance policy + live payment signals | `apps` (Mini App UI), `supabase/functions/telegram-*`, `go-service`, `dynamic_memory` schemas     |
| **Dynamic Hedge & liquidity controls** | Supabase function `dynamic-hedge`, `dynamic_ai/hedge.py`, MT5 bridge orchestrator                  | Risk envelope, market depth snapshot, treasury controls                      | `dynamic_ai`, `dynamic_bridge/mt5_bridge.py`, `supabase/functions/dynamic-hedge`, `dynamic_cache` |
| **Multi-LLM strategy studio**          | `dynamic_ai` adapters, `supabase/functions/analysis-ingest`, notebooks in `ml`                     | Strategy brief, benchmark corpus, telemetry traces                           | `dynamic_ai/fusion.py`, `ml`, `dynamic_library`, `supabase/functions/analysis-ingest`             |
| **Investor intelligence & broadcasts** | Broadcast Cron (`supabase/functions/broadcast-*`), analytics collectors, Next.js dashboards        | Audience cohort, messaging policy, market intel bundle                       | `broadcast`, `supabase/functions/analytics-*`, `apps`, `dynamic_reference`                        |

Use these streams to scope new integrations: each package inherits the base
protocol while tailoring payload shape to the consuming surface.

## Protocol Architecture

### Source Layers

| Layer                     | Description                                                     | Example Feeds                                                                                                    | Steward                  |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Transactional Signals** | Real-time deposits, withdrawals, trade execution, MT5 telemetry | Supabase tables `transactions`, `kyc_sessions`; functions `payments-auto-review`, `dynamic-hedge`; MT5 event bus | Treasury Ops + Hedge Ops |
| **Knowledge Corpus**      | Playbooks, compliance rules, market briefs, exec directives     | `docs/`, `dynamic_reference`, S3 knowledge store indexed via `dynamic_memory`                                    | Knowledge Ops            |
| **Operational Health**    | Incident logs, job runtimes, bot uptime, webhook drift          | Supabase functions `system-health`, `web-app-health`, logs in `integrations`                                     | Platform Reliability     |
| **External Intelligence** | Economic calendars, sentiment feeds, partner research           | Functions `economic-calendar`, `collect-market-sentiment`, `analysis-ingest`                                     | Research Desk            |

### Assembly Services

1. **Ingestion** – Supabase edge functions stream structured data into curated
   tables while unstructured assets route through `dynamic_memory` builders.
   Kafka is optional; when absent use Supabase `realtime` channels.
2. **Normalization** – Use JSON schemas stored alongside functions (e.g.,
   `supabase/functions/*/config`) and Markdown conventions under `docs/` for
   narrative fragments. Every record carries provenance metadata: `source_id`,
   `hash`, `sensitivity`, and TTL.
3. **Ranking** – Apply retrieval heuristics from `dynamic_ai/analysis.py`,
   embeddings built in `dynamic_memory_reconsolidation`, or rule engines inside
   `dynamic_ai/risk.py` depending on the stream.
4. **Packaging** – Compose context packages via dedicated assemblers
   (recommended location: `supabase/functions/context-*` or reusable utilities
   in `dynamic_ai/core.py`). Sign payloads with Supabase JWT scoped to access
   tier.
5. **Delivery** – Surface packages through:
   - HTTPS responses to Telegram bot and Mini App.
   - WebSocket or gRPC pipes managed by `dynamic_bridge/orchestrator.py`.
   - Queue emissions to downstream analytics (`queue/`,
     `dynamic_message_queue`).

### Delivery Contracts

- Publish OpenAPI specs per package in `docs/api/` (or co-located with the
  function) and JSON Schema definitions alongside each adapter or under a
  dedicated `docs/schemas/` directory.
- Maintain Adapter SDKs in `dynamic_tool_kits` (TypeScript) and `dynamic_ai`
  (Python) with automated guardrail checks before dispatch.
- Emit audit events (`context.delivered`, `context.dropped`,
  `context.escalated`) through Supabase `analytics-data` function into analytics
  dashboards consumed by Ops and Compliance.

## Context Package Profiles

### Telegram Deposit Assistant

- **Task Manifest** – Deposit type, user tier, currency, allowed actions.
  Derived from Supabase row + `apps` route params.
- **Entity Snapshot** – KYC status, anonymized wallet or bank identifiers, risk
  flags from `dynamic_ai/risk.py`.
- **Signal Deck** – Latest OCR verdict (`supabase/functions/receipt-ocr`),
  payment verification status, webhook latency metrics.
- **Narrative Frame** – Recent support transcripts or policy excerpts stored in
  `dynamic_reference`.
- **Guardrail Policy** – Jurisdictional masking (EU, APAC) + escalation playbook
  referencing `supabase/functions/admin-*`.

### Dynamic Hedge Engine

- **Task Manifest** – Hedge objective, asset universe, allowed venues.
- **Entity Snapshot** – Treasury balances from Supabase, liquidity tiers, MT5
  account metadata.
- **Signal Deck** – Order flow from `dynamic_bridge/mt5_bridge.py`, pricing
  feeds, risk exposure computed in `dynamic_ai/hedge.py`.
- **Narrative Frame** – Market commentary and runbook steps relevant to the
  current volatility regime.
- **Guardrail Policy** – Trading limits, kill-switch toggles, compliance
  approvals captured via `supabase/functions/dynamic-hedge`.

### Multi-LLM Strategy Studio

- **Task Manifest** – Experiment objective, evaluation metric, latency budget.
- **Entity Snapshot** – Model variant, dataset pointer (Supabase storage
  bucket), benchmark config.
- **Signal Deck** – Retrieval metrics, prior win/loss ratios, telemetry from
  `dynamic_ai/fusion.py`.
- **Narrative Frame** – Research briefs, code snippets, governance notes.
- **Guardrail Policy** – Provider usage caps, data residency, sandbox vs.
  production toggle.

## Governance & Compliance

- Maintain a **Context Registry** table (`mcp_registry`) inside Supabase
  capturing source, owner, schema version, sensitivity, retention, and refresh
  cadence. Enforce writes through a migration in `supabase/migrations`.
- Implement **Access Tiers**: `public`, `restricted`, `sovereign`. Map every
  adapter (Telegram bot, Go service, MT5 bridge, analytics exports) to the
  minimal tier.
- Perform **Redaction** using deterministic tokenization utilities in
  `dynamic_ai/core.py` before embeddings or prompt assembly. Store reversible
  secrets in Vault or Supabase secrets, never in code.
- Run **Drift Audits** weekly via a scheduled function
  (`supabase/functions/context-drift-audit`) comparing delivered packages vs.
  canonical records; escalate anomalies >2% divergence.
- Capture **Immutable Logs** by forwarding audit events to storage buckets
  defined in `supabase/resource-plan.ts` with Glacier retention for 365 days.

## Operational Cadence & Metrics

| Cadence   | Ritual                                                                     | Owner                                | Outputs                                        |
| --------- | -------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| Daily     | Freshness sweep across key tables (`transactions`, context staging queues) | Knowledge Ops                        | Diff report, Supabase issue queue              |
| Weekly    | MCP governance sync aligned with `ops-health`                              | Protocol Lead + Platform Reliability | Drift audit results, guardrail backlog         |
| Monthly   | Risk & Compliance review                                                   | Risk Officer                         | Policy updates, tier adjustments               |
| Quarterly | Architecture retrospective with AI + App leads                             | CTO Office                           | Schema upgrades, SDK roadmap, automation goals |

Key metrics:

- **Freshness SLA** – ≥ 99% of critical signals updated within declared cadence.
- **Package Success Rate** – ≥ 99.5% deliveries without guardrail violation or
  adapter error.
- **Redaction Accuracy** – ≤ 0.1% false negatives in DLP scans.
- **Retrieval Latency** – Median package assembly < 800 ms under standard load.
- **Response Alignment** – ≥ 95% of sampled model outputs tagged
  context-aligned.

## Implementation Checklist

- [ ] Register every source in `mcp_registry` with owner, schema link,
      sensitivity, and refresh policy.
- [ ] Harden ingestion (Supabase functions, MT5 bridge) with schema validation,
      retries, and circuit breakers.
- [ ] Deploy ranking heuristics (semantic search, rules) per value stream inside
      `dynamic_ai`.
- [ ] Ship adapter SDK updates enforcing guardrail verification prior to
      dispatch.
- [ ] Instrument delivery paths with tracing (Supabase `analytics-data`,
      external APM), metrics, and anomaly alerts.
- [ ] Close the feedback loop by storing model responses, human corrections, and
      incidents for retraining.
- [ ] Review compliance posture monthly and rotate credentials according to
      `SECURITY.md`.

## Incident Response Playbook

1. **Detection** – Alerts from Supabase functions (`system-health`,
   `context-drift-audit`) or observability dashboards flag anomalies.
2. **Containment** – Pause impacted adapters (disable Supabase function, halt
   MT5 bridge, rate-limit bot), revoke compromised tokens.
3. **Eradication** – Patch ingestion or ranking pipelines, correct schema
   mismatches, reprocess affected packages.
4. **Recovery** – Re-run freshness checks, validate guardrail state, restore
   adapters with staged rollouts.
5. **Postmortem** – Document incident in `docs/ops/` (or create if absent),
   update guardrail configurations, and file backlog items.

## Repository Crosswalk

| Capability           | Directory / Artifact                                                        | Notes                                   |
| -------------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| Context assemblers   | `supabase/functions/context-*` (new) or shared libs in `dynamic_ai/core.py` | Centralize serialization + signing      |
| Retrieval embeddings | `dynamic_memory`, `dynamic_memory_reconsolidation`                          | Manage vector stores, decay policies    |
| Hedge orchestration  | `dynamic_ai/hedge.py`, `dynamic_bridge/mt5_bridge.py`                       | Ensure MCP packages drive trading logic |
| Multi-LLM tooling    | `dynamic_ai`, `dynamic_library`, `ml`                                       | Standardize experiment inputs           |
| Client adapters      | `apps`, `go-service`, `broadcast`                                           | Respect tiered access + policy tagging  |
| Compliance artifacts | `SECURITY.md`, `docs/compliance/*`, Supabase migrations                     | Keep protocol changes reviewable        |

Adhering to this protocol keeps model-facing systems consistent with the rest of
the Dynamic Capital stack while giving teams a transparent, auditable framework
to evolve context quality over time.
