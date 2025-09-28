# Dynamic Engines – Recommended Usage Patterns

This guide summarises how to compose the orchestration engines that power Dynamic Capital, focusing on linking modules, coordinating zones/levels, and matching agents to tasks.

## 1. Import engines through the `dynamic_engines` shim

The legacy-compatible `dynamic_engines` module forwards attributes to the domain packages on demand, so you can keep call sites stable while implementations live beside their data models. Update `_ENGINE_EXPORTS` if you add a new engine so it becomes available via a single import path.

```python
from dynamic_engines import DynamicSpaceEngine, DynamicStateEngine
```

_Why it works:_ `dynamic_engines.__getattr__` lazily imports the source module and caches the symbol, covering engines such as `DynamicAssignEngine`, `DynamicSpaceEngine`, and `DynamicStateEngine`. This keeps optional dependencies dormant until needed and mirrors the historical surface area without duplicating logic.【F:dynamic_engines/__init__.py†L1-L123】【F:dynamic_engines/__init__.py†L168-L212】

## 2. Chain personas for multi-engine workflows

The dynamic AI persona helpers give you a ready-made research → execution → risk chain. Each getter lazily initialises the underlying agent and `configure_dynamic_start_agents` lets you swap personas for specific environments or tasks before calling `prime_dynamic_start_agents()` to materialise the cache.

```python
from dynamic_ai.agents import (
    configure_dynamic_start_agents,
    get_dynamic_start_agents,
    prime_dynamic_start_agents,
)

agents = get_dynamic_start_agents()
execution_agent = agents["execution"]
```

_Best practice:_ Override only the personas you need by passing either an instance or factory into `configure_dynamic_start_agents`; `prime_dynamic_start_agents()` then locks in the replacements and keeps them available for reuse. This pattern mirrors how the production persona chain daisy-chains analysis, execution, and risk evaluations while letting you inject zone- or task-specific variants on demand.【F:dynamic_ai/agents.py†L874-L940】

## 3. Model levels and zones with `DynamicZoneRegistry`

Use `Zone` (with `ZoneBoundary`) to describe any spatial or logical level. Register zones, ingest events (enter/exit/sample/alert), and query snapshots to drive routing decisions.

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

_Best practice:_ Feed all level/zone metrics through `record_event()`; it normalises occupancy changes, clamps metrics, and preserves a rolling history so `snapshot()` and `utilisation()` report consistent telemetry for downstream engines.【F:dynamic_zone/zone.py†L1-L225】【F:dynamic_zone/zone.py†L262-L460】

## 4. Coordinate sectors with `DynamicSpaceEngine`

For macro environments (fleets, infrastructures, planetary sectors), use `DynamicSpaceEngine` to upsert sectors, ingest events, stabilise congested routes, and compute network overviews that highlight intervention priorities.

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

_Best practice:_ Keep sectors lightweight by passing mappings—the engine coerces them into `SpaceSector` objects, clamping stability metrics and aggregating snapshots to produce average stability, energy output, and a ranked list of attention-worthy sectors.【F:dynamic_space/engine.py†L1-L119】【F:dynamic_space/space.py†L1-L120】

## 5. Assign agents to work with `DynamicAssignEngine`

`DynamicAssignEngine.recommend_assignments()` ranks tasks by priority, scores agents on skill overlap, availability, and confidence, and returns structured decisions. Clone agent profiles before calling if you need to preserve original availability figures.

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

_Best practice:_ The engine clones the agent list internally so it can decrement availability per assignment. Inspect `AssignmentDecision.as_dict()` for downstream storage or analytics; the class captures rationale, confidence, and load factor for every recommendation.【F:dynamic_assign/engine.py†L1-L157】【F:dynamic_assign/engine.py†L172-L200】

---

Combine these patterns to route persona outputs into zone snapshots, feed sector alerts into task assignments, and keep orchestration modular while sharing a consistent import surface.
