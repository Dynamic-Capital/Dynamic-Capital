"""Tests for the dynamic validator module."""

from __future__ import annotations

from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_validator import (
    DynamicValidator,
    ValidationContext,
    ValidationRule,
)


def require_name(payload: dict[str, object], context: ValidationContext) -> tuple[bool, str]:
    value = payload.get("name")
    if not value or not str(value).strip():
        return False, "name is required"
    return True, ""


def positive_amount(payload: dict[str, object], context: ValidationContext) -> tuple[bool, str, dict[str, float]]:
    amount = float(payload.get("amount", 0))
    if amount <= 0:
        return False, "amount must be positive", {"observed_amount": amount}
    return True, "", {"observed_amount": amount}


def has_amount(payload: dict[str, object], context: ValidationContext) -> bool:
    return "amount" in payload


def test_validator_normalises_rules() -> None:
    validator = DynamicValidator(
        [
            {
                "name": "  Critical Presence  ",
                "description": "Ensure title present",
                "check": require_name,
                "severity": "0.8",
                "weight": "2",
                "tags": ["Structure", " QUALITY  "],
                "metadata": {"category": "structure"},
            }
        ],
        history_limit=3,
    )

    rule = validator.get_rule("critical presence")

    assert rule.name == "critical-presence"
    assert rule.description == "Ensure title present"
    assert rule.severity == pytest.approx(0.8)
    assert rule.weight == pytest.approx(2.0)
    assert rule.tags == ("structure", "quality")
    assert rule.metadata == {"category": "structure"}
    assert rule.message == "Ensure title present"


def test_validator_evaluates_rules_and_history() -> None:
    validator = DynamicValidator(
        [
            {
                "name": "critical presence",
                "description": "Ensure name is provided",
                "check": require_name,
                "severity": 0.7,
                "weight": 2.0,
                "tags": ("critical",),
                "metadata": {"category": "structure"},
            },
            ValidationRule(
                name="positive-amount",
                description="Amounts must be positive",
                check=positive_amount,
                severity=0.6,
                weight=1.0,
                tags=("advisory",),
                guard=has_amount,
                metadata={"category": "finance"},
            ),
        ],
        history_limit=2,
    )

    failing = validator.evaluate(
        {"name": " ", "amount": -5},
        ValidationContext(
            mission="catalog", tolerance=1.0, focus_tags=("critical",)
        ),
    )

    assert failing.passed is False
    assert failing.evaluated_rules == 2
    assert failing.failed_rules == 2
    assert failing.score == pytest.approx(0.0)

    first_issue = failing.issues[0]
    assert first_issue.rule == "critical-presence"
    assert first_issue.message == "name is required"
    assert first_issue.impact == pytest.approx(1.82, rel=1e-3)
    assert first_issue.metadata["category"] == "structure"

    second_issue = failing.issues[1]
    assert second_issue.rule == "positive-amount"
    assert second_issue.metadata["observed_amount"] == pytest.approx(-5.0)

    assert len(validator.history) == 1

    mitigated = validator.evaluate(
        {"name": "Alpha", "amount": -5},
        ValidationContext(
            mission="update",
            tolerance=0.2,
            overrides={"positive-amount": 0.5},
            suppress_tags=("advisory",),
        ),
    )

    assert mitigated.passed is True
    assert mitigated.failed_rules == 1
    assert mitigated.score == pytest.approx(8 / 9, rel=1e-6)

    mitigated_issue = mitigated.issues[0]
    assert mitigated_issue.rule == "positive-amount"
    assert mitigated_issue.impact == pytest.approx(0.15, rel=1e-2)
    assert mitigated_issue.weighted_penalty == pytest.approx(0.25, rel=1e-2)
    assert mitigated_issue.metadata["observed_amount"] == pytest.approx(-5.0)

    assert len(validator.history) == 2
    assert validator.history[0].failed_rules == 2
    assert validator.history[-1].failed_rules == 1

    cleared = validator.evaluate(
        {"name": "Beta", "amount": 10},
        ValidationContext(mission="update", tolerance=0.2),
    )

    assert cleared.passed is True
    assert cleared.score == pytest.approx(1.0)
    assert cleared.failed_rules == 0
    assert len(validator.history) == 2
    assert validator.history[0].failed_rules == 1
    assert validator.history[-1].passed is True
