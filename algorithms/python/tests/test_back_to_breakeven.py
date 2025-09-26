import json
from dataclasses import replace
from typing import Any, Dict, Sequence

import pytest

from algorithms.python.back_to_breakeven import (
    AccountSnapshot,
    BackToBreakevenCalculator,
    BreakevenPlan,
    BreakevenRequest,
)
from algorithms.python.multi_llm import LLMConfig


class StubClient:
    def __init__(self, responses: Sequence[str]) -> None:
        self._responses = list(responses)
        self.calls: list[Dict[str, Any]] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self._responses:
            raise RuntimeError("No stub responses available")
        return self._responses.pop(0)


@pytest.fixture()
def account_snapshot() -> AccountSnapshot:
    return AccountSnapshot(
        current_balance=48_000.0,
        target_balance=52_000.0,
        peak_balance=58_000.0,
        risk_per_trade_pct=0.01,
        win_rate=0.55,
        average_rr=1.8,
        max_trades_per_day=4,
        trading_days_per_week=4,
    )


@pytest.fixture()
def breakeven_request(account_snapshot: AccountSnapshot) -> BreakevenRequest:
    return BreakevenRequest(
        account=account_snapshot,
        objectives=("Stabilise PnL", "Rebuild confidence"),
        constraints=("Only trade London/NY overlap",),
        strengths=("Strong macro read",),
        support_channels=("Accountability coach",),
        narrative="Trader came off a volatility spike and wants to recover deliberately.",
        capital_injections=(1_000.0,),
    )


def _config(client: StubClient) -> LLMConfig:
    return LLMConfig(name="stub", client=client, temperature=0.2, nucleus_p=0.9, max_tokens=512)


def test_calculator_blends_multi_llm_outputs(breakeven_request: BreakevenRequest) -> None:
    diagnostics_payload = {
        "phases": [
            {
                "name": "Stabilise",
                "objective": "Cut risk to 0.5R and stop the bleed",
                "target_balance": 50_000,
                "trade_count": 6,
                "risk_per_trade_pct": 0.005,
                "checkpoints": ["Journal daily"],
            },
            {
                "name": "Rebuild edge",
                "objective": "Focus on two highest expectancy setups",
                "target_balance": 51_500,
                "trade_count": 8,
                "risk_per_trade_pct": 0.007,
                "checkpoints": ["Run weekly stats review"],
            },
            {
                "name": "Buffer",
                "objective": "Add +2% buffer before resuming growth",
                "target_balance": 53_000,
                "trade_count": 10,
                "checkpoints": ["Scale only after 3 green weeks"],
            },
        ],
        "risk_adjustments": ["Drop risk to 0.5R until equity stabilises"],
        "execution_focus": ["London open breakout statistics"],
        "mindset": ["Treat breakeven as the new floor"],
        "support_actions": ["Weekly check-in with desk head"],
        "confidence": 0.72,
    }

    playbook_payload = {
        "daily_game_plan": "Start with the global macro brief, run playbook checklist, execute only if confidence ≥7/10.",
        "mindset": ["Scorecards over PnL", "Celebrate process wins"],
        "support_actions": ["Share progress with accountability coach"],
        "execution_focus": ["Document London breakout stats"],
    }

    coach_payload = {
        "mindset": ["Visualise closing the equity gap"],
        "message": "You have already neutralised larger drawdowns—trust the process.",
    }

    diagnostics_client = StubClient([json.dumps(diagnostics_payload)])
    playbook_client = StubClient([json.dumps(playbook_payload)])
    coach_client = StubClient([json.dumps(coach_payload)])

    calculator = BackToBreakevenCalculator(
        diagnostics=_config(diagnostics_client),
        playbook=_config(playbook_client),
        coach=_config(coach_client),
    )

    plan = calculator.generate_plan(breakeven_request)

    assert isinstance(plan, BreakevenPlan)
    assert plan.severity == "moderate"
    assert plan.deficit == pytest.approx(3_000.0)
    assert plan.expected_trades == 12
    assert plan.expected_weeks == pytest.approx(0.75)
    assert plan.daily_game_plan.startswith("Start with the global macro brief")

    mindsets = " ".join(plan.mindset_notes)
    assert "Treat breakeven as the new floor" in mindsets
    assert "Visualise closing the equity gap" in mindsets

    assert any("accountability coach" in action.lower() for action in plan.support_actions)
    assert "Drop risk to 0.5R" in " ".join(plan.risk_adjustments)
    assert any(phase.name == "Rebuild edge" for phase in plan.phases)

    diagnostics_prompt = diagnostics_client.calls[0]["prompt"]
    assert "Deficit to breakeven" in diagnostics_prompt
    assert "Trader came off a volatility spike" in diagnostics_prompt

    playbook_prompt = playbook_client.calls[0]["prompt"]
    assert "Diagnostics phases" in playbook_prompt
    assert "London open breakout statistics" in playbook_prompt

    coach_prompt = coach_client.calls[0]["prompt"]
    assert "performance coach" in coach_prompt.lower()

    assert plan.metadata["metrics"]["using_expectancy_fallback"] is False
    assert plan.raw_response is not None


def test_calculator_handles_negative_expectancy(breakeven_request: BreakevenRequest) -> None:
    request = replace(
        breakeven_request,
        account=replace(
            breakeven_request.account,
            win_rate=0.4,
            average_rr=1.0,
        ),
        capital_injections=(),
    )

    diagnostics_client = StubClient(["{}"])
    playbook_client = StubClient([json.dumps({"daily_game_plan": "Keep risk at minimum and trade two best setups."})])

    calculator = BackToBreakevenCalculator(
        diagnostics=_config(diagnostics_client),
        playbook=_config(playbook_client),
    )

    plan = calculator.generate_plan(request)

    assert plan.metadata["metrics"]["using_expectancy_fallback"] is True
    assert plan.expected_trades > 0
    assert len(plan.phases) == 3
    assert plan.daily_game_plan.startswith("Keep risk at minimum")
