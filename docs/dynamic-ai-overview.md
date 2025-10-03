# Dynamic AI (DAI) Overview

Dynamic AI (DAI) is the "Brain" of the Dynamic Capital organism. It fuses market
perception, reinforcement signals, and treasury limits into governed trading
recommendations that the automation stack can trust. Treat this page as a system
primer for new contributors and a checklist for operators validating that the
Brain remains aligned with execution, memory, and governance surfaces.

## 1. System Snapshot

| Capability             | What it does                                                                                                                              | Key implementation source                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Multi-lobe fusion      | Normalises directional, momentum, sentiment, and treasury lobes into a bounded signal with rationale + confidence payloads.               | `dynamic.intelligence.ai_apps/fusion.py`【F:dynamic.intelligence.ai_apps/fusion.py†L13-L167】       |
| Regime-aware weighting | Adjusts each lobe’s influence based on volatility, session, and risk-off signals before mapping to BUY/SELL/NEUTRAL actions.              | `dynamic.intelligence.ai_apps/fusion.py`【F:dynamic.intelligence.ai_apps/fusion.py†L169-L214】      |
| Lorentzian calibration | Rebuilds Lorentzian lobes from serialized models, enforcing sane sensitivity thresholds for new market regimes.                           | `dynamic.intelligence.ai_apps/training.py`【F:dynamic.intelligence.ai_apps/training.py†L14-L48】    |
| Persona agents         | Packages research, execution, and risk personas with consistent payloads so orchestration can route requests through a reusable chain.    | `dynamic.intelligence.ai_apps/agents.py`【F:dynamic.intelligence.ai_apps/agents.py†L1-L382】        |
| Automation feedback    | Routes telemetry, governance hooks, and integration payloads through the broader ecosystem so retraining and compliance stay in lockstep. | `docs/dynamic-capital-ecosystem-anatomy.md`【F:docs/dynamic-capital-ecosystem-anatomy.md†L16-L288】 |

## 2. Signal Lifecycle

1. **Perception** – Eyes/Ears layers ship tick, sentiment, and macro data into
   the Brain’s lobes (price, trend, sentiment, treasury
   health).【F:docs/dynamic-capital-ecosystem-anatomy.md†L65-L170】
2. **Lobe evaluation** – Each lobe emits a bounded score with a rationale and
   confidence payload.【F:dynamic.intelligence.ai_apps/fusion.py†L33-L167】
3. **Regime weighting** – The fusion engine scales lobe impact based on
   volatility, sentiment, and session context before averaging
   scores.【F:dynamic.intelligence.ai_apps/fusion.py†L181-L214】
4. **Action routing** – Normalised scores convert into BUY/SELL/NEUTRAL intents
   with a minimum confidence gate that downstream risk algos
   read.【F:dynamic.intelligence.ai_apps/fusion.py†L189-L222】
5. **Execution & guardrails** – Hands-layer algos accept or veto requests,
   logging receipts to Supabase for replay and compliance
   trails.【F:docs/dynamic-capital-ecosystem-anatomy.md†L41-L214】
6. **Learning loop** – Training utilities recalibrate Lorentzian lobes as new
   telemetry shifts the underlying sensitivity
   envelope.【F:dynamic.intelligence.ai_apps/training.py†L22-L48】

## 3. Lobe Responsibilities

| Lobe                    | Signal focus                                                               | Implementation notes                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lorentzian Distance** | Detects outsized price deviations relative to a reference trajectory.      | Produces a contrarian score when deviation exceeds calibrated sensitivity, surfacing rationale text for auditability.【F:dynamic.intelligence.ai_apps/fusion.py†L54-L77】 |
| **Trend Momentum**      | Blends directional bias with measured momentum intensity.                  | Maintains neutral stance until thresholds are hit, preventing premature flips during sideways regimes.【F:dynamic.intelligence.ai_apps/fusion.py†L83-L105】               |
| **Sentiment**           | Aggregates qualitative feeds and keyword bias.                             | Enforces a floor on confidence and weights lexical tone to stabilise noisy social inputs.【F:dynamic.intelligence.ai_apps/fusion.py†L107-L142】                           |
| **Treasury**            | Measures balance, liabilities, and utilisation to determine risk appetite. | Tightens or loosens conviction based on treasury buffer ratios and utilisation caps.【F:dynamic.intelligence.ai_apps/fusion.py†L145-L167】                                |

> **Extending lobes** – New lobes should implement the `SignalLobe` protocol,
> emit bounded scores, and include rationale strings that can be surfaced to
> operators.【F:dynamic.intelligence.ai_apps/fusion.py†L24-L77】

## 4. Guardrails & Governance Alignment

- **Risk veto chain** – Dynamic Risk, Allocation, and Scalper algos monitor lobe
  rationales and confidence to halt execution when guardrails breach (drawdown,
  exposure, treasury
  buffers).【F:docs/dynamic-capital-ecosystem-anatomy.md†L41-L142】
