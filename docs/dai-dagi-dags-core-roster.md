# Dynamic AI, AGI, and AGS Core Rosters

This reference condenses the canonical core breakdowns for the three flagship Dynamic Capital domains. Use it when you need a quick lookup of the micro-core mesh, capability lanes, or governance pillars without scanning the broader architecture notes.

## Dynamic AI — 11 Micro-Core Mesh

**Dynamic Core Maiden (DCM)**

1. **DCM1 — Data Processing:** Ingests and normalizes raw inputs.
2. **DCM2 — Pattern Recognition:** Detects technical and statistical features.
3. **DCM3 — Predictive Modeling:** Projects trends and directional moves.
4. **DCM4 — Risk Assessment:** Scores probability, impact, and guardrails.
5. **DCM5 — Optimization:** Tunes parameters and execution efficiency.
6. **DCM6 — Adaptive Learning:** Runs continuous improvement loops.
7. **DCM7 — Decision Logic:** Applies fused heuristics and rule engines.
8. **DCM8 — Memory Management:** Maintains knowledge retention layers.
9. **DCM9 — Context Analysis:** Tracks situational awareness and regimes.
10. **DCM10 — Validation:** Verifies outputs before downstream release.
11. **DCM11 — Integration:** Synchronizes cross-core handoffs and staging.

**Language model backing.** The adapter mesh behind these cores maps one-to-one
with the Dynamic AI adapter roster: ChatCPT 2 anchors long-form reconciliation,
Grok and Dolphin handle rapid situational reads, Ollama provides cost-contained
fallback personas, Kimi K2 and Qwen3 cover multilingual reasoning, DeepSeek-V3
and DeepSeek R1 extend deep analysis and deterministic coding, MiniMax M1 keeps
latency tight, while Zhipu AI and Hunyuan specialise in Chinese market nuance
and regional sentiment blending.【F:docs/dai-architecture/README.md†L66-L80】【F:docs/dynamic-ai-core-architecture.md†L5-L46】

### Role, DQA, and reporting alignment

