# Dynamic AI & Dynamic Trading Algo (DTA) Enhancement Roadmap

This roadmap breaks the multi-LLM studio, trading automation stack, and
analytics surfaces into staged workstreams. Follow each step in order—the
actions progressively reduce risk while layering in new capabilities.

## 1. Baseline Inventory & Telemetry

1. **Catalogue assets** – Map `apps/web/app/tools/multi-llm`,
   `algorithms/python`, `algorithms/pine-script`, Supabase functions, and queue
   workers that already consume model output. Flag undocumented consumers.
2. **Instrument usage** – Add request/response logging with latency, token, and
   error metrics per provider into Supabase analytics tables. Mirror the logging
   inside the Dynamic Trading Algo (DTA) pipelines (`RealtimeExecutor`,
   `TradeLogic.on_bar`).
3. **Capture outcomes** – Tie each trade decision to the originating provider
   mix, prompt template, and algorithm parameters so post-trade analysis can
   quantify model impact.

## 2. Provider Capability Matrix

1. **Define evaluation axes** – Latency, cost-per-1K tokens, reasoning depth,
   tool-use support, and domain accuracy (SMC vocabulary, trading risk).
2. **Benchmark providers** – Use Multi-LLM Studio to run scripted evaluations
   across providers on shared prompts; export results to a Supabase table.
3. **Curate prompt templates** – Maintain a versioned prompt library aligned to
   each provider’s strengths (e.g., structured JSON for deterministic models,
   narrative rationale for reasoning-heavy models).

## 3. Orchestration Architecture

1. **Design routing policy** – Start with a rules engine: route research queries
   to reasoning-optimized models, execution guardrails to deterministic ones,
   and fallback logic for degraded providers.
2. **Introduce ensemble scoring** – Implement a reranker that compares
   multi-provider outputs, scores them via heuristics (signal alignment,
   confidence tags), and selects the best response for downstream trading logic.
3. **Enable human-in-the-loop overrides** – Surface conflicting or
   low-confidence outputs to analysts via the studio UI with
   quick-approve/reject flows that feed back into the scoring weights.

## 4. Dynamic AI Evolution

1. **Reinforce evaluation data** – Capture transcripts, prompts, and outcomes
   from production sessions to build red-teaming corpora and golden datasets.
   Use them to routinely calibrate reasoning depth, tool invocation accuracy,
   and structured output fidelity across providers.
2. **Evolve the agent graph** – Introduce specialized Dynamic AI personas for
   research, risk, and execution review. Define explicit inputs/outputs and
   mediation protocols so the orchestrator can route complex requests through
   multi-agent chains without losing context. The `dynamic.intelligence.ai_apps/agents.py` module
   and `run_dynamic_agent_cycle` helper now supply the reference implementation
   for this flow, so future roadmap work can extend or customise personas rather
   than recreating the
   plumbing.【F:dynamic.intelligence.ai_apps/agents.py†L1-L365】【F:algorithms/python/dynamic.intelligence.ai_apps_sync.py†L64-L143】
3. **Automate self-audits** – Schedule nightly replay jobs that compare provider
   rationales against historical market truth. Escalate regressions to analysts
   and capture remediation actions as configuration proposals for upcoming
   sprints.

## 5. Dynamic Trading Algo (DTA) Integration

1. **Align glossary checkpoints** – Ensure prompt outputs respect SMC
   terminology so they plug directly into `MarketSnapshot` and analyzer
   expectations.
2. **Shadow deployments** – Run multi-LLM assisted strategies in parallel with
   existing automation, comparing BOS/SMS detection, risk metrics, and fill
   quality before cutting over.
3. **Automated guardrails** – Gate live orders on consensus thresholds from the
   ensemble (e.g., require two providers to agree or have a combined confidence
   score above a target) before the EA or Supabase worker executes.

## 6. Experimentation & Feedback Loops

1. **Replay harness** – Build notebooks or scripts that replay historical market
   sessions through the multi-LLM stack to score precision/recall on liquidity
   sweeps and mitigation blocks.
2. **A/B pipeline** – Randomly assign signal batches to baseline vs. enhanced
   pipelines; capture performance diffs (win rate, R-multiples, drawdown).
3. **Closed-loop learning** – Feed tagged outcomes (profitable, flat, loss) into
   prompt/weight tuning jobs so future runs prioritize successful patterns.

## 7. Compliance, Risk & Security

1. **Vendor assessment** – Document provider data handling policies; align with
   SOC/GDPR controls already tracked in the repo and extend to Maldivian
   regulations as legal counsel dictates.
2. **Secrets governance** – Centralize API keys in the existing secrets
   management workflows (`docs/SECRETS.md`), ensuring environment-specific
   rotations and access reviews.
3. **Incident response** – Update trading runbooks with escalation steps for
   provider outages, quality regressions, or hallucinated signals. Include
   rollback instructions for algorithm parameter changes tied to the ensemble.

## 8. Delivery & Communication

1. **UI evolution** – Extend Multi-LLM Studio with comparison charts, provider
   status badges, and replay exports so stakeholders understand routing choices.
2. **Stakeholder updates** – Publish sprint notes summarizing experiments,
   routing adjustments, and trading performance impact in the team’s shared
   tracker.
3. **Training modules** – Add onboarding material that teaches analysts how to
   interpret ensemble confidence, override flows, and log feedback.

## 9. Milestone Timeline

| Phase                | Duration   | Key Deliverables                                      |
| -------------------- | ---------- | ----------------------------------------------------- |
| Foundations          | Weeks 1-2  | Telemetry pipelines, provider matrix, prompt library  |
| Orchestration        | Weeks 3-4  | Routing engine, ensemble scoring prototype            |
| Dynamic AI Evolution | Weeks 5-6  | Golden datasets, persona graph, replay harness        |
| DTA Integration      | Weeks 7-8  | Shadow trading runs, guardrail automation             |
| Scale-Up             | Weeks 9-10 | A/B reporting, incident runbooks, studio enhancements |
| Continuous           | Ongoing    | Quarterly audits, prompt/weight refresh cadence       |

Treat each phase as reviewable iteration; do not advance without metrics and
risk sign-off from trading, compliance, and platform engineering leads.

## Automation Support

Use the `algorithms/python/trading_algo_enhancement.py` module to materialise
this roadmap as an executable orchestration plan. The helper exposes default
tasks, dependency-aware recommendations, and an `OrchestrationPlan` builder so
engineering, trading, and compliance teams can track telemetry, Dynamic AI
evolution, DTA integration, experimentation, and governance milestones
programmatically.
