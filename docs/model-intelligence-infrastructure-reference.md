# Model Intelligence & Infrastructure Reference

This briefing captures the latest cross-provider intelligence benchmarks and the
role-based infrastructure pattern used by Dynamic Capital to orchestrate multi-
agent systems. Use it when selecting a model for a trading, research, or
automation workflow and when mapping responsibilities across layered agents.

## Intelligence Index (General Reasoning)

| Model            | Intelligence Score | Highlights                                              |
| ---------------- | ------------------ | ------------------------------------------------------- |
| Grok-4           | 92.1               | Best in math (AIME 93.3%), science QA, agentic tasks    |
| GPT-4o (ChatGPT) | 89.4               | Strong in alignment, tool use, and multimodal reasoning |
| Kimi K2          | 88.0               | Excellent in structured reasoning and tool calling      |
| MiniMax M1       | 86.3               | Fast inference, large context, good reasoning balance   |
| DeepSeek R1      | 85.6               | Distilled 8B model rivaling 235B performance            |
| Qwen3 8B         | 84.2               | Multilingual, instruction-tuned, solid reasoning        |
| Zhipu GLM-4.5    | 83.5               | Vision-language leader, strong bilingual QA             |
| Hunyuan A13B     | 82.7               | Best in Chinese instruction tasks, agentic reasoning    |

## Coding Benchmarks (LiveCodeBench, SciCode, SWE-bench)

| Model          | Coding Score | Notes                                              |
| -------------- | ------------ | -------------------------------------------------- |
| Grok-4         | 91.3         | Excels in step-by-step logic and recursion         |
| Kimi K2        | 89.1         | Great at structured code generation and debugging  |
| MiniMax M1     | 87.4         | Fast and accurate, good for API-based workflows    |
| DeepSeek R1    | 86.2         | Efficient for local coding tasks, low VRAM use     |
| Qwen3-Coder    | 85.9         | Strong in recursion, OOP, and multilingual code    |
| Zhipu GLM-4.5  | 84.6         | Good at teaching and explaining code concepts      |
| Hunyuan-TurboS | 83.8         | Balanced performance, excels in Chinese code tasks |

## Math & Reasoning Benchmarks

| Model         | Math Score | Reasoning Score |
| ------------- | ---------- | --------------- |
| Grok-4        | 93.3       | 91.2            |
| DeepSeek R1   | 96.0       | 88.4            |
| MiniMax M1    | 83.3       | 87.1            |
| Kimi K2       | 89.2       | 88.7            |
| GPT-4o        | 79.0       | 89.4            |
| Qwen3         | 84.5       | 86.2            |
| Zhipu GLM-4.5 | 82.1       | 85.3            |
| Hunyuan A13B  | 81.7       | 86.9            |

## Speed & Latency Profiles

| Model         | Output Speed (tokens/sec) | Time to First Token (TTFT) |
| ------------- | ------------------------- | -------------------------- |
| MiniMax M1    | 312                       | 0.42s                      |
| DeepSeek R1   | 278                       | 0.48s                      |
| Kimi K2       | 54.4                      | 0.56s                      |
| GPT-4o        | 80–100                    | 0.6s                       |
| Grok-4        | 72                        | 0.7s                       |
| Zhipu GLM-4.5 | 65                        | 0.5s                       |
| Hunyuan A13B  | 60                        | 0.6s                       |

## Context Window Capacity

| Model         | Context Length |
| ------------- | -------------- |
| MiniMax M1    | 1M tokens      |
| Kimi K2       | 262K tokens    |
| DeepSeek R1   | 64K tokens     |
| GPT-4o        | 128K tokens    |
| Grok-4        | 128K tokens    |
| Zhipu GLM-4.5 | 64K tokens     |
| Hunyuan A13B  | 32K tokens     |

## Cost Per Million Tokens

| Model       | Input | Output |
| ----------- | ----- | ------ |
| DeepSeek R1 | $0.01 | $0.02  |
| Dolphin 3.0 | $0.01 | $0.03  |
| MiniMax M1  | $0.30 | $1.65  |
| Kimi K2     | $0.38 | $1.52  |
| GPT-4o      | $5.00 | $10.00 |
| Grok-4      | $4.00 | $8.00  |

