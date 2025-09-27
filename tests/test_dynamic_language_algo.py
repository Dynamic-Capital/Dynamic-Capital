"""Tests for the DynamicLanguageAlgo localisation heuristics."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_algo import DynamicLanguageAlgo  # noqa: E402


@pytest.fixture()
def algo() -> DynamicLanguageAlgo:
    return DynamicLanguageAlgo()


def test_evaluate_assigns_statuses_and_priorities(algo: DynamicLanguageAlgo) -> None:
    telemetry = {
        "en": {
            "coverage": 0.93,
            "qa_score": 0.91,
            "open_support_tickets": 5,
            "active_users": 1_000,
        },
        "es": {
            "translated_strings": 750,
            "total_strings": 1_000,
            "qa_score": 0.74,
            "open_support_tickets": 30,
            "active_users": 800,
        },
        "jp": {
            "coverage": 0.42,
            "qa_score": 0.51,
            "open_support_tickets": 40,
            "active_users": 200,
            "regulatory_blocker": True,
            "regulatory_notes": "Awaiting FSA clearance",
        },
    }

    evaluation = algo.evaluate(telemetry)

    languages = {entry["language"]: entry for entry in evaluation["languages"]}

    assert languages["EN"]["status"] == "READY"
    assert languages["ES"]["status"] == "IN_PROGRESS"
    assert languages["JP"]["status"] == "BLOCKED"
    assert evaluation["priority_order"][:2] == ["JP", "ES"]
    assert any("FSA" in note for note in languages["JP"]["notes"])


def test_evaluate_handles_missing_totals(algo: DynamicLanguageAlgo) -> None:
    telemetry = {
        "fr": {
            "translated_strings": 120,
            "total_strings": None,
            "qa_score": "0.81",
            "open_support_tickets": "12",
            "active_users": 400,
        }
    }

    evaluation = algo.evaluate(telemetry)
    fr = evaluation["languages"][0]

    assert fr["language"] == "FR"
    assert fr["coverage"] == pytest.approx(0.0)
    assert fr["status"] == "BACKLOG"
    assert any("Coverage" in note for note in fr["notes"])
    assert evaluation["overall_status"] == "DISCOVERY"


def test_build_rollout_plan_batches_by_capacity(algo: DynamicLanguageAlgo) -> None:
    telemetry = {
        "en": {
            "coverage": 0.95,
            "qa_score": 0.9,
            "open_support_tickets": 3,
            "active_users": 2_000,
        },
        "es": {
            "coverage": 0.75,
            "qa_score": 0.78,
            "open_support_tickets": 28,
            "active_users": 900,
        },
        "jp": {
            "coverage": 0.4,
            "qa_score": 0.5,
            "open_support_tickets": 36,
            "active_users": 220,
            "regulatory_blocker": True,
        },
    }

    evaluation = algo.evaluate(telemetry)
    plan = algo.build_rollout_plan(evaluation, sprint_capacity=2)

    assert plan[0]["languages"] == ["JP", "ES"]
    assert "regulatory" in plan[0]["focus"].lower()
    assert plan[1]["languages"] == ["EN"]
    assert plan[1]["focus"].startswith("Maintain")


def test_build_rollout_plan_empty_input(algo: DynamicLanguageAlgo) -> None:
    assert algo.build_rollout_plan({"languages": []}, sprint_capacity=2) == []


def test_build_rollout_plan_respects_priority_hint(algo: DynamicLanguageAlgo) -> None:
    evaluation = {
        "languages": [
            {
                "language": "de",
                "priority": 0.2,
                "coverage": 0.6,
                "quality": 0.82,
                "support_pressure": 0.3,
            },
            {
                "language": "es",
                "priority": 0.7,
                "coverage": 0.75,
                "quality": 0.78,
                "support_pressure": 0.45,
            },
            {
                "language": "fr",
                "priority": 0.15,
                "coverage": 0.55,
                "quality": 0.81,
                "support_pressure": 0.25,
            },
        ],
        "priority_order": ["fr"],
    }

    plan = algo.build_rollout_plan(evaluation, sprint_capacity=2)

    assert plan[0]["languages"] == ["FR", "ES"]
    assert plan[1]["languages"] == ["DE"]

