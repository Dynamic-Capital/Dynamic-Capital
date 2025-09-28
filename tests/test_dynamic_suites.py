from __future__ import annotations

import math

from dynamic_suites import (
    DynamicSuiteEngine,
    SuiteDefinition,
    SuiteRun,
)


def test_dynamic_suite_snapshot_and_status() -> None:
    engine = DynamicSuiteEngine(
        history=5,
        definitions=[
            {
                "key": "qa",
                "name": "Quality Assurance",
                "description": "Primary regression protection",
                "criticality": 0.8,
                "cadence_minutes": 180,
                "owner": "release@dynamic.capital",
                "tags": ("ci", "release"),
            }
        ],
    )

    engine.extend(
        [
            {
                "suite": "qa",
                "status": "passed",
                "passed": True,
                "coverage": 0.92,
                "duration_seconds": 420,
                "triggered_by": "ci/main",
            },
            {
                "suite": "qa",
                "status": "failed",
                "passed": False,
                "coverage": 0.78,
                "duration_seconds": 530,
                "triggered_by": "ci/main",
                "notes": "Flaky login test",
            },
            {
                "suite": "qa",
                "status": "passed",
                "passed": True,
                "coverage": 0.9,
                "duration_seconds": 410,
                "triggered_by": "manual",
            },
        ]
    )

    snapshot = engine.snapshot("qa")
    assert snapshot.total_runs == 3
    assert snapshot.status == "green"
    assert snapshot.consecutive_failures == 0
    assert math.isclose(snapshot.pass_rate, 2 / 3, rel_tol=1e-5)
    assert snapshot.average_coverage and snapshot.average_coverage > 0.85
    assert snapshot.average_duration and snapshot.average_duration > 400
    assert snapshot.cadence_health <= 1.0
    assert "Quality Assurance" in snapshot.narrative
    assert snapshot.metadata["recent_failures"][0]["status"] == "failed"
    assert snapshot.metadata["recent_runs"][0]["status"] == "passed"
    assert snapshot.definition.tags == ("ci", "release")


def test_dynamic_suite_portfolio_readiness() -> None:
    engine = DynamicSuiteEngine(history=4)
    engine.register(
        SuiteDefinition(
            key="qa",
            name="Quality Assurance",
            criticality=0.9,
            cadence_minutes=120,
        )
    )
    engine.register(
        SuiteDefinition(
            key="ops",
            name="Operations",
            criticality=1.0,
            cadence_minutes=60,
        )
    )

    engine.extend(
        [
            SuiteRun(suite="qa", passed=True, coverage=0.9, duration_seconds=300),
            SuiteRun(suite="qa", passed=False, coverage=0.7, duration_seconds=360),
            SuiteRun(suite="qa", passed=True, coverage=0.88, duration_seconds=290),
            SuiteRun(suite="ops", passed=False, duration_seconds=200, status="failed"),
            SuiteRun(suite="ops", passed=False, duration_seconds=210, status="failed"),
        ]
    )

    portfolio = engine.build_portfolio()
    assert len(portfolio.suites) == 2
    assert 0.0 <= portfolio.overall_pass_rate <= 1.0
    assert 0.0 <= portfolio.readiness_index <= 1.0
    assert portfolio.critical_alerts  # operations suite should be red
    assert "Operations" in portfolio.narrative
    snapshot_ops = next(s for s in portfolio.suites if s.definition.key == "ops")
    assert snapshot_ops.status == "red"
    assert snapshot_ops.consecutive_failures >= 2
    payload = portfolio.as_dict()
    assert payload["critical_alerts"]
    assert payload["suites"][0]["definition"]["name"]


def test_dynamic_suite_history_limit_and_reset() -> None:
    engine = DynamicSuiteEngine(history=3)
    engine.register(
        SuiteDefinition(key="qa", name="Quality Assurance", cadence_minutes=60)
    )

    for passed in [True, False, True, False, True]:
        engine.record(
            {
                "suite": "qa",
                "passed": passed,
                "status": "passed" if passed else "failed",
            }
        )

    snapshot = engine.snapshot("qa")
    assert snapshot.total_runs == 3
    assert snapshot.last_run is not None
    assert snapshot.metadata["recent_runs"][-1]["passed"] == snapshot.last_run.passed

    engine.reset("qa")
    snapshot_after_reset = engine.snapshot("qa")
    assert snapshot_after_reset.total_runs == 0
    assert snapshot_after_reset.status == "unknown"

    engine.reset()  # should be no-op even without suites specified