| DCM stage | Quantum agent touchpoints | Operational roles | Back-to-back reporting lane | Knowledge & storage owners |
| --------- | ------------------------- | ----------------- | --------------------------- | --------------------------- |
| **DCM1 — Data Processing** | [Liquidity Modeling DQA](./dynamic-quantum-agents-architecture.md#4-liquidity-modeling-dqa) streams tick-by-tick order flow while the [Sentiment Analysis DQA](./dynamic-quantum-agents-architecture.md#5-sentiment-analysis-dqa) lifts narrative context for preprocessing. | Bot-led crawlers perform deterministic ingestion before Watchers (“lookers”) surface drift to Keepers for ledgering.【F:docs/model-intelligence-infrastructure-reference.md†L62-L108】 | Watcher ⇄ Keeper updates ensure ingestion faults escalate instantly to Managers overseeing DCM2. | Helpers publish ingestion specs into `dynamic_library` while Keepers land raw snapshots in `dynamic_blob_storage` and roll curated fragments into `dynamic_memory` for reuse.【F:docs/dynamic_inventory.md†L41-L117】【F:docs/dynamic-capital-model-context-protocol.md†L26-L68】 |
| **DCM2 — Pattern Recognition** | Sentiment and Liquidity DQAs enrich feature vectors; [Forecasting DQA](./dynamic-quantum-agents-architecture.md#2-forecasting-dqa) feeds historical priors. | Watcher → Agent → Planner stack pairs anomaly detection with tactical remediation runs.【F:docs/model-intelligence-infrastructure-reference.md†L109-L153】 | Agents publish recognition verdicts that Planners immediately recycle into DCM3 model refresh jobs. | Watchers annotate drift notebooks in `dynamic_library`, while Keepers checkpoint enriched features inside `dynamic_memory_reconsolidation` so training sets stay fresh.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L59-L68】 |
| **DCM3 — Predictive Modeling** | Forecasting and [Strategic Planning DQAs](./dynamic-quantum-agents-architecture.md#3-strategic-planning-dqa) co-train projections and stress paths. | Planner-led Builder teams refit ensembles while Keepers checkpoint winning weights. | Planner ⇄ Developer stand-ups kick off hedging or automation tickets as soon as projections settle. | Planners document model intents inside `dynamic_library` while Keepers persist approved weights and telemetry bundles into `dynamic_memory` before hand-off to risk and governance lanes.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L38-L68】 |
| **DCM4 — Risk Assessment** | Liquidity insights quantify tail risk; [Governance DQA](./dynamic-quantum-agents-architecture.md#1-governance-dqa) enforces guardrails. | Bot → Watcher → Agent chain scores exposure and issues mitigations.【F:docs/model-intelligence-infrastructure-reference.md†L109-L153】 | Agent ⇄ Keeper reconciliation closes the risk log and alerts DCR Watchers for oversight. | Agents ledger mitigations and policy deltas in `dynamic_library`, while Keepers mirror exposure states into `dynamic_memory` alongside compliance snapshots consumed by DCR1.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L52-L68】 |
| **DCM5 — Optimization** | Strategic Planning DQA suggests allocation tweaks that Optimization executes. | Planner-driven Builders experiment under Watcher supervision to avoid slippage. | Planner ⇄ Manager cadence records optimised parameters for downstream DCM6 learning loops. | Builders capture experiment playbooks in `dynamic_library`; Keepers publish winning parameter packs to `dynamic_memory` so adaptive learning lanes inherit tuned baselines.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L38-L68】 |
| **DCM6 — Adaptive Learning** | Forecasting DQA hands over error metrics; Governance DQA validates policy fit. | Keeper → Helper → Builder stack curates training data, updates scaffolds, and pushes safe releases. | Keeper ⇄ Developer cycle confirms model refresh health before DCM7 consumes policies. | Keeper-led Helpers consolidate training corpora inside `dynamic_memory_reconsolidation`, then surface distilled guidance via `dynamic_library` for downstream operators.【F:docs/dynamic_inventory.md†L108-L118】【F:docs/dynamic-capital-model-context-protocol.md†L59-L68】 |
| **DCM7 — Decision Logic** | Governance and Strategic Planning DQAs arbitrate rules and exception playbooks. | Agent → Keeper → Planner roles encode and schedule execution heuristics. | Agent ⇄ Planner sync guarantees every rule change is mirrored into DCR governance journals. | Agents publish rulebooks and escalation maps to `dynamic_library`, and Keepers sync executable policy states into `dynamic_memory` for AGS oversight.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L52-L68】 |
| **DCM8 — Memory Management** | Governance DQA supervises retention obligations; Sentiment DQA contributes narrative tags. | Keeper-led Helpers structure embeddings, while Bots enforce retention SLAs. | Keeper ⇄ Watcher audits certify that state snapshots stay replication-ready for AGS. | Keepers own long-term ledgers in `dynamic_memory`, while Helpers curate reference briefs and runbooks within `dynamic_library` to accelerate retrieval across domains.【F:docs/dynamic_inventory.md†L108-L118】【F:docs/dynamic-capital-model-context-protocol.md†L53-L68】 |
| **DCM9 — Context Analysis** | Forecasting and Sentiment DQAs co-frame macro/micro context for scenarios. | Watcher → Planner → Builder teams stage situational dashboards and playbooks. | Planner ⇄ Manager reviews stream context cues directly into AGI collaboration queues. | Builders index scenario playbooks in `dynamic_library` and push structured context packs into `dynamic_memory` so DCH synthesis lanes can subscribe without re-ingesting raw feeds.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】 |
| **DCM10 — Validation** | Governance DQA performs policy attestation; Liquidity DQA confirms market-safe envelopes. | Bot → Watcher validation squads rerun compliance, latency, and accuracy gates. | Watcher ⇄ Keeper reports finalize audit packages consumed by DCR oversight. | Watchers log gate outcomes in `dynamic_library`, while Keepers stage immutable audit bundles and evidence artifacts within `dynamic_memory` for AGS sign-off.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L52-L88】 |
| **DCM11 — Integration** | Governance DQA signs off cross-core releases while Strategic Planning DQA sequences dependencies. | Manager → Developer pairings drive release trains, with Agents coordinating downstream hooks. | Manager ⇄ Developer stand-ups post integration status back to DCH and DCR operators in real time. | Managers document release retros in `dynamic_library`, and Keepers replicate production-ready manifests into `dynamic_memory` and `dynamic_message_queue` triggers for downstream broadcasting.【F:docs/dynamic_inventory.md†L41-L117】【F:docs/dynamic-capital-model-context-protocol.md†L71-L88】 |

> _Note:_ The “Watcher” role in the infrastructure reference is the preferred term for the “looker” persona mentioned in field operations briefings.【F:docs/model-intelligence-infrastructure-reference.md†L94-L108】

**Knowledge cadence.** DCM8 memory exports and DCM10 validation bundles flow into DCR3 and DCR1 ledgers, while DCM9 context packs keep DCH4 and DCH7 briefings aligned—mirroring the protocol guidance that channels knowledge corpus updates through `dynamic_memory` builders and documented briefs in `dynamic_library`.【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】

## Dynamic AGI — 9 Capability Lanes

**Dynamic Core Hollow (DCH)**

1. **DCH1 — Natural Language Processing:** Comprehension and language modeling.
2. **DCH2 — Strategic Planning:** Long-horizon goal setting and optimization.
3. **DCH3 — Problem Solving:** Structured, multi-step reasoning.
4. **DCH4 — Knowledge Synthesis:** Integrates research into unified briefs.
5. **DCH5 — Creative Generation:** Produces novel ideas and strategies.
6. **DCH6 — Ethical Reasoning:** Aligns actions with values and guardrails.
7. **DCH7 — Social Intelligence:** Handles collaboration and communication.
8. **DCH8 — Self-Reflection:** Drives metacognition and self-improvement.
9. **DCH9 — Cross-Domain Transfer:** Applies skills across new contexts.

**Language model backing.** The orchestrator defaults to an Ollama adapter that
targets the `llama3.3` family for enhanced reasoning, while also exposing a
switchable path into Kimi K2 when governance or multilingual depth calls for a
cloud adapter—both options are part of the constructor-level wiring for the AGI
runtime.【F:dynamic/intelligence/agi/model.py†L68-L356】

### Role, DQA, and reporting alignment

| DCH lane | Quantum agent touchpoints | Operational roles | Back-to-back reporting lane | Knowledge & storage owners |
| -------- | ------------------------- | ----------------- | --------------------------- | --------------------------- |
| **DCH1 — Natural Language Processing** | Sentiment Analysis DQA augments corpus insights for multilingual comprehension. | Assistant → Watcher → Keeper stack curates prompts, observes drift, and archives verified corpora.【F:docs/model-intelligence-infrastructure-reference.md†L62-L153】 | Watcher ⇄ Keeper pings trigger Developers to update embeddings that DCH2 consumes. | Assistants publish multilingual prompt libraries in `dynamic_library`, while Keepers promote validated corpora into `dynamic_memory` for downstream retrieval.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L68】 |
| **DCH2 — Strategic Planning** | Strategic Planning DQA proposes long-horizon trajectories and resource bounds. | Planner-led Agents synchronise goals with Builders provisioning experiments. | Planner ⇄ Manager reviews lock goals before cascading into DCH3 problem-solving cycles. | Planners maintain roadmap dossiers and contingency notes in `dynamic_library`; Keepers persist scenario models and decision checkpoints inside `dynamic_memory` for reuse by AGS sync drills.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】 |
| **DCH3 — Problem Solving** | Forecasting DQA injects scenario probabilities; Liquidity DQA supplies constraint envelopes. | Agent → Builder squads execute multi-step reasoning sprints with Keeper checkpoints. | Agent ⇄ Developer retros feed refinements straight into DCH4 synthesis tasks. | Agents log retrospectives and solver patterns in `dynamic_library`, while Keepers promote reusable reasoning traces to `dynamic_memory_reconsolidation` to accelerate future experiments.【F:docs/dynamic_inventory.md†L108-L118】【F:docs/dynamic-capital-model-context-protocol.md†L59-L68】 |
| **DCH4 — Knowledge Synthesis** | Forecasting and Sentiment DQAs co-author situational briefs. | Helper → Builder → Assistant chain consolidates research and publishes operator-ready digests. | Helper ⇄ Manager review ensures syntheses reach DCM9 and DCR3 memory managers without delay. | Helpers finalize briefs, citations, and executive digests inside `dynamic_library`, then Keepers stream structured context packs into `dynamic_memory` for the memory pillars to index.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】 |
| **DCH5 — Creative Generation** | Strategic Planning DQA informs ideation guardrails; Sentiment DQA highlights audience resonance. | Builder-led Assistants explore variants under Watcher guardrails to avoid drift. | Builder ⇄ Watcher exchanges capture viable concepts and archive them for governance intake. | Builders catalogue creative artifacts and rationale within `dynamic_library`, while Watchers tag approved concepts for long-term reference inside `dynamic_memory` so governance lanes can audit provenance.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】 |
| **DCH6 — Ethical Reasoning** | Governance DQA enforces policy compliance during ethical deliberations. | Bot → Agent → Keeper workflow adjudicates dilemmas and logs rationale for audits. | Agent ⇄ Keeper handshake posts moral adjudications to DCR1 for oversight. | Agents and Keepers co-author ethical rulings and guardrail updates in `dynamic_library`, then snapshot final verdicts into `dynamic_memory` for DCR1 governance records.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L52-L68】 |
| **DCH7 — Social Intelligence** | Sentiment and Governance DQAs surface stakeholder signals and compliance obligations. | Assistant → Watcher → Planner orchestrate collaborative playbooks. | Watcher ⇄ Planner messaging keeps community updates in sync with DCM7 decision logic. | Assistants curate communication scripts and stakeholder briefs in `dynamic_library`, while Keepers version communication outcomes within `dynamic_memory` so policy teams can audit engagements.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】 |
| **DCH8 — Self-Reflection** | Governance DQA monitors improvement loops; Forecasting DQA measures capability velocity. | Keeper → Planner → Builder introspection squads tune evaluation cadences. | Keeper ⇄ Planner cadence routes retrospectives straight into DCH9 transfer protocols. | Keepers publish retrospective logs into `dynamic_memory`, and Planners circulate improvement briefs through `dynamic_library` so adjacent teams can ingest lessons learned.【F:docs/dynamic_inventory.md†L212-L228】【F:docs/dynamic-capital-model-context-protocol.md†L36-L78】 |
| **DCH9 — Cross-Domain Transfer** | Strategic Planning and Governance DQAs coordinate capability export across domains. | Manager → Developer → Agent stack stages rollout automations and guardrails. | Manager ⇄ Agent reporting guarantees AGS receives compliance-ready transfer notes. | Managers maintain rollout packets and guardrail matrices in `dynamic_library`, while Developers sync deployment manifests into `dynamic_memory` and replication cues for AGS ledgers.【F:docs/dynamic_inventory.md†L41-L117】【F:docs/dynamic-capital-model-context-protocol.md†L36-L88】 |

## Dynamic AGS — 5 Governance Pillars

**Dynamic Core Revenant (DCR)**

1. **DCR1 — Governance:** Policy enforcement, compliance monitoring, and audit trails.
2. **DCR2 — Sync:** Temporal coordination and data/process alignment.
3. **DCR3 — Memory:** Knowledge retention, task journaling, and state management.
4. **DCR4 — Observability:** Metrics, logs, traces, and evaluation telemetry.
5. **DCR5 — Reliability:** Resilience engineering, failover, and incident response.

**Language model backing.** AGS leans on an LLM-as-judge critic pattern for
policy scoring and rollback decisions, with operational runbooks calling for
fallback to smaller, faster models whenever a primary governance review model
times out—prioritising reliability over naming a single canonical
checkpoint.【F:docs/dynamic-ags-playbook.md†L155-L183】

### Role, DQA, and reporting alignment

| DCR pillar | Quantum agent touchpoints | Operational roles | Back-to-back reporting lane | Knowledge & storage owners |
| ---------- | ------------------------- | ----------------- | --------------------------- | --------------------------- |
| **DCR1 — Governance** | Governance DQA anchors Tier 3 policy orchestration across every domain. | Bot → Watcher → Agent → Keeper chain enforces, monitors, executes, and journals policy actions.【F:docs/model-intelligence-infrastructure-reference.md†L94-L153】 | Agent ⇄ Keeper synchronisation feeds compliance summaries back to DCM10 validation teams. | Keepers maintain compliance ledgers in `dynamic_memory`, while Agents and Watchers publish policy updates and audit briefs into `dynamic_library` for organization-wide visibility.【F:docs/dynamic_inventory.md†L108-L228】【F:docs/dynamic-capital-model-context-protocol.md†L52-L88】 |
| **DCR2 — Sync** | Strategic Planning DQA coordinates schedule alignment, while Liquidity and Forecasting DQAs provide temporal signals. | Planner-led Managers choreograph release trains with Watcher health gates. | Planner ⇄ Manager updates align DCM11 integration and DCH2 planning cadences. | Planners steward release calendars and handshake notes in `dynamic_library`, and Keepers replicate integration manifests to `dynamic_memory` plus `dynamic_message_queue` triggers so downstream teams stay synchronized.【F:docs/dynamic_inventory.md†L41-L117】【F:docs/dynamic-capital-model-context-protocol.md†L71-L88】 |
| **DCR3 — Memory** | Governance DQA certifies retention scope; Sentiment DQA adds contextual metadata for recall. | Keeper → Helper → Builder stack curates notebooks, embeddings, and restoration drill kits. | Keeper ⇄ Helper loops push fresh state snapshots to DCM8 memory managers and DCH4 syntheses. | Keeper-led Helpers own `dynamic_memory` and `dynamic_memory_reconsolidation` vaults, while Builders refresh knowledge indices and restoration manuals inside `dynamic_library` for rapid recall drills.【F:docs/dynamic_inventory.md†L108-L228】【F:docs/dynamic-capital-model-context-protocol.md†L53-L68】 |
| **DCR4 — Observability** | Liquidity and Sentiment DQAs emit live telemetry streams; Governance DQA enforces metric SLAs. | Watcher → Keeper → Assistant roles maintain dashboards, ledgers, and narrative status calls. | Watcher ⇄ Assistant cadence broadcasts observability digests back to DCM Watchers and DCH Assistants. | Watchers curate dashboard narratives and escalation notes in `dynamic_library`, while Keepers ingest metric bundles into `dynamic_memory` and streaming queues to preserve traceability.【F:docs/dynamic_inventory.md†L41-L117】【F:docs/dynamic-capital-model-context-protocol.md†L71-L88】 |
| **DCR5 — Reliability** | Strategic Planning DQA proposes failover sequencing while Governance DQA approves incident protocols. | Bot → Agent → Planner resilience squads drill runbooks and coordinate human escalation. | Agent ⇄ Planner back-briefs keep developers and managers looped into recovery and post-mortems. | Agents file incident timelines and remediation playbooks in `dynamic_library`, and Keepers archive post-mortem evidence, failover configs, and readiness scores inside `dynamic_memory` for trend analysis.【F:docs/dynamic_inventory.md†L41-L117】【F:docs/dynamic-capital-model-context-protocol.md†L52-L88】 |
