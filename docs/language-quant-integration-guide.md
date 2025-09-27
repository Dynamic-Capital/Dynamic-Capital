# Language and Quant Integration Guide

## Overview

This guide maps open-source projects onto the Dynamic Capital automation lobes
so the team can rapidly assemble a language-driven quantitative research and
execution stack. Use it when prioritizing integrations, evaluating build-vs-buy
decisions, or briefing new contributors on the technology landscape.

## Module Alignment Snapshot

| Dynamic Capital Lobe / Module | Recommended Project(s)               | Role in the Ecosystem                                                                                          |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Language / Agent / Fusion** | llama.cpp, LlamaIndex, LLaMA-Factory | Local inference, retrieval-augmented reasoning, and domain-specific fine-tuning for multi-agent orchestration. |
| **Quant Research & Signals**  | Qlib                                 | Feature engineering, factor libraries, and production-grade research pipelines.                                |
| **Reinforcement Learning**    | FinRL, RLQuant, TradeMaster          | Market simulators, agent templates, and evaluation tooling for adaptive policy optimization.                   |
| **Execution & Deployment**    | NautilusTrader                       | Event-driven backtesting, live trading gateways, and risk controls.                                            |
| **Full-Stack Reference**      | FinWorld                             | Reference architecture that stitches data, modeling, and agent automation together.                            |

## Language, Memory, and Agent Orchestration

### llama.cpp

- Deploy LLaMA-family models in edge-constrained or air-gapped environments.
- Pair with quant notebooks to enable on-demand strategy explanations without
  cloud latency.
- Follow the [llama.cpp Runtime Integration](./llama-cpp-runtime.md) guide to
  sync vendor sources and build the optimized Docker image.

### LLaMA-Factory

- Fine-tune base weights with proprietary research memos and telemetry.
- Export LoRA adapters that can be mounted inside llama.cpp runtimes for fast
  iteration.

### LlamaIndex

- Unify Supabase (Memory), TradingView logs, and research briefs into a
  queryable knowledge index.
- Compose retrieval, summarization, and critique agents that assist the Dynamic
  Analysis Algo during signal reviews.

## Quantitative Research and Signal Generation

### Qlib

- Centralize factor definitions, alpha modeling experiments, and evaluation
  metrics.
- Automate dataset curation and feature pipelines that feed the Dynamic Learning
  Algo.
- Use Qlib’s workflow scheduler to align retraining cadence with treasury and
  risk checkpoints.

## Reinforcement Learning & Adaptive Execution

### FinRL

- Prototype RL agents that learn position sizing and hedging policies under
  market constraints.
- Leverage ready-made market environments (stocks, crypto, forex) to accelerate
  scenario testing.

### TradeMaster

- Run end-to-end experiments covering data ingestion, environment setup, agent
  training, and deployment.
- Benchmark cross-market strategies against standardized metrics before
  promotion to production.

### RLQuant

- Explore hybrid RL + supervised models for complex regime detection tasks.
- Integrate policy outputs with Dynamic Risk Algo guardrails to prevent
  over-allocation.

## Execution Engine Integration

### NautilusTrader

- Adopt its event-driven architecture to bridge TradingView signals with
  MT5/Exness order routing.
- Utilize built-in risk checks, portfolio accounting, and latency-aware
  execution modules.
- Mirror its backtesting APIs to validate Dynamic Execution Algo upgrades
  pre-deployment.

## End-to-End Reference Platform

### FinWorld

- Study FinWorld’s data lake, orchestration, and agent automation patterns as a
  scaffold for full-stack delivery.
- Identify reusable abstractions (data services, agent coordinators, deployment
  scripts) that can be ported into Dynamic Capital.

## Implementation Roadmap

1. **Baseline Language Stack** — Containerize llama.cpp with a curated model zoo
   and wire LlamaIndex agents to Supabase and document stores.
2. **Quant Research Pipeline** — Stand up Qlib experiments that populate the
   Dynamic Knowledge Algo repository with vetted factors.
3. **Adaptive Agents** — Pilot FinRL and TradeMaster agents in simulation,
   graduating the best performers into staged NautilusTrader environments.
4. **Unified Automation** — Feed telemetry from execution back into
   LLaMA-Factory fine-tuning cycles, closing the Brain ↔ Hands feedback loop.
5. **Platform Harmonization** — Borrow FinWorld deployment conventions to ensure
   reproducible environments across research, staging, and production.

## Governance and Risk Considerations

- **Licensing** — Track each project’s license (Apache, MIT, etc.) and confirm
  compatibility with Dynamic Capital’s commercial roadmap.
- **Security** — Audit inbound dependencies, especially C++ components
  (llama.cpp) and trading engines (NautilusTrader), for supply-chain risks.
- **Operational Readiness** — Define service-level objectives (latency, uptime)
  before promoting any new agent or execution bridge to production.
- **Data Compliance** — Ensure fine-tuning datasets and reinforcement learning
  logs respect jurisdictional privacy and market-data agreements.

## Next Steps

- Prioritize proof-of-concept milestones for the Language and Quant modules.
- Assign owners to evaluate integration depth (fork vs. upstream contribution)
  for each project.
- Update this guide as new open-source entrants emerge or when modules graduate
  into production.
