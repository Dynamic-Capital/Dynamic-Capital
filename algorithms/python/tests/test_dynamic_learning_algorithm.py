import json
from typing import Any, Dict, Sequence

import pytest

from algorithms.python.dynamic_learning_algorithm import (
    DynamicLearningEngine,
    LearningAlgorithmReport,
    LearningAlgorithmRequest,
)
from algorithms.python.multi_llm import LLMConfig
from algorithms.python.trade_journal_engine import TradeRecord


class StubClient:
    def __init__(self, responses: Sequence[str]) -> None:
        self.responses = list(responses)
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
        if not self.responses:
            raise RuntimeError("No responses queued")
        return self.responses.pop(0)


def _config(client: StubClient, name: str) -> LLMConfig:
    return LLMConfig(name=name, client=client, temperature=0.3, nucleus_p=0.9, max_tokens=600)


@pytest.fixture()
def learning_request() -> LearningAlgorithmRequest:
    trades = (
        TradeRecord(
            symbol="EURUSD",
            direction="long",
            entry_price=1.0825,
            exit_price=1.0875,
            size=2.0,
            pnl=1000.0,
            reward_risk=2.0,
            setup="Breakout continuation",
            notes="Good timing on CPI drift.",
            tags=("breakout", "macro"),
            checklist_misses=(),
        ),
        TradeRecord(
            symbol="GBPUSD",
            direction="short",
            entry_price=1.265,
            exit_price=1.269,
            size=1.2,
            pnl=-480.0,
            reward_risk=-0.8,
            setup="Fade into prior high",
            notes="Late entry, poor structure.",
            tags=("fade",),
            checklist_misses=("Ignored relative strength",),
        ),
    )
    return LearningAlgorithmRequest(
        session_date="2024-04-02",
        session_theme="CPI follow-through",
        market_overview="Dollar bid while indices consolidate near highs.",
        trade_summary="Captured EURUSD break, gave back on GBP fade.",
        trades=trades,
        objectives=("Stay selective pre-CPI", "Avoid overtrading consolidation"),
        performance_metrics={"net_pnl": 520.0, "win_rate": 0.5},
        psychology_notes=("Felt impatient waiting for data", "Recovered focus after first win"),
        risk_parameters={"daily_max_loss": 750.0, "max_positions": 3},
        environment={"desk": "London", "platform": "MT5"},
        journal_focus=("How to avoid giving back gains", "What worked on EURUSD?"),
        open_questions=("Did the GBP fade align with plan?",),
    )


def test_dynamic_learning_engine_produces_sectioned_outputs(learning_request: LearningAlgorithmRequest) -> None:
    analysis_payload = {
        "summary": "Disciplined execution with one structural lapse on GBPUSD.",
        "analytical_highlights": [
            "EURUSD breakout respected news playbook",
            "GBPUSD fade ignored relative strength signal",
        ],
        "structural_lessons": ["Trust the pre-identified continuation map"],
        "market_drivers": ["CPI surprise kept USD bid"],
        "risk_callouts": ["Cable short consumed 65% of risk budget"],
    }
    trade_payload = {
        "summary": "Reinforce breakout setups and tighten fade criteria.",
        "focus": ["Replay EURUSD trade to codify triggers"],
        "actions": ["Draft fade checklist before London open"],
        "playbook_updates": ["Require aligned RSI structure for Cable fades"],
    }
    market_payload = {
        "summary": "Maintain USD-positive stance while momentum persists.",
        "scenarios": ["Upside continuation if DXY holds above 105.2"],
        "watchlist": ["Monitor EURUSD pullback into 1.0850"],
        "macro_signals": ["Track Fed speakers for narrative shifts"],
    }
    psychology_payload = {
        "summary": "Anchor patience and protect confidence post-loss.",
        "mindset_resets": ["Breathing reset before adding risk"],
        "psychology_focus": ["Celebrate adherence to EURUSD plan"],
        "mental_models": ["Pre-trade visualization of ideal setup"],
    }
    risk_payload = {
        "summary": "Keep capital deployment moderate until volatility stabilises.",
        "guardrails": ["Hard stop at daily max loss of $750"],
        "capital_allocation": ["Size Cable fades at 50% of standard"],
        "risk_actions": ["Audit slippage on CPI fills"],
    }
    journal_payload = {
        "summary": "Solid read on USD strength with quick lesson on Cable discipline.",
        "journal_entry": "Document EURUSD trigger confidence and write fade checklist before next session.",
        "highlights": ["Execution patience paid off"],
        "next_steps": ["Review GBPUSD loss in simulator"],
        "questions": ["What signs would have invalidated the fade sooner?"],
    }

    analysis_client = StubClient([json.dumps(analysis_payload)])
    trade_client = StubClient([json.dumps(trade_payload)])
    market_client = StubClient([json.dumps(market_payload)])
    psychology_client = StubClient([json.dumps(psychology_payload)])
    risk_client = StubClient([json.dumps(risk_payload)])
    journal_client = StubClient([json.dumps(journal_payload)])

    engine = DynamicLearningEngine(
        analysis=_config(analysis_client, "analysis"),
        trade=_config(trade_client, "trade"),
        market=_config(market_client, "market"),
        psychology=_config(psychology_client, "psychology"),
        risk=_config(risk_client, "risk"),
        journal=_config(journal_client, "journal"),
    )

    report = engine.generate(learning_request)

    assert isinstance(report, LearningAlgorithmReport)
    assert report.trade_analysis_output[0] == analysis_payload["summary"]
    assert "Reinforce breakout setups" in " ".join(report.trade_output)
    assert "USD-positive stance" in " ".join(report.market_output)
    assert "Anchor patience" in " ".join(report.trade_psychology_output)
    assert "Hard stop at daily max loss of $750" in report.risk_and_money_management_output
    assert "Document EURUSD trigger confidence" in report.trade_journal_output
    assert report.metadata["trade_count"] == 2
    assert report.metadata["analysis_payload"]["summary"].startswith("Disciplined execution")
    assert "Trade architect focus:" in journal_client.calls[0]["prompt"]
    assert "Journal focus prompts" in journal_client.calls[0]["prompt"]


def test_dynamic_learning_engine_handles_missing_journal(learning_request: LearningAlgorithmRequest) -> None:
    analysis_client = StubClient(["Execution improving overall."])
    trade_client = StubClient([json.dumps({"focus": ["Track emotional triggers"], "actions": ["Plan walking breaks"]})])
    market_client = StubClient(["Watch USD crosses for continuation."])
    psychology_client = StubClient([json.dumps({"summary": "Reset after wins and losses."})])
    risk_client = StubClient(["Cut size to half after first drawdown."])

    engine = DynamicLearningEngine(
        analysis=_config(analysis_client, "analysis"),
        trade=_config(trade_client, "trade"),
        market=_config(market_client, "market"),
        psychology=_config(psychology_client, "psychology"),
        risk=_config(risk_client, "risk"),
    )

    report = engine.generate(learning_request)

    assert "Trade focus:" in report.trade_journal_output
    assert "Risk guardrails:" in report.trade_journal_output
    assert report.raw_response is not None
    assert report.metadata["journal_text_preview"].startswith("Execution improving overall")
    assert len(analysis_client.calls) == 1
