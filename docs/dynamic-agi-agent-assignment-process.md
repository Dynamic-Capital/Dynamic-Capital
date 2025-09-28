# Dynamic AGI Agent Assignment Process

Dynamic AGI coordinates a mesh of specialist agents to tackle complex,
multi-stage initiatives. This playbook completes the end-to-end assignment
process by expanding on the lifecycle for analyzing objectives, mapping work,
matching the right contributors, orchestrating execution, and capturing the
lessons learned that keep the system adaptive in real time.

## Lifecycle Overview

Each assignment flows through five persistent stages. The table highlights the
core question asked, the signal Dynamic AGI looks for, and the artifact it
produces before progressing.

| Stage                               | Key Question                                      | Primary Outputs                          |
| ----------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Task Comprehension & Decomposition  | _Do we understand the objective and constraints?_ | Directive brief, dependency-aware plan   |
| Agent Profiling & Capability Match  | _Do we have the right people and tools ready?_    | Candidate roster, capability deltas      |
| Advanced Orchestration Strategies   | _How do we stage and synchronize the work?_       | Orchestration graph, collaboration modes |
| Monitoring, Feedback & Optimization | _How do we keep execution on track?_              | Telemetry configuration, adjustment log  |
| Dynamic Adaptation & Completion     | _How do we adapt and close the loop?_             | Reprioritized plan, knowledge updates    |

Use the detailed sections below as a checklist to "complete the process" from
briefing to closeout without losing institutional knowledge.

## Task Comprehension & Decomposition

Dynamic AGI parses the directive so it understands the mission, the context, and
the constraints that define success.

### Inputs

- Human or machine directive with explicit and implied requirements.
- Organizational policies, SLAs, and domain-specific guardrails.
- Historical runbooks and precedent playbooks retrieved from memory stores.

### Core Decomposition Steps

1. **Prompt analysis.** NLP pipelines isolate the core intent, explicit
   constraints, and contextual cues embedded in the incoming directive.
2. **Context retrieval.** Memory lookups surface historical runs, datasets, or
   prior playbooks, providing battle-tested tactics that can be reused.
3. **Risk surfacing.** Early heuristics expose ambiguity, missing data, or
   compliance considerations that might block downstream execution.
4. **Plan synthesis.** The directive is decomposed into a dependency-aware task
   graph that identifies prerequisites, hand-offs, and expected deliverables.
5. **Action blueprint.** The roadmap mirrors how a project manager would plan a
   program, exposing milestones, success criteria, risk points, and escalation
   paths.
6. **Framework alignment.** Patterns from orchestration frameworks (e.g.,
   AutoAgents) inform how subtasks are grouped, sequenced, and documented so the
   broader ecosystem can reason about them.

### Outputs

- Structured task graph annotated with dependencies and success criteria.
- Decision log capturing accepted assumptions and unresolved questions.
- Draft communication plan outlining stakeholders, cadences, and reporting.

## Agent Profiling & Capability Matching

Dynamic AGI keeps detailed profiles for every agent so it can assign the right
specialists to each task node.

### Inputs

- Skill graph containing proficiencies, certifications, and tooling access.
- Current agent telemetry (velocity, quality trends, utilization).
- Task graph from the previous stage with required competencies per node.

### Matching Activities

- **Skill registries.** Profiles catalog proficiencies, toolchains, interface
  bindings, velocity, quality, and reliability telemetry so planners can make
  evidence-based matches.
- **Dynamic generation.** When no existing profile fits the requirement stack,
  Dynamic AGI can spin up a bespoke agent, equip it with the necessary tools,
  and register it for orchestration.
- **Capability matching.** Subtask requirements are cross-referenced with agent
  skill inventories, capacity, and proximity to relevant data to maximize
  throughput and accuracy.
- **Availability gating.** Real-time status checks prevent over-allocation and
  ensure priority work preempts idling workloads.
- **Tool access validation.** Pre-flight checks confirm that selected agents can
  reach required APIs, datasets, and environments.

### Outputs

- Assignment matrix mapping every task node to a primary agent and fallback.
- Identified capability gaps with mitigation plans (training, new agents).
- Access-control change set to grant or revoke entitlements before kickoff.

## Advanced Orchestration Strategies

