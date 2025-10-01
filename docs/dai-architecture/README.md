# Dynamic AI Architecture Reference

## Overview

Dynamic AI (DAI) orchestrates a federated mesh of specialist reasoning adapters
across four fused lobes—directional, momentum, sentiment, and treasury. The
lobes coordinate thousands of lightweight micro-cores that stream trading
telemetry through persona-driven pipelines before returning guardrailed signals
to execution services. This reference captures the high-level directory layout
and responsibilities for the core code paths that implement the architecture
inside this repository.

## Directory Layout

```
dai-architecture/
│
├── core_adapters/                # Wrappers for each model
│   ├── core1_chatcpt2.py
│   ├── core2_grok.py
│   ├── core3_dolphin.py
│   ├── core4_ollama.py
│   ├── core5_kimi_k2.py
│   ├── core6_deepseek_v3.py
│   ├── core7_deepseek_r1.py
│   ├── core8_qwen3.py
│   ├── core9_minimax_m1.py
│   ├── core10_zhipu.py
│   └── core11_hunyuan.py
│
├── memory/
│   ├── l0_context.py             # Working memory (volatile)
│   ├── l1_episodic.py            # Episodic memory (sessions, events)
│   ├── l2_semantic.py            # Knowledge graph + embeddings
│   ├── l3_procedural.py          # Skills, policies, routing heuristics
│   └── memory_manager.py         # Promotion, consolidation, retrieval
│
├── orchestrator/
│   ├── router.py                 # Core selection logic
│   ├── planner.py                # Task decomposition
│   ├── validator.py              # Schema, safety, consistency checks
│   └── adjudicator.py            # Cross-core debate + merging
│
├── oracle/
│   ├── scorer.py                 # Performance scoring
│   ├── feedback.py               # Update routing weights, L3 policies
│   └── governance.py             # Rules, approvals, tokenomics hooks
│
├── io_bus/
│   ├── schema.py                 # Unified task spec
│   ├── message_bus.py            # Pub/sub for tasks + results
│   └── constraints.py            # Latency, cost, privacy rules
│
├── cli/
│   └── dct.py                    # Dynamic CLI (deploy, score, mentor sync)
│
├── tests/
│   ├── test_memory.py
│   ├── test_router.py
│   ├── test_adapters.py
│   └── test_end_to_end.py
│
└── README.md
```

## Core Adapters

| Adapter File           | Backing Model | Primary Role                                                                                                  |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `core1_chatcpt2.py`    | ChatCPT 2     | Deep reconciliation and guarded reasoning that anchors the fusion output when long-form analysis is required. |
| `core2_grok.py`        | Grok          | Rapid situational updates and sentiment framing tuned for low-latency reactions.                              |
| `core3_dolphin.py`     | Dolphin       | Deterministic numerics and lightweight calculations that augment Grok’s fast reads.                           |
| `core4_ollama.py`      | Ollama        | Self-hosted fallback personas for cost control and resilience when premium adapters throttle.                 |
| `core5_kimi_k2.py`     | Kimi K2       | Multilingual reasoning and structured reporting for cross-border narratives.                                  |
| `core6_deepseek_v3.py` | DeepSeek-V3   | Extended-context hypothesis testing and macro research explorations.                                          |
| `core7_deepseek_r1.py` | DeepSeek R1   | Deterministic coding, tool feedback integration, and simulation planning.                                     |
| `core8_qwen3.py`       | Qwen3         | Balanced multilingual summarisation and persona-aware briefings.                                              |
| `core9_minimax_m1.py`  | MiniMax M1    | Ultra-low-latency tactical assessments to stabilise high-frequency routing.                                   |
| `core10_zhipu.py`      | Zhipu AI      | Native Chinese market intelligence and compliance-aware scoring.                                              |
| `core11_hunyuan.py`    | Hunyuan       | Cultural adaptation and nuanced sentiment blending for APAC desks.                                            |

## Memory Stack

DAI promotes reasoning artefacts through four layers of memory:

1. **L0 Context** — Volatile working buffers that hold the in-flight market
   context and persona prompts for the current batch.
2. **L1 Episodic** — Session journals capturing decisions, debates, and
   adjudicator results for replay and auditing.
3. **L2 Semantic** — Embeddings and knowledge graph links derived from confirmed
   trades, research briefs, and risk policies.
4. **L3 Procedural** — Execution policies, routing heuristics, and skills tuned
   through reinforcement from the oracle feedback loop.

The `memory_manager.py` module governs promotions between tiers, ensuring that
only validated artefacts flow upward while stale or noisy data is pruned.

## Orchestration Loop

1. **Planner** decomposes inbound intents into structured tasks that align with
   the available adapters and treasury guardrails.
2. **Router** scores each task against adapter capabilities and lobe health to
   assign the optimal micro-core cohort.
3. **Validator** enforces schema, safety, and compliance checks before results
   propagate back to downstream systems.
4. **Adjudicator** runs cross-core debates when multiple adapters disagree,
   merging the winning rationale into a fused signal for execution.

## Oracle Feedback

The oracle subsystem keeps the mesh aligned with observed market performance:

- `scorer.py` benchmarks live outputs against ground truth and simulated
  baselines.
- `feedback.py` updates routing weights, persona priors, and procedural
  heuristics based on the scorer’s telemetry.
- `governance.py` applies treasury guardrails, approval thresholds, and
  tokenomics hooks before new policies activate.

## IO Bus

Shared schema and messaging infrastructure let DAI interoperate with downstream
automation stacks:

- `schema.py` defines the canonical task and result contracts consumed across
  lobes.
- `message_bus.py` streams requests and completions through a lightweight
  pub/sub bridge.
- `constraints.py` encodes latency, cost, and privacy limits to enforce
  service-level objectives.

## Command-Line Surface

The `cli/dct.py` command exposes developer ergonomics for deploying new
adapters, benchmarking routing heuristics, and synchronising mentor feedback
into the procedural memory layer.

## Testing Strategy

Automated tests validate memory promotions, adapter bindings, routing logic, and
end-to-end persona cycles through the modules in `tests/`. Expanding this suite
alongside new adapters or orchestration features keeps the four fused lobes
predictable under heavy load.
