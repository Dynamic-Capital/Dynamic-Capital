from __future__ import annotations

from datetime import datetime, timedelta, timezone

import io
import json
import math
import pytest

from dynamic_framework import (
    DynamicFrameworkEngine,
    FrameworkNode,
    FrameworkPulse,
)
from dynamic_framework.__main__ import (
    DEFAULT_SCENARIO,
    build_engine,
    load_scenario,
    render_report,
    serialise_report,
)


def _ts(minutes: int) -> datetime:
    return datetime(2024, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def test_snapshot_with_pulses_generates_recommendations_and_alerts() -> None:
    engine = DynamicFrameworkEngine(
        nodes=[
            FrameworkNode(
                key="orchestration",
                title="Orchestration",
                minimum_maturity=0.4,
                target_maturity=0.75,
                practices=("playbooks", "ritual reviews"),
            )
        ],
        history=6,
        decay=0.15,
    )
    engine.ingest(
        [
            FrameworkPulse(
                node="orchestration",
                maturity=0.42,
                confidence=0.55,
                enablement=0.48,
                resilience=0.52,
                momentum=-0.15,
                timestamp=_ts(0),
                tags=("cadence",),
            ),
            FrameworkPulse(
                node="orchestration",
                maturity=0.58,
                confidence=0.7,
                enablement=0.57,
                resilience=0.62,
                momentum=0.05,
                timestamp=_ts(45),
                tags=("governance",),
            ),
        ]
    )

    snapshot = engine.snapshot("orchestration")

    assert 0.45 < snapshot.maturity < 0.65
    assert snapshot.status == "calibrating"
    assert any("enablement" in alert for alert in snapshot.alerts)
    assert any("Invest" in recommendation for recommendation in snapshot.recommendations)
    assert "Orchestration is"[:5] == snapshot.summary[:5]
    assert "playbooks" in snapshot.tags


def test_snapshot_without_pulses_reports_insufficient_data() -> None:
    engine = DynamicFrameworkEngine(
        nodes=[FrameworkNode(key="platform", title="Platform")]
    )

    snapshot = engine.snapshot("platform")

    assert snapshot.status == "insufficient-data"
    assert snapshot.maturity == 0.0
    assert snapshot.alerts == ("Platform: insufficient telemetry",)


def test_report_prioritises_non_integrated_nodes() -> None:
    engine = DynamicFrameworkEngine(
        nodes=[
            FrameworkNode(key="foundation", title="Foundation", target_maturity=0.8),
            FrameworkNode(key="automation", title="Automation", target_maturity=0.75),
        ]
    )
    engine.ingest(
        [
            FrameworkPulse(
                node="foundation",
                maturity=0.82,
                confidence=0.7,
                enablement=0.72,
                resilience=0.68,
                momentum=0.15,
                timestamp=_ts(5),
            ),
            FrameworkPulse(
                node="automation",
                maturity=0.38,
                confidence=0.6,
                enablement=0.42,
                resilience=0.47,
                momentum=-0.25,
                timestamp=_ts(15),
            ),
        ]
    )

    report = engine.report()

    assert report.overall_maturity < 0.7
    assert math.isclose(report.execution_health, 0.57, rel_tol=1e-2)
    assert report.focus_areas == ("Automation",)
    assert any("Automation" in alert for alert in report.alerts)
    assert "Overall maturity" in report.summary


def test_record_unknown_node_raises_key_error() -> None:
    engine = DynamicFrameworkEngine()
    pulse = FrameworkPulse(node="unknown", maturity=0.5)

    with pytest.raises(KeyError):
        engine.record(pulse)


def test_cli_build_engine_from_default_scenario() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    assert set(engine.nodes) == {"automation", "orchestration", "platform"}
    report = engine.report()
    assert report.overall_maturity > 0.5
    assert any(focus == "Automation" for focus in report.focus_areas)


def test_cli_render_report_includes_recommendations() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    output = render_report(engine)
    assert "Node snapshots:" in output
    assert "Automation" in output
    assert "Recommendations:" in output


def test_render_report_supports_json_format() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    output = render_report(engine, format="json", indent=None)
    payload = json.loads(output)

    assert payload["history"] == engine.history
    assert payload["decay"] == pytest.approx(engine.decay)
    assert {node["key"] for node in payload["nodes"]} == {
        "automation",
        "orchestration",
        "platform",
    }


def test_render_report_normalises_negative_indent() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    output = render_report(engine, format="json", indent=-1)

    assert "\n" not in output
    assert json.loads(output)["history"] == engine.history


def test_serialise_report_matches_json_rendering() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    payload = serialise_report(engine)
    rendered = json.loads(render_report(engine, format="json"))

    assert rendered["nodes"] == payload["nodes"]
    assert rendered["focus_areas"] == payload["focus_areas"]
    assert rendered["alerts"] == payload["alerts"]


def test_load_scenario_accepts_stdin_payload() -> None:
    scenario_data = {
        "history": 8,
        "decay": 0.12,
        "nodes": [
            {
                "key": "insight",
                "title": "Insight",
            }
        ],
        "pulses": [],
    }

    scenario = load_scenario("-", stdin=io.StringIO(json.dumps(scenario_data)))

    assert scenario["history"] == 8
    assert scenario["nodes"][0]["key"] == "insight"
