# Dynamic AGI Inventory

This catalog summarises the modules, classes, and workflows that make up the
`dynamic.intelligence.agi` package. Use it to understand how evaluation,
self-improvement, and fine-tuning artifacts fit together and where
inventory-sensitive hooks live.

## Exported surface

The package entrypoint re-exports the orchestrator model, self-improvement loop,
and fine-tuning utilities so downstream callers can rely on a single import path
for the full AGI toolchain.【F:dynamic.intelligence.agi/**init**.py†L1-L29】

## Core orchestrator (`model.py`)

- **Identity & version metadata** – `DynamicAGIIdentity` preserves the canonical
  expansion and pillar statements, while the module initialises a version engine
  that emits `MODEL_VERSION`, `MODEL_VERSION_INFO`, and the release
  `MODEL_VERSION_PLAN` for downstream
  auditing.【F:dynamic.intelligence.agi/model.py†L33-L73】【F:dynamic.intelligence.agi/model.py†L143-L158】【F:dynamic.intelligence.agi/model.py†L200-L218】
- **Structured outputs** – `AGIOutput` packages the trading signal, research
  payload, enforced risk view, market-making parameters, and optional
  improvement plan into a serialisable record with UTC
  timestamps.【F:dynamic.intelligence.agi/model.py†L161-L197】
- **Diagnostics payload** – `AGIDiagnostics` captures the contextual snapshot
  emitted by `_context_snapshot`, the composite evaluation artifacts, and the
  consensus scores so downstream systems can reason about each decision's
  provenance.【F:dynamic.intelligence.agi/model.py†L128-L142】【F:dynamic.intelligence.agi/model.py†L328-L337】
- **Evaluation pipeline** – `DynamicAGIModel.evaluate` prepares the market
  context, merges research, enforces risk, sizes exposure, and forwards treasury
  plus inventory state into the market-making layer before emitting diagnostics
  and optional self-improvement
  feedback.【F:dynamic.intelligence.agi/model.py†L232-L326】
- **Inventory-aware market making** – The orchestrator passes current inventory
  into `DynamicFusionAlgo.mm_parameters`, where elevated exposure increases the
  gamma setting to rein in quoting
  aggressiveness.【F:dynamic.intelligence.agi/model.py†L309-L325】【F:dynamic.intelligence.ai_apps/core.py†L652-L679】
- **Llama reasoning adapter** – By default the orchestrator provisions an
  `OllamaAdapter` targeting the `llama3.3` model so enhanced reasoning is
  available out of the box, while constructor hooks expose overrides for the
  host, headers, options, keep-alive, timeout, or a fully custom adapter. The
  orchestrator also scales the fusion engine’s reasoning cache to sixty-four
  entries so repeated payloads reuse enhanced narratives unless callers override
  the cache
  size.【F:dynamic.intelligence.agi/model.py†L142-L165】【F:dynamic.intelligence.agi/model.py†L238-L275】【F:dynamic.intelligence.ai_apps/core.py†L165-L180】【F:dynamic.intelligence.ai_apps/core.py†L600-L628】

## Self-improvement loop (`self_improvement.py`)

- **Telemetry primitives** – `ImprovementSignal` normalises directional feedback
  on metrics, while `LearningSnapshot` captures each evaluation’s output,
  performance, qualitative notes, and optional awareness/metacognition
  diagnostics with timezone-aware
  timestamps.【F:dynamic.intelligence.agi/self_improvement.py†L14-L155】
- **Blueprint-driven planning** – `ImprovementPlan` aggregates focus metrics,
  recommended actions, human feedback, introspection summaries, and a roadmap of
  habit blueprints derived from recent
  history.【F:dynamic.intelligence.agi/self_improvement.py†L313-L353】【F:dynamic.intelligence.agi/self_improvement.py†L430-L467】
- **Adaptive record keeper** – `DynamicSelfImprovement` records each session,
  harvests human and introspection inputs, derives improvement signals, and
  synthesises iterative plans, exposing helpers for serialisation and roadmap
  construction.【F:dynamic.intelligence.agi/self_improvement.py†L356-L520】【F:dynamic.intelligence.agi/self_improvement.py†L497-L640】

## Fine-tuning pipeline (`fine_tune.py`)

- **Example and batch wrappers** – `FineTuneExample` and `FineTuneBatch` wrap
  prompt/completion pairs with metadata, tags, and snapshot timing so that
  training corpora remain structured and
  reproducible.【F:dynamic.intelligence.agi/fine_tune.py†L14-L162】
- **Rolling dataset management** – `DynamicFineTuneDataset` enforces capacity
  bounds, tracks character budgets, and maintains tag histograms while
  supporting snapshot/export operations for
  auditability.【F:dynamic.intelligence.agi/fine_tune.py†L164-L231】
- **Telemetry-to-dataset bridge** – `DynamicAGIFineTuner` converts
  `LearningSnapshot` telemetry into prompt/completion examples, optionally
  batches them, and returns dataset summaries with default tag context for
  downstream fine-tuning
  jobs.【F:dynamic.intelligence.agi/fine_tune.py†L233-L285】

## Local machine integration (`local_machine.py`)

- **Task configuration** – `AGILocalMachineTaskConfig` supplies default command
  templates plus category- or action-specific overrides, keeping working
  directory, environment, and resource estimates consistent when converting
  plans into automation
  tasks.【F:dynamic.intelligence.agi/local_machine.py†L52-L117】
- **Plan materialisers** – `build_local_machine_plan_from_improvement` and
  `build_local_machine_plan_from_output` translate improvement plans or AGI
  outputs into `LocalMachinePlan` instances so Dynamic AGI recommendations can
  execute on workstation automation
  pipelines.【F:dynamic.intelligence.agi/local_machine.py†L119-L188】
