import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic.intelligence.agi import (
    AGIDiagnostics,
    AGILocalMachineTaskConfig,
    AGIOutput,
    build_local_machine_plan_from_improvement,
    build_local_machine_plan_from_output,
)
from dynamic.intelligence.ai_apps import AISignal


def _diagnostics() -> AGIDiagnostics:
    return AGIDiagnostics(context={}, composite={}, consensus={})


def _agi_output(improvement: Dict[str, object]) -> AGIOutput:
    return AGIOutput(
        signal=AISignal(action="HOLD", confidence=0.5, reasoning="stub"),
        research={},
        risk_adjusted={},
        sizing=None,
        market_making={},
        diagnostics=_diagnostics(),
        improvement=improvement,
        version="0.0.0",
        version_info={},
        generated_at=datetime.now(timezone.utc),
    )


def test_build_plan_from_improvement_applies_overrides() -> None:
    improvement = {
        "actions": ["Tighten risk controls", "Run integration tests"],
        "roadmap": [
            {
                "category": "Daily Operating System",
                "description": "Structure deep work blocks",
                "intent": "Amplify workflow cadence",
                "focus_metric": "execution_cadence",
                "suggested_habits": ["Plan focus cycles"],
            },
            {
                "category": "Skill Growth & Knowledge",
                "description": "Invest time in deliberate practice",
            },
        ],
    }

    config = AGILocalMachineTaskConfig(
        action_commands={
            "tighten risk controls": ("python", "manage.py", "risk_audit"),
        },
        category_commands={
            "daily operating system": ("npm", "run", "plan-routine"),
        },
        default_command=("echo", "{description}"),
        default_estimated_duration=2.0,
        default_cpu_cost=1.2,
        default_memory_cost=0.8,
        environment={"CI": "1"},
    )

    plan = build_local_machine_plan_from_improvement(improvement, config=config)

    assert [task.identifier for task in plan.tasks] == [
        "agi-action-01-tighten-risk-controls",
        "agi-action-02-run-integration-tests",
        "agi-roadmap-01-daily-operating-system",
        "agi-roadmap-02-skill-growth-knowledge",
    ]

    action_task = plan.tasks[0]
    assert action_task.command == ("python", "manage.py", "risk_audit")
    assert action_task.dependencies == ()
    assert action_task.estimated_duration == pytest.approx(2.0)
    assert action_task.environment_mapping()["CI"] == "1"
    assert action_task.environment_mapping()["AGI_ACTION"] == "Tighten risk controls"

    roadmap_task = plan.tasks[2]
    assert roadmap_task.command == ("npm", "run", "plan-routine")
    assert roadmap_task.dependencies == ("agi-action-02-run-integration-tests",)
    assert (
        roadmap_task.environment_mapping()["AGI_SUGGESTED_HABITS"]
        == "Plan focus cycles"
    )


def test_build_plan_from_output_requires_improvement() -> None:
    improvement = {
        "actions": ["Refine execution"],
        "roadmap": [],
    }
    plan = build_local_machine_plan_from_output(_agi_output(improvement))
    assert [task.identifier for task in plan.tasks] == [
        "agi-action-01-refine-execution",
    ]

    base_output = _agi_output({})
    output_without_plan = AGIOutput(
        signal=base_output.signal,
        research=base_output.research,
        risk_adjusted=base_output.risk_adjusted,
        sizing=base_output.sizing,
        market_making=base_output.market_making,
        diagnostics=base_output.diagnostics,
        improvement=None,
        version=base_output.version,
        version_info=base_output.version_info,
        generated_at=base_output.generated_at,
    )

    with pytest.raises(ValueError):
        build_local_machine_plan_from_output(output_without_plan)


def test_build_plan_from_improvement_validates_content() -> None:
    with pytest.raises(ValueError):
        build_local_machine_plan_from_improvement({"actions": [], "roadmap": []})
