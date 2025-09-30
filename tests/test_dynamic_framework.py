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
    build_fine_tune_dataset,
    build_prompt_catalog,
    load_scenario,
    render_prompt_catalog,
    render_report,
    serialise_report,
    run,
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
    report = engine.report()
    output = render_report(engine, format="json", indent=None, report=report)
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
    report = engine.report()
    output = render_report(engine, format="json", indent=-1, report=report)

    assert "\n" not in output
    assert json.loads(output)["history"] == engine.history


def test_serialise_report_matches_json_rendering() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    report = engine.report()
    payload = serialise_report(engine, report=report)
    rendered = json.loads(render_report(engine, format="json", report=report))

    assert rendered["nodes"] == payload["nodes"]
    assert rendered["focus_areas"] == payload["focus_areas"]
    assert rendered["alerts"] == payload["alerts"]


def test_report_exposes_snapshots_for_serialisation() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    report = engine.report()

    assert len(report.snapshots) == 3
    keys = [snapshot.key for snapshot in report.snapshots]
    assert set(keys) == {"automation", "orchestration", "platform"}

    payload = serialise_report(engine, report=report)
    assert [node["key"] for node in payload["nodes"]] == sorted(keys)


def test_build_fine_tune_dataset_generates_examples() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    report = engine.report()

    payload = build_fine_tune_dataset(
        engine,
        report=report,
        default_tags=["dynamic-agi"],
    )

    dataset = payload["dataset"]
    assert dataset["summary"]["count"] == len(report.snapshots)
    assert dataset["summary"]["default_tags"] == ["dynamic-agi"]
    assert dataset["summary"]["tag_histogram"]["dynamic-agi"] == len(report.snapshots)
    assert len(dataset["examples"]) == len(report.snapshots)
    first = dataset["examples"][0]
    assert first["tags"] == ["dynamic-agi"]
    assert first["metadata"]["signals"]


def test_build_fine_tune_dataset_orders_examples_by_node_key() -> None:
    engine = DynamicFrameworkEngine(
        nodes=[
            FrameworkNode(key="platform", title="Platform"),
            FrameworkNode(key="automation", title="Automation"),
        ]
    )

    report = engine.report()
    payload = build_fine_tune_dataset(engine, report=report)

    example_keys = [
        example["metadata"]["signals"][0]["metric"].split(".", 1)[0]
        for example in payload["dataset"]["examples"]
    ]

    assert example_keys == sorted(example_keys)


def test_build_prompt_catalog_produces_rows_for_each_node() -> None:
    engine = build_engine(DEFAULT_SCENARIO)
    report = engine.report()

    prompts = build_prompt_catalog(engine, report=report)

    assert len(prompts) == len(report.snapshots)
    assert all(entry["act"].endswith("Capability Coach") for entry in prompts)
    assert all("Telemetry readings" in entry["prompt"] for entry in prompts)


def test_cli_writes_fine_tune_dataset_creating_parent_dirs(tmp_path, capsys) -> None:
    destination = tmp_path / "nested" / "fine-tune" / "dataset.json"

    exit_code = run([
        "--format",
        "json",
        "--fine-tune-dataset",
        str(destination),
        "--indent",
        "0",
    ])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert captured.out  # ensure the CLI emitted a report
    assert destination.exists()

    dataset_payload = json.loads(destination.read_text())
    assert dataset_payload["dataset"]["summary"]["count"] > 0


def test_cli_emits_awesome_prompts_csv(capsys) -> None:
    exit_code = run(["--format", "awesome-prompts"])

    captured = capsys.readouterr()

    assert exit_code == 0
    lines = [line for line in captured.out.splitlines() if line.strip()]
    assert lines[0].startswith("act,prompt")
    assert any("Capability Coach" in line for line in lines[1:])


def test_cli_writes_awesome_prompts_csv(tmp_path, capsys) -> None:
    destination = tmp_path / "exports" / "awesome-prompts.csv"

    exit_code = run([
        "--format",
        "awesome-prompts",
        "--awesome-prompts-output",
        str(destination),
    ])

    captured = capsys.readouterr()

    assert exit_code == 0
    assert destination.exists()
    assert captured.out.splitlines()[0].startswith("act,prompt")

    csv_lines = [line for line in destination.read_text().splitlines() if line.strip()]
    assert csv_lines[0] == "act,prompt"
    assert any("Capability Coach" in line for line in csv_lines[1:])


def test_cli_can_stream_awesome_prompts_alongside_other_format(capsys) -> None:
    exit_code = run([
        "--format",
        "json",
        "--awesome-prompts-output",
        "-",
        "--indent",
        "0",
    ])

    captured = capsys.readouterr()

    assert exit_code == 0
    assert captured.out.startswith("{")
    assert "\n\nact,prompt" in captured.out


def test_cli_extracts_both_datasets(tmp_path, capsys) -> None:
    export_dir = tmp_path / "dataset-exports"

    exit_code = run([
        "--format",
        "text",
        "--extract-datasets",
        str(export_dir),
    ])

    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Node snapshots:" in captured.out

    fine_tune_path = export_dir / "fine-tune-dataset.json"
    awesome_prompts_path = export_dir / "awesome-prompts.csv"

    assert fine_tune_path.exists()
    assert awesome_prompts_path.exists()

    dataset_payload = json.loads(fine_tune_path.read_text())
    assert dataset_payload["dataset"]["summary"]["count"] > 0

    csv_lines = [line for line in awesome_prompts_path.read_text().splitlines() if line]
    assert csv_lines[0] == "act,prompt"
    assert any("Capability Coach" in line for line in csv_lines[1:])


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
