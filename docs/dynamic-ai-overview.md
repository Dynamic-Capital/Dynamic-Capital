# Dynamic AI Overview

Dynamic AI (DAI) is the "Brain" of the Dynamic Capital ecosystem. It ingests multi-source market data, learns from execution outcomes, and publishes orchestrated signals that downstream automation converts into trades and treasury actions. The system couples ensemble model outputs with treasury-aware guardrails so strategy conviction, capital allocation, and compliance checks stay aligned.

## Core Responsibilities

- **Signal fusion** – Multiple specialised "lobes" analyse price deviation, trend momentum, sentiment, and treasury health before emitting bounded signals in the range [-1, 1].【F:dynamic_ai/fusion.py†L11-L92】
- **Risk mediation** – Lobes expose confidence scores and rationales that are routed into risk utilities, allowing Dynamic Risk Algo components to veto or attenuate trades when guardrails are breached.【F:dynamic_ai/fusion.py†L59-L92】【F:docs/dynamic-capital-ecosystem-anatomy.md†L16-L43】
- **Learning loop** – Training utilities calibrate Lorentzian distance lobes from retrained models so sensitivity thresholds adapt as market regimes shift.【F:dynamic_ai/training.py†L1-L43】【F:docs/dynamic-capital-ecosystem-anatomy.md†L16-L43】

## Architecture Touchpoints

- **Brain to Hands** – Dynamic Trading, Execution, Risk, Allocation, and Scalper algos (Hands layer) consume DAI outputs to route orders, enforce guardrails, and track realised vs. expected performance.【F:docs/dynamic-capital-ecosystem-anatomy.md†L45-L103】
- **Telemetry feedback** – Trade receipts and TradingView backtests flow back into Supabase (Memory layer), closing the loop for retraining and audit trails.【F:docs/dynamic-capital-ecosystem-anatomy.md†L115-L153】
- **Integrations** – Dynamic Integration Algo serialises DAI signals for TradingView webhooks, MT5 routing, and governance hooks so capital and communication layers react in near real-time.【F:docs/dynamic-capital-ecosystem-anatomy.md†L155-L214】

## Evolution Roadmap

The multi-LLM enhancement roadmap guides how DAI grows in sophistication:

1. **Provider benchmarking** – Instrument latency, cost, and reasoning depth across model providers to build a capability matrix before orchestration logic goes live.【F:docs/multi-llm-algo-enhancement-roadmap.md†L8-L34】
2. **Agent graph expansion** – Introduce specialised personas for research, risk, and execution review, mediated by routing policies that escalate low-confidence outputs to humans.【F:docs/multi-llm-algo-enhancement-roadmap.md†L36-L66】
3. **Guardrail integration** – Align prompt outputs with Dynamic Trading Algo expectations and gate live orders on ensemble consensus thresholds.【F:docs/multi-llm-algo-enhancement-roadmap.md†L68-L94】
4. **Feedback and compliance** – Replay historical sessions, run A/B experiments, and maintain runbooks for incidents, ensuring governance, security, and audit requirements stay satisfied.【F:docs/multi-llm-algo-enhancement-roadmap.md†L96-L146】

## Operational Best Practices

- Keep telemetry rich so nightly replays and self-audits can detect reasoning regressions quickly.【F:docs/multi-llm-algo-enhancement-roadmap.md†L36-L66】
- Version prompt templates and model parameters, storing deltas in Supabase for reproducibility and compliance reviews.【F:docs/multi-llm-algo-enhancement-roadmap.md†L18-L34】【F:docs/dynamic-capital-ecosystem-anatomy.md†L115-L153】
- Maintain human-in-the-loop review channels for conflicting signals or treasury-impacting decisions before production rollout.【F:docs/multi-llm-algo-enhancement-roadmap.md†L36-L94】【F:docs/dynamic-capital-ecosystem-anatomy.md†L45-L103】

Use this overview to onboard teammates, design new lobes, or align roadmap discussions with the existing automation pillars that keep Dynamic Capital adaptive and governed.
