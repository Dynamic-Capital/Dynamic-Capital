from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_local_machine import (  # noqa: E402
    DynamicLocalMachineEngine,
    LocalMachinePlan,
    LocalMachineTask,
)


def test_local_machine_engine_orders_tasks_and_reports_resources() -> None:
    engine = DynamicLocalMachineEngine(cpu_capacity=2.0, memory_capacity=1.0)
    plan = engine.build_plan(
        (
            {
                "identifier": "install",
                "command": "npm install",
                "estimated_duration": 3,
                "cpu_cost": 1.2,
                "memory_cost": 0.9,
            },
            {
                "identifier": "lint",
                "command": ["npm", "run", "lint"],
                "dependencies": ("install",),
                "cpu_cost": 1.5,
                "memory_cost": 1.2,
            },
            LocalMachineTask(
                identifier="typecheck",
                command=("npm", "run", "typecheck"),
                description="Ensure TypeScript types are valid",
                dependencies=("install",),
                cpu_cost=0.8,
                memory_cost=0.7,
            ),
        )
    )

    assert isinstance(plan, LocalMachinePlan)
    assert [task.identifier for task in plan.tasks] == [
        "install",
        "lint",
        "typecheck",
    ]
    assert plan.total_estimated_duration == 5.0
    assert plan.resource_warnings  # memory over capacity should trigger a warning
    assert not plan.blocked_tasks
    assert not plan.cycles


def test_local_machine_engine_flags_missing_dependencies_and_cycles() -> None:
    engine = DynamicLocalMachineEngine()
    plan = engine.build_plan(
        (
            {
                "identifier": "bootstrap",
                "command": "echo bootstrap",
            },
            {
                "identifier": "migrate",
                "command": ("alembic", "upgrade", "head"),
                "dependencies": ("bootstrap", "database"),
            },
            {
                "identifier": "database",
                "command": "echo setup database",
                "dependencies": ("migrate",),
            },
        )
    )

    scheduled = [task.identifier for task in plan.tasks]
    assert scheduled == ["bootstrap"]
    assert set(plan.blocked_tasks) == {"database", "migrate"}
    assert any({"database", "migrate"} == set(cycle) for cycle in plan.cycles)


def test_local_machine_engine_rejects_duplicate_identifiers() -> None:
    engine = DynamicLocalMachineEngine()
    with pytest.raises(ValueError, match="duplicate task identifier"):
        engine.build_plan(
            (
                {"identifier": "build", "command": "echo build"},
                {"identifier": "build", "command": "echo again"},
            )
        )


def test_local_machine_engine_prioritises_heavier_ready_tasks() -> None:
    engine = DynamicLocalMachineEngine()
    plan = engine.build_plan(
        (
            {
                "identifier": "lint",
                "command": "npm run lint",
                "cpu_cost": 0.5,
                "memory_cost": 0.5,
            },
            {
                "identifier": "test",
                "command": "npm test",
                "cpu_cost": 2.0,
                "memory_cost": 1.5,
            },
            {
                "identifier": "typecheck",
                "command": "npm run typecheck",
                "cpu_cost": 2.0,
                "memory_cost": 0.5,
            },
        )
    )

    assert [task.identifier for task in plan.tasks] == [
        "test",
        "typecheck",
        "lint",
    ]
