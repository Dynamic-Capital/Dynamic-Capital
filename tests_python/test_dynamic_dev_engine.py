from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_dev_engine import DevelopmentTask, DynamicDevEngine


def _task(identifier: str, *, role: str, effort: float) -> DevelopmentTask:
    return DevelopmentTask(
        identifier=identifier,
        description=f"Task {identifier}",
        effort_hours=effort,
        role=role,
    )


def test_plan_iteration_merges_duplicate_role_capacity() -> None:
    engine = DynamicDevEngine()
    tasks = (
        _task("FE-1", role="Front-End Developer", effort=5.0),
        _task("FE-2", role="Front-End Developer", effort=4.0),
    )
    capacity = (
        {
            "role": "Front-End Developer",
            "available_hours": 6,
            "hours_per_day": 3,
            "focus": ("web",),
        },
        {
            "role": "Front-End Developer",
            "available_hours": 4,
            "hours_per_day": 2,
            "focus": ("mobile", "web"),
        },
    )

    blueprint = engine.plan_iteration(tasks, capacity=capacity, iteration="Sprint Alpha")

    scheduled_identifiers = {task.identifier for task in blueprint.scheduled_tasks}
    assert scheduled_identifiers == {"FE-1", "FE-2"}

    front_end_capacity = blueprint.capacity["Front-End Developer"]
    assert front_end_capacity.available_hours == 10.0
    assert front_end_capacity.hours_per_day == 5.0
    assert front_end_capacity.focus == ("web", "mobile")

    notes_focus = blueprint.notes["roles"]["Front-End Developer"]["focus"]
    assert notes_focus == ["web", "mobile"]

    assert blueprint.deferred_tasks == ()
