# Dynamic Engines – Recommended Usage Patterns

This guide summarises how to compose the orchestration engines that power
Dynamic Capital, focusing on linking modules, coordinating zones/levels, and
matching agents to tasks. The goal is to give teams a repeatable, optimised flow
instead of isolated tips.

## Quick-start workflow blueprint

1. **Plan the topology.** Inventory which engines you need (state, space,
   assignments, custom domains) and confirm they are exported via the shim.
2. **Prime personas.** Configure the Dynamic AI persona chain so
   research/execution/risk agents reflect the environment you are about to
   orchestrate.
3. **Model the environment.** Register zones and sectors, backfill historical
   telemetry, and verify intervention thresholds before production routing.
4. **Route work.** Feed persona outputs and sector alerts into the assignment
   engine, then persist approved `AssignmentDecision`s alongside zone/sector
   snapshots for auditability.
5. **Review metrics.** Track utilisation, intervention frequency, and decision
   acceptance to inform the next optimisation cycle.

Use the audit checklist below as a control loop after each iteration.

## Audit checklist & task planner

Use this checklist when auditing an environment or planning improvements. Each
subsection maps to the detailed guidance later in the document.

- [ ] **Shim coverage** – inventory which orchestration engines are needed,
      confirm they are exported via `dynamic.platform.engines`, and document any
      new modules that must be registered in `_ENGINE_EXPORTS`.
- [ ] **Persona chain fit** – review the existing research → execution → risk
      flow, note where persona overrides are required, and schedule updates
      through `configure_dynamic_start_agents`.
- [ ] **Zone hygiene** – catalogue current zones/levels, check that boundaries
      and capacities are accurate, and log follow-up tasks for missing
      `ZoneEvent` instrumentation.
- [ ] **Sector resilience** – examine `DynamicSpaceEngine` sector snapshots,
      flag sectors exceeding the intervention threshold, and create remediation
      tasks for route balancing or data quality issues.
- [ ] **Assignment quality** – audit `DynamicAssignEngine` scoring inputs
      (skills, availability, confidence), list data refresh actions, and capture
      decisions that should be persisted or escalated.

Document the owner, deadline, and status for each item so audits feed directly
into the team backlog.

## 1. Import engines through the `dynamic.platform.engines` shim

The legacy-compatible `dynamic.platform.engines` module forwards attributes to
the domain packages on demand, so you can keep call sites stable while
implementations live beside their data models. Update `_ENGINE_EXPORTS` if you
add a new engine so it becomes available via a single import path.

```python
from dynamic.platform.engines import DynamicSpaceEngine, DynamicStateEngine
```

_Optimisation tips:_