With tasks mapped and the talent pool understood, Dynamic AGI chooses the
coordination patterns that keep execution efficient and resilient.

### Inputs

- Assignment matrix and dependency graph from prior stages.
- Collaboration patterns (pairing, review gates, escalation paths).
- Infrastructure constraints (compute limits, API quotas, cost budgets).

### Coordination Patterns

- **Hierarchical coordination.** A lead Dynamic AGI agent oversees the
  initiative, delegating work to specialists and integrating their outputs.
- **Collaborative refinement.** Multiple specialists can swarm on complex
  subtasks, sharing intermediate artifacts to converge on higher-quality
  outcomes.
- **Parallel execution.** Independent branches of the task graph run
  concurrently, reducing turnaround while preserving ordering for dependent
  nodes.
- **Event-driven triggers.** Webhooks, message queues, or state change events
  kick off downstream work automatically once prerequisites clear.
- **Escalation ladder.** Threshold-based alerts route blockers to supervisory
  agents or human operators when automation alone cannot resolve them.

### Outputs

- Execution playbook enumerating start conditions, exit criteria, and reviewers
  per task node.
- Resource calendar that sequences compute workloads alongside human approvals.
- Collaboration canvas (shared workspace, repositories, communication channels).

## Monitoring, Feedback & Optimization

Execution telemetry keeps the orchestration loop closed so plans can adapt in
real time and the system keeps learning.

### Monitoring Framework

1. **Observer coverage.** Dedicated observer agents capture timestamps,
   intermediate states, and outcome scores to make progress and blockers
   visible.
2. **Signal catalog.** Metrics span throughput, quality, cost, sentiment, and
   operational risk so deviations surface early.
3. **Real-time feedback.** Deviations between expected and actual performance
   trigger plan adjustments, skill updates, or agent swaps before issues
   compound.
4. **Experimentation hooks.** A/B toggles, shadow deployments, or canary runs
   provide controlled environments for testing alternative strategies.
5. **Reinforcement learning.** Wins and misses are fed into policy updates that
   refine future agent selection, scheduling heuristics, and collaboration
   templates.

### Outputs

- Telemetry dashboards with alert thresholds mapped to escalation actions.
- Feedback ledger documenting adjustments, rationale, and observed impact.
- Updated policy weights or heuristics propagated to orchestration services.

## Ecosystem & Project Update Synchronization

Dynamic AGI taps into Dynamic Capital's broader ecosystem updates so assignments
reinforce platform-wide evolution and documentation stays current.

### Ecosystem-Aware Inputs

- Layer definitions from the
  [ecosystem anatomy](./dynamic-capital-ecosystem-anatomy.md) (Brain, Hands,
  Heart, Voice, Memory) to map assignments to the correct automation surfaces.
- Acronym registry updates that preserve consistent naming across agent families
  and knowledge capsules, sourced from the
  [Dynamic Ecosystem Acronym Glossary](./dynamic-ecosystem-acronym-glossary.md).
- Release and roadmap deltas surfaced by the
  [project updater automation](./project-updater.md) so work queues reflect the
  latest deploy notes and board state.

### Optimization Practices

- **Layer alignment.** Map each task node to the ecosystem layer it empowers so
  telemetry and governance hooks land in the right services.
- **Taxonomy refresh.** Cross-check agent and artifact names against the acronym
  glossary during planning to avoid drift and ensure newly generated specialists
  follow canonical naming.
- **Update orchestration.** Feed assignment milestones into the project updater
  workflow to automate release notes, changelog entries, and board syncs,
  preventing manual toil and stale documentation.
- **Feedback routing.** Ensure observer agents stream insights back to the
  ecosystem knowledge layers (Memory, Voice) so other teams inherit the
  adjustments without duplicating discovery work.

## Dynamic Adaptation & Completion

Dynamic AGI continuously re-optimizes assignments as conditions evolve and
drives the work through to completion with explicit knowledge capture.

### Adaptation Levers

- **Responsive reprioritization.** Deadline shifts, urgent requests, or new risk
  signals reshuffle the task graph, promoting critical work and rebalancing
  capacity.
- **Resilience to disruptions.** If an agent is unavailable or underperforms,
  Dynamic AGI reroutes pending tasks to alternates while preserving audit
  trails.
