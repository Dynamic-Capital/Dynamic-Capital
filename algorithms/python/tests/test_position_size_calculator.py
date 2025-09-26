"""Tests for the dynamic position size calculator and LLM orchestration."""

from __future__ import annotations

import math
from dataclasses import replace
from typing import Any, Dict, Sequence

import pytest

from algorithms.python.multi_llm import LLMConfig
from algorithms.python.position_size_calculator import (
    DynamicPositionSizeCalculator,
    PositionSizeLLMOrchestrator,
    PositionSizingRequest,
)


class StubClient:
    """Simple completion stub returning pre-configured responses."""

    def __init__(self, responses: Sequence[str]) -> None:
        self._responses = list(responses)
        self.calls: list[Dict[str, Any]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self._responses:
            return "{}"
        return self._responses.pop(0)


@pytest.fixture
def base_request() -> PositionSizingRequest:
    return PositionSizingRequest(
        symbol="EURUSD",
        account_balance=100_000,
        risk_per_trade_pct=1.0,
        entry_price=1.2500,
        stop_price=1.2300,
        contract_size=100_000,
        volatility_percent=55.0,
        atr=1.5,
        atr_reference=1.0,
        max_leverage=2.0,
        risk_overrides={"min_units": 0.2, "max_units": 0.8, "min_notional": 15_000.0},
        notes=("Macro event risk elevated",),
    )


def test_calculator_applies_volatility_and_bounds(base_request: PositionSizingRequest) -> None:
    calculator = DynamicPositionSizeCalculator(min_units=0.1, max_units=1.0)

    result = calculator.calculate(base_request)

    assert math.isclose(result.base_units, 0.5, rel_tol=1e-6)
    assert result.adjusted_units < result.base_units
    assert math.isclose(result.final_units, result.adjusted_units, rel_tol=1e-6)
    assert result.adjustments["volatility_multiplier"] > 1.0
    assert result.adjustments["atr_multiplier"] > 1.0
    assert math.isclose(result.metadata["unit_value"], 125_000.0, rel_tol=1e-6)
    assert math.isclose(result.metadata["max_notional"], 200_000.0, rel_tol=1e-6)
    assert result.risk_multiple < 1.0
    assert "bounds_applied" not in result.adjustments


def test_orchestrator_aggregates_llm_signals(base_request: PositionSizingRequest) -> None:
    calculator = DynamicPositionSizeCalculator(min_units=0.1, max_units=1.0)

    client_one = StubClient(
        [
            """
            {"sizing_multiplier": 0.8, "insights": ["Trim due to macro risk"],
             "risk_controls": ["Use staggered entries"],
             "position_adjustments": {"macro": -0.1}, "confidence": 0.7}
            """
        ]
    )
    client_two = StubClient(
        [
            """
            {"sizing_multiplier": 1.1, "mitigations": ["Hedge with puts"],
             "position_adjustments": {"macro": 0.05, "leverage": -0.2},
             "confidence": 0.5}
            """
        ]
    )

    orchestrator = PositionSizeLLMOrchestrator(
        calculator,
        models=(
            LLMConfig(name="grok", client=client_one, temperature=0.2, nucleus_p=0.9, max_tokens=512),
            LLMConfig(name="deepseek", client=client_two, temperature=0.2, nucleus_p=0.9, max_tokens=512),
        ),
    )

    plan = orchestrator.build_plan(base_request)

    expected_multiplier = (0.8 + 1.1) / 2
    assert math.isclose(plan.llm_adjustments["mean_multiplier"], expected_multiplier, rel_tol=1e-6)
    assert math.isclose(
        plan.recommended_units,
        plan.pre_llm_units * expected_multiplier,
        rel_tol=1e-6,
    )
    assert math.isclose(plan.confidence or 0.0, 0.6, rel_tol=1e-6)
    assert "Trim due to macro risk" in plan.insights
    assert "Use staggered entries" in plan.mitigations
    assert "Hedge with puts" in plan.mitigations
    adjustments = plan.llm_adjustments["position_adjustments"]
    assert math.isclose(adjustments["macro"], (-0.1 + 0.05) / 2, rel_tol=1e-6)
    assert math.isclose(adjustments["leverage"], -0.2, rel_tol=1e-6)
    assert len(plan.metadata["llm_models"]) == 2
    assert plan.raw_responses is not None


def test_orchestrator_handles_empty_models(base_request: PositionSizingRequest) -> None:
    calculator = DynamicPositionSizeCalculator(min_units=0.1, max_units=1.0)
    orchestrator = PositionSizeLLMOrchestrator(calculator, models=())

    plan = orchestrator.build_plan(base_request)

    assert math.isclose(plan.recommended_units, plan.pre_llm_units, rel_tol=1e-6)
    assert plan.llm_adjustments["mean_multiplier"] == 1.0
    assert plan.confidence is None
    assert plan.insights == []
    assert plan.mitigations == []
    assert plan.raw_responses is None


def test_calculator_validates_stop_distance(base_request: PositionSizingRequest) -> None:
    calculator = DynamicPositionSizeCalculator()
    invalid_request = replace(base_request, stop_price=base_request.entry_price)
    with pytest.raises(ValueError):
        calculator.calculate(invalid_request)