## Recommended Models by Scenario

| Use Case                      | Recommended Model                          |
| ----------------------------- | ------------------------------------------ |
| Trading Analysis & Coding     | DeepSeek R1, Kimi K2, MiniMax M1           |
| Multilingual Content Creation | Qwen3, Zhipu GLM-4.5                       |
| Real-Time Commentary          | Grok-4                                     |
| Tool Use & Agentic Tasks      | GPT-4o, Kimi K2, Hunyuan                   |
| Local Deployment              | Dolphin, DeepSeek R1, Ollama-hosted models |

## Modular AI Infrastructure with Role-Based Agents

Dynamic Capital deploys modular capabilities by pairing each system module with
specialised agent roles. The refactored framework below clarifies how to combine
roles, what success signals to monitor, and how to operationalise the pattern
across the stack.

### Design Principles

1. **Compose roles, don’t hard-code bots.** Assemble role stacks that can be
   remixed per workflow rather than binding a single model to a static job.
2. **Instrument everything.** Every module should expose health signals that a
   Keeper or Watcher can observe and escalate.
3. **Plan for escalation.** Assign clear Planner and Agent responsibilities so
   actions, fallbacks, and human-in-the-loop paths are explicit.

### Core Role Palette

| Role      | Primary Focus                                   | Common Outputs                           |
| --------- | ----------------------------------------------- | ---------------------------------------- |
| Bot       | Deterministic automation and enforcement        | CRUD jobs, alerts, policy checks         |
| Helper    | Structural support and knowledge scaffolding    | Schemas, interface specs, migrations     |
| Assistant | Conversational enablement and knowledge sharing | FAQs, playbooks, contextual responses    |
| Agent     | Autonomous execution with policy awareness      | Workflows, runbooks, remediation steps   |
| Keeper    | State stewardship and auditability              | Logs, ledgers, configuration baselines   |
| Watcher   | Monitoring and anomaly detection                | Drift reports, dashboards, signal alerts |
| Planner   | Forward planning and coordination               | Roadmaps, schedules, scenario models     |
| Builder   | Net-new system or workflow generation           | Scaffolds, integrations, prototype kits  |

### Module Blueprints

| Module Domain               | Role Stack                                          | Primary Outcomes                                      |
| --------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| Technology & Infrastructure | Bot → Helper → Keeper → Watcher → Planner → Builder | Automated ops, schema evolution, deep observability   |
| AI, Agents & Cognition      | Agent → Keeper → Planner → Builder                  | Adaptive policies, curated memory, evolving loops     |
| Business & Operations       | Planner → Agent → Keeper → Builder                  | Coordinated cadences, governed approvals, new plays   |
| Finance & Markets           | Watcher → Agent → Planner → Keeper                  | Market surveillance, decisive execution, auditability |
| Human & Creative            | Assistant → Planner → Builder                       | Coaching experiences, tailored curricula, assets      |
| Security & Governance       | Bot → Watcher → Agent → Keeper                      | Policy enforcement, rapid remediation, compliance     |

### Operational Playbook

1. **Map the module.** Identify the module domain and select the recommended
   role stack from the blueprint table.
2. **Assign ownership.** Tie each role to a specific model capability or human
   operator so accountability and escalation paths are explicit.
3. **Instrument feedback.** Define metrics and observability hooks so Watchers
   and Keepers surface drift before it threatens SLAs.
4. **Iterate safely.** Use Builders to propose improvements and Planners to
   schedule deployments, always gating major changes through Agents for final
   execution.

By aligning benchmark insights with this modular agent framework, teams can
rapidly match intelligence assets to the correct execution surface while
preserving observability, governance, and cost efficiency.

## Reference Implementation

The `dynamic_ai.infrastructure` module materialises this playbook in code. It
defines the shared role palette, per-domain blueprints, and a
`DynamicInfrastructure` registry that can register modules, assign role owners,
and emit operational playbooks. Use `build_default_infrastructure()` when you
need a ready-to-run baseline covering core modules such as `dynamic_supabase`,
`dynamic_memory`, `dynamic_task_manager`, and `dynamic_validator`.
