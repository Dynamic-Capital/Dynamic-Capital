"""Tests for the trading algo enhancement roadmap utilities."""

from __future__ import annotations

from algorithms.python.trading_algo_enhancement import (
    EnhancementProgress,
    build_default_roadmap,
    build_trading_algo_enhancement_plan,
    loop_trading_algo_enhancement_plan,
)


def test_default_roadmap_category_order() -> None:
    roadmap = build_default_roadmap()
    assert roadmap.categories() == (
        "telemetry",
        "orchestration",
        "integration",
        "experimentation",
        "governance",
    )


def test_plan_dependency_integrity() -> None:
    plan = build_trading_algo_enhancement_plan()
    steps = {step.name: step for step in plan.steps}

    assert steps["telemetry.instrumentation"].depends_on == ("telemetry.asset_inventory",)
    assert steps["telemetry.outcome_capture"].depends_on == ("telemetry.instrumentation",)
    assert steps["integration.guardrails"].depends_on == ("integration.shadow_deployments",)
    assert steps["orchestration.human_override"].depends_on == ("orchestration.ensemble_scoring",)


def test_recommendations_respect_dependencies_and_filters() -> None:
    roadmap = build_default_roadmap()
    progress = EnhancementProgress()

    progress.mark_done("telemetry.asset_inventory")
    recommendations = [task.key for task in roadmap.recommend_next_tasks(progress.task_status)]
    assert recommendations[0] == "telemetry.instrumentation"

    progress.mark_done("telemetry.instrumentation")
    progress.mark_done("telemetry.outcome_capture")
    recommendations = [task.key for task in roadmap.recommend_next_tasks(progress.task_status)]
    assert recommendations[0] == "orchestration.capability_matrix"

    governance_next = roadmap.recommend_next_tasks(progress.task_status, category="governance")
    assert governance_next and governance_next[0].key == "governance.vendor_assessment"

    limited = roadmap.recommend_next_tasks(progress.task_status, limit=2)
    assert [task.key for task in limited] == [
        "orchestration.capability_matrix",
        "experimentation.replay_harness",
    ]


def test_loop_trading_algo_enhancement_plan_executes_iterations() -> None:
    summary = loop_trading_algo_enhancement_plan(iterations=1)

    assert summary.iterations() == 1
    assert summary.plan.name == "trading_algo_enhancement"
    assert summary.status in {"completed", "failed", "skipped"}
