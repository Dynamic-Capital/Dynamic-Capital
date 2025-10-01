"""Tests for the Dynamic AGI build helpers and CLI."""

from __future__ import annotations

import json
from pathlib import Path

from dynamic.intelligence.agi.build import build_dynamic_agi_payload, run_cli


def test_build_dynamic_agi_payload_default_text() -> None:
    result = build_dynamic_agi_payload()
    assert "Overall maturity" in result.report
    dataset = result.dataset
    assert "dataset" in dataset
    examples = dataset["dataset"]["examples"]
    assert isinstance(examples, list)
    assert examples, "expected at least one fine-tune example"


def test_build_dynamic_agi_payload_json_format() -> None:
    result = build_dynamic_agi_payload(report_format="json", indent=0)
    payload = json.loads(result.report)
    assert payload["history"] >= 0
    assert "nodes" in payload


def test_build_dynamic_agi_payload_negative_indent_defaults() -> None:
    result = build_dynamic_agi_payload(report_format="json", indent=-4)
    payload = json.loads(result.report)
    assert isinstance(payload, dict)
    assert result.dataset["dataset"]["summary"]["count"] >= 1


def test_run_cli_writes_dataset(tmp_path: Path, capsys: "CaptureFixture[str]") -> None:
    destination = tmp_path / "dataset.json"
    exit_code = run_cli(["--format", "json", "--dataset", str(destination)])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert captured.out.strip().startswith("{")
    saved_payload = json.loads(destination.read_text(encoding="utf-8"))
    assert saved_payload["dataset"]["summary"]["count"] >= 1


def test_run_cli_dataset_stdout_without_duplication(capsys: "CaptureFixture[str]") -> None:
    exit_code = run_cli(["--format", "fine-tune", "--dataset", "-"])
    captured = capsys.readouterr()
    assert exit_code == 0
    payload = json.loads(captured.out)
    assert payload["dataset"]["summary"]["count"] >= 1
