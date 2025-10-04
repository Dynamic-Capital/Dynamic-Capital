"""Unit tests for the Dynamic Calculation Engine."""

from __future__ import annotations

import math

import pytest

from dynamic_calculation_engine import (
    CalculationMetric,
    CalculationVariable,
    DynamicCalculationEngine,
)


def test_dynamic_calculation_engine_basic_metric() -> None:
    engine = DynamicCalculationEngine(
        variables=[
            CalculationVariable(key="Revenue", value=125_000, weight=2.0),
            CalculationVariable(key="cost", value=58_000, weight=1.5, confidence=0.9),
        ]
    )
    engine.register_metric(
        CalculationMetric(
            key="margin",
            expression="(revenue - cost) / revenue",
            inputs=("revenue", "cost"),
        )
    )

    result = engine.evaluate("margin")
    assert pytest.approx(result.value, rel=1e-6) == (125_000 - 58_000) / 125_000
    assert result.key == "margin"
    assert set(result.inputs) == {"revenue", "cost"}
    expected_confidence = ((2.0 * 1.0) + (1.5 * 0.9)) / (2.0 + 1.5)
    assert pytest.approx(result.confidence, rel=1e-9) == expected_confidence


def test_dynamic_calculation_engine_dependencies_and_bounds() -> None:
    engine = DynamicCalculationEngine(
        variables=[
            {"key": "effort", "value": 42.0, "confidence": 0.5, "weight": 1.5},
            {"key": "impact", "value": 73.0, "confidence": 0.9, "weight": 2.5},
            {"key": "risk_modifier", "value": 0.35, "confidence": 0.8, "weight": 1.0},
        ]
    )
    engine.register_metric(
        {
            "key": "effectiveness",
            "expression": "(impact - effort) / (impact + effort)",
            "inputs": ["impact", "effort"],
        }
    )
    engine.register_metric(
        CalculationMetric(
            key="priority",
            expression="max(0.0, 1 - risk_modifier) * effectiveness",
            inputs=("risk_modifier",),
            dependencies=("effectiveness",),
            lower_bound=0.0,
            upper_bound=1.0,
        )
    )

    result = engine.evaluate("priority")
    assert 0.0 <= result.value <= 1.0
    assert "effectiveness" in result.dependencies
    assert result.dependencies["effectiveness"] == pytest.approx(
        engine.evaluate("effectiveness").value, rel=1e-9
    )
    base_confidence = engine.evaluate("effectiveness").confidence
    expected_modifier_confidence = 1.0 * 0.8 / 1.0
    assert pytest.approx(result.confidence, rel=1e-9) == pytest.approx(
        min(base_confidence, expected_modifier_confidence),
        rel=1e-9,
    )


def test_dynamic_calculation_engine_overrides_and_validation() -> None:
    engine = DynamicCalculationEngine(
        variables=[{"key": "baseline", "value": 10.0}],
        constants={"golden": math.sqrt(5) + 1},
    )
    engine.register_metric(
        {
            "key": "augmented",
            "expression": "(baseline + delta) / golden",
            "inputs": ["baseline", "delta"],
        }
    )

    with pytest.raises(KeyError):
        engine.evaluate("augmented")

    result = engine.evaluate("augmented", overrides={"delta": 5.0})
    assert pytest.approx(result.value, rel=1e-9) == (10.0 + 5.0) / (math.sqrt(5) + 1)

    engine.register_metric(
        {
            "key": "invalid",
            "expression": "__import__('os').name",
        }
    )
    with pytest.raises(ValueError):
        engine.evaluate("invalid")