- **Scenario simulations.** "What-if" sandboxes test alternate staffing,
  sequencing, or toolchains before applying changes to live work.

### Completion Routines

- **Acceptance validation.** Automated or human-in-the-loop reviews confirm that
  deliverables meet the original directive's success metrics.
- **Knowledge reconsolidation.** Artifacts, telemetry, and decision logs feed
  back into shared memory so future runs inherit the learnings.
- **Capability updates.** Agent profiles, skill graphs, and orchestration
  policies incorporate performance insights and training needs.
- **Stakeholder communication.** Summaries, demos, and scorecards close the
  feedback loop with requesters and dependent teams.

### Outputs

- Finalized deliverables with sign-off records and traceable lineage.
- Updated readiness checklist baselines and task runner templates.
- Postmortem or retrospective report with action items and owners.

## Governance Roles & Routines

| Role               | Responsibilities                                                    |
| ------------------ | ------------------------------------------------------------------- |
| Lead Orchestrator  | Owns dependency graph, approves scope changes, curates escalations. |
| Observer Network   | Operates telemetry stack, records adjustments, validates metrics.   |
| Capability Manager | Maintains skill graphs, provisions tools, onboards new agents.      |
| Knowledge Curator  | Archives artifacts, updates playbooks, publishes retrospectives.    |

Daily stand-ups, mid-mission syncs, and completion reviews should explicitly
confirm that every role has fulfilled its responsibilities before the work moves
forward.

## Assignment Readiness Checklist

- [ ] Confirm the directive is parsed with goals, constraints, stakeholders, and
      success metrics captured in the task graph.
- [ ] Gather contextual memories, datasets, and prior playbooks relevant to the
      problem space so the plan benefits from precedent.
- [ ] Validate that each task node has an assigned agent whose skills, tools,
      and available capacity align with the expected deliverable.
- [ ] Confirm orchestration settings detail collaboration needs, dependencies,
      escalation paths, reviewer checkpoints, and escalation ladders.
- [ ] Enable execution telemetry and alerting so observer agents can surface
      blockers or deviations in real time.
- [ ] Verify fallback agents, reroute rules, and scenario plans are documented
      for high-risk tasks before execution begins.
- [ ] Sync assignment scope with the latest project updater release and roadmap
      notes so dependent teams and boards stay current after delivery.
- [ ] Map agents, artifacts, and deliverables to ecosystem layers and glossary
      terms to preserve naming consistency and telemetry routing.
- [ ] Schedule post-delivery review to update policies, agent profiles, and this
      checklist with newly captured best practices.

## Operational Task Runner

1. Re-run **directive parsing** whenever the objective changes, ensuring the
   task graph reflects the latest scope.
2. Trigger **profile refresh** jobs so skill registries and availability data
   stay accurate before orchestration begins.
3. Execute **orchestration dry-runs** on critical branches to validate
   dependencies, collaboration patterns, and telemetry coverage.
4. Initiate **live monitoring** dashboards as the work starts, routing alerts to
   the lead agent and observer network.
5. Perform **adaptive replanning** cycles when telemetry flags deviations or new
   priorities, documenting the adjustments and rationale.
6. Trigger **project updater automations** so release notes, changelog entries,
   and roadmap signals reflect the assignment's outcomes without manual edits.
7. Conduct a **retrospective sync** after delivery to log insights, update
   reinforcement learning rewards, and capture checklist improvements.
8. Publish a **knowledge capsule** (summary, artifacts, metrics) aligned to
   ecosystem layers so subsequent missions inherit the refined playbook.

## End-to-End Execution Flow

1. **Initiate.** Receive directive, launch comprehension pipelines, and confirm
   scope.
2. **Design.** Build the task graph, assess risks, and codify success criteria.
3. **Staff.** Match agents, provision access, and queue onboarding or training
   as needed.
4. **Run.** Execute orchestration plan with live telemetry, feedback loops, and
   escalation support.
5. **Adapt.** Replan continuously as signals change, ensuring commitments stay
   on track.
6. **Complete.** Validate deliverables, capture lessons, and propagate updates
   to agent profiles, policies, and the shared knowledge base.