- `dynamic.platform.engines.__getattr__` lazily imports the source module and
  caches the symbol, covering engines such as `DynamicAssignEngine`,
  `DynamicSpaceEngine`, and `DynamicStateEngine`. This keeps optional
  dependencies dormant until needed and mirrors the historical surface area
  without duplicating
  logic.【F:dynamic.platform.engines/**init**.py†L1-L123】【F:dynamic.platform.engines/**init**.py†L168-L212】
- When adding a new engine, expose only the public entry points in
  `_ENGINE_EXPORTS` to avoid leaking experimental utilities.
- Pair shim imports with type checking (`reveal_type` in tests or `mypy` stubs)
  so new exports stay discoverable by IDEs.

## 2. Chain personas for multi-engine workflows

The dynamic AI persona helpers give you a ready-made research → execution → risk
chain. Each getter lazily initialises the underlying agent and
`configure_dynamic_start_agents` lets you swap personas for specific
environments or tasks before calling `prime_dynamic_start_agents()` to
materialise the cache.

```python
from dynamic.intelligence.ai_apps.agents import (
    configure_dynamic_start_agents,
    get_dynamic_start_agents,
    prime_dynamic_start_agents,
)

agents = get_dynamic_start_agents()
execution_agent = agents["execution"]
```

_Optimisation tips:_

- Override only the personas you need by passing either an instance or factory
  into `configure_dynamic_start_agents`; `prime_dynamic_start_agents()` then
  locks in the replacements and keeps them available for reuse. This pattern
  mirrors how the production persona chain daisy-chains analysis, execution, and
  risk evaluations while letting you inject zone- or task-specific variants on
  demand.【F:dynamic.intelligence.ai_apps/agents.py†L874-L940】
- Share persona caches between services through `prime_dynamic_start_agents()`
  during boot to reduce cold-start latency.
- Capture persona output metadata (confidence, latency) so downstream engines
  can make routing decisions using real-world performance signals.

## 3. Model levels and zones with `DynamicZoneRegistry`

Use `Zone` (with `ZoneBoundary`) to describe any spatial or logical level.
Register zones, ingest events (enter/exit/sample/alert), and query snapshots to
drive routing decisions.

```python
from dynamic_zone.zone import DynamicZoneRegistry, Zone, ZoneBoundary

registry = DynamicZoneRegistry()
registry.register_zone(
    Zone(
        name="Operations Hub",
        boundary=ZoneBoundary(min_x=0, max_x=50, min_y=0, max_y=30),
        capacity=12,
        tags=("mission-control", "level-1"),
    )
)
registry.record_event("Operations Hub", kind="enter")
status = registry.snapshot("Operations Hub")
```

_Optimisation tips:_

- Feed all level/zone metrics through `record_event()`; it normalises occupancy
  changes, clamps metrics, and preserves a rolling history so `snapshot()` and
  `utilisation()` report consistent telemetry for downstream
  engines.【F:dynamic_zone/zone.py†L1-L225】【F:dynamic_zone/zone.py†L262-L460】
- Define sensitivity tiers in the `tags` field (for example
  `("level-1", "critical")`) and fan them into persona overrides so high-risk
  zones automatically pull specialised agents.
- Use `utilisation()` to trigger `DynamicAssignEngine` refreshes whenever a zone
  crosses a load threshold.

## 4. Coordinate sectors with `DynamicSpaceEngine`

For macro environments (fleets, infrastructures, planetary sectors), use
`DynamicSpaceEngine` to upsert sectors, ingest events, stabilise congested
routes, and compute network overviews that highlight intervention priorities.

```python
from dynamic_space.engine import DynamicSpaceEngine

space_engine = DynamicSpaceEngine(intervention_threshold=0.6)
space_engine.upsert_sector({
    "name": "Lunar Logistics",
    "hazard_index": 0.3,
    "supply_level": 0.8,
    "energy_output_gw": 2.4,
})
overview = space_engine.network_overview(horizon=8)
critical = space_engine.prioritise_interventions(limit=2)
```

_Optimisation tips:_

- Keep sectors lightweight by passing mappings—the engine coerces them into
  `SpaceSector` objects, clamping stability metrics and aggregating snapshots to
  produce average stability, energy output, and a ranked list of
  attention-worthy
  sectors.【F:dynamic_space/engine.py†L1-L119】【F:dynamic_space/space.py†L1-L120】
- Schedule `network_overview()` runs after major zone changes so sector
  forecasts account for new load patterns.
- Use `prioritise_interventions()` results to pre-allocate specialised personas
  or assignment queues before a sector degrades.

## 5. Assign agents to work with `DynamicAssignEngine`

`DynamicAssignEngine.recommend_assignments()` ranks tasks by priority, scores
agents on skill overlap, availability, and confidence, and returns structured
decisions. Clone agent profiles before calling if you need to preserve original
availability figures.

```python
from dynamic_assign.engine import (
    AgentProfile,
    AssignableTask,
    DynamicAssignEngine,
)

engine = DynamicAssignEngine()
assignments = engine.recommend_assignments(
    tasks=[
        AssignableTask(
            identifier="launch-sequence",
            description="Prepare the orbital launch",
            priority=0.9,
            required_skills=("aerodynamics", "safety"),
        )
    ],
    agents=[
        AgentProfile(
            name="Ava",
            skills=("aerodynamics", "propulsion"),
            available_hours=6,
            confidence=0.8,
        )
    ],
)
```

_Optimisation tips:_

- The engine clones the agent list internally so it can decrement availability
  per assignment. Inspect `AssignmentDecision.as_dict()` for downstream storage
  or analytics; the class captures rationale, confidence, and load factor for
  every
  recommendation.【F:dynamic_assign/engine.py†L1-L157】【F:dynamic_assign/engine.py†L172-L200】
- Pipe `DynamicSpaceEngine.prioritise_interventions()` output into task
  generation to ensure high-risk sectors receive agents first.
- Capture rejected assignments and feed them back into the scoring weights to
  improve future recommendations.

## 6. Automate the loop with `DynamicUsageOrchestrator`

When you want a ready-made loop that links persona insights, zone telemetry,
sector coordination, and task routing, use `DynamicUsageOrchestrator` from the
shim. It ensures the underlying registry/engines exist, translates persona
signals into zone/space events, and produces `AssignableTask`s that flow
straight into the assignment planner.

```python
from dynamic.platform.engines import DynamicUsageOrchestrator, PersonaSignal
from dynamic_assign.engine import AgentProfile
from dynamic_zone.zone import ZoneBoundary

orchestrator = DynamicUsageOrchestrator()

# Register environment primitives once.
orchestrator.register_zone(
    {
        "name": "Operations Hub",
        "boundary": ZoneBoundary(0, 12, 0, 8),
        "capacity": 6,
        "tags": ("level-1", "mission-control"),
    }
)
orchestrator.register_sector(
    {
        "name": "Lunar Logistics",
        "hazard_index": 0.45,
        "supply_level": 0.7,
        "energy_output_gw": 1.2,
    }
)

# Convert persona output into a single usage cycle.
cycle = orchestrator.plan_cycle(
    signals=(
        PersonaSignal(
            persona="research",
            summary="Fuel leak risk within the operations hub",
            zone="Operations Hub",
            sector="Lunar Logistics",
            severity=0.82,
            required_skills=("safety", "engineering"),
        ),
    ),
    agents=(
        AgentProfile(
            name="Ava",
            skills=("safety", "engineering"),
            available_hours=6,
            confidence=0.8,
        ),
    ),
)

for decision in cycle.assignments:
    print(decision.as_dict())
```

_Optimisation tips:_

- Provide `zone_configuration` and `sector_configuration` inside each
  `PersonaSignal` if you have not registered the zone or sector ahead of time;
  the orchestrator will create them on demand using the supplied payloads.
  Otherwise the registry/space engine is reused.
- Use `plan_cycle(..., allow_unassigned=True)` when you want to produce tasks
  and telemetry without immediately generating assignments (for example, during
  dry-runs or when feeding a downstream review queue).
- Call `load_persona_chain()` to bootstrap the default research → execution →
  risk personas before producing signals so you can pull persona objects
  straight from the orchestrator cache for data enrichment.

### Putting it together

1. Persona output (research summary) highlights a risk in a specific zone.
2. `DynamicZoneRegistry` marks the zone as saturated, triggering a
   `DynamicSpaceEngine` intervention for the containing sector.
3. The intervention generates a high-priority remediation task that
   `DynamicAssignEngine` routes to the best-fit agent cohort.
4. Assignment decisions, sector metrics, and persona telemetry are written to a
   shared log for retrospectives.

---

Combine these patterns to route persona outputs into zone snapshots, feed sector
alerts into task assignments, and keep orchestration modular while sharing a
consistent import surface. Re-run the quick-start blueprint whenever you onboard
a new environment or ship a major engine change.