- **Telemetry-first** – Execution receipts, backtests, and governance triggers
  are stored in Supabase so historical playbacks can reproduce every DAI
  decision.【F:docs/dynamic-capital-ecosystem-anatomy.md†L115-L288】
- **Compliance hooks** – Skeleton-layer automation consumes the same telemetry
  to validate incident runbooks, audit trails, and regulatory
  obligations.【F:docs/dynamic-capital-ecosystem-anatomy.md†L195-L280】

## 5. Operational Checklist

Use the checklist below when deploying updates or reviewing production health:

1. **Model validation** – Benchmark latency, cost, and reasoning depth across
   LLM providers before promoting orchestration
   changes.【F:docs/multi-llm-algo-enhancement-roadmap.md†L8-L34】
2. **Persona routing** – Keep research, risk, and execution personas calibrated;
   escalate low-confidence or conflicting outputs to human
   operators.【F:docs/multi-llm-algo-enhancement-roadmap.md†L36-L66】
3. **Guardrail rehearsal** – Run ensemble guardrail simulations to verify risk
   veto chains before enabling new automation
   flows.【F:docs/multi-llm-algo-enhancement-roadmap.md†L68-L94】
4. **Replay audits** – Schedule session replays, incident drills, and A/B
   experiments to validate reasoning quality and compliance
   posture.【F:docs/multi-llm-algo-enhancement-roadmap.md†L96-L146】
5. **Versioning hygiene** – Store prompt templates, lobe parameters, and
   environment toggles in Supabase or Git-backed configs for
   reproducibility.【F:docs/multi-llm-algo-enhancement-roadmap.md†L18-L34】【F:docs/dynamic-capital-ecosystem-anatomy.md†L115-L288】

## 6. Contributor Quickstart

- Review the ecosystem anatomy guide to understand how Brain outputs travel
  through Hands, Heart, Voice, and Memory
  layers.【F:docs/dynamic-capital-ecosystem-anatomy.md†L16-L288】
- Start new lobes from the `SignalLobe` protocol, keeping score, confidence, and
  rationale values bounded for
  consistency.【F:dynamic.intelligence.ai_apps/fusion.py†L24-L167】
- Capture evaluation metrics and experiment metadata so the training module can
  automatically recalibrate sensitivity thresholds over
  time.【F:dynamic.intelligence.ai_apps/training.py†L14-L48】
- Keep telemetry rich and human-in-the-loop channels active to catch regressions
  before they propagate to live capital
  flows.【F:docs/multi-llm-algo-enhancement-roadmap.md†L36-L94】

With these practices, Dynamic AI stays transparent, auditable, and responsive as
the automation stack scales across strategies and market conditions.

## 7. Persona Agent Chain

Dynamic AI now exposes a persona chain that mirrors the roadmap’s research →
execution → risk flow. The `ResearchAgent`, `ExecutionAgent`, and `RiskAgent`
share a common result contract so orchestration can serialise outcomes without
bespoke glue.【F:dynamic.intelligence.ai_apps/agents.py†L22-L365】 The sync
helper `run_dynamic_agent_cycle` wires the personas together, expecting the
following context keys when executed manually or via `AlgorithmSyncAdapter`:

1. `research_payload` – optional research inputs
   (technical/fundamental/sentiment/macro) consumed by the analysis persona.
2. `market_payload` – market snapshot for signal fusion (raw signal, confidence,
   momentum, etc.).
3. `risk_context` – drawdown, treasury utilisation, treasury health, and
   volatility metrics feeding guardrails.
4. `market_state` – hedging telemetry (`volatility`, optional `correlations`,
   `news`) for the hedge policy.
5. `account_state` – open exposures/hedges and high-level account limits.
6. Optional `risk_parameters` to override guardrail tolerances per run.

The helper returns the persona outputs plus a consolidated decision payload
combining the fused action, risk adjustments, and hedge directives so downstream
systems ingest a single, structured
packet.【F:algorithms/python/dynamic.intelligence.ai_apps_sync.py†L64-L143】【F:algorithms/python/dynamic.intelligence.ai_apps_sync.py†L284-L292】

Cold starts are now optimised through cached persona instances. Call
`get_dynamic_start_agents()` to materialise the shared research/execution/risk
chain, override factories with `configure_dynamic_start_agents()`, and invoke
`reset_dynamic_start_agents()` when you need to swap or reset
personas.【F:dynamic.intelligence.ai_apps/agents.py†L694-L808】 The sync helper
also honours an optional `dynamic_start_agents` (alias `start_agents`) mapping
inside the context, so orchestration can pass pre-warmed persona objects without
incurring new allocations on every
cycle.【F:algorithms/python/dynamic.intelligence.ai_apps_sync.py†L202-L237】
