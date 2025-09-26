import json
from typing import Any, Dict, Sequence

import pytest

from algorithms.python.trade_journal_engine import (
    TradeJournalEngine,
    TradeJournalReport,
    TradeJournalRequest,
    TradeRecord,
)
from algorithms.python.multi_llm import LLMConfig


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


@pytest.fixture()
def journal_request() -> TradeJournalRequest:
    return TradeJournalRequest(
        session_date="2024-03-15",
        session_summary="Choppy London open with one clean momentum burst.",
        objectives=("Respect 1R max loss", "Scale only on momentum break"),
        market_context="DXY bid, indices heavy ahead of CPI.",
        trades=(
            TradeRecord(
                symbol="EURUSD",
                direction="long",
                entry_price=1.0952,
                exit_price=1.0978,
                size=2.5,
                pnl=650.0,
                reward_risk=2.6,
                setup="London momentum continuation",
                grade="A",
                notes="Executed plan, partial at VWAP.",
                tags=("momentum", "news-filter"),
                checklist_misses=("Skipped pre-NFP volatility check",),
            ),
            TradeRecord(
                symbol="GBPUSD",
                direction="short",
                entry_price=1.276,
                exit_price=1.281,
                size=1.5,
                pnl=-450.0,
                reward_risk=-0.9,
                setup="Reversion against DXY strength",
                grade="C",
                notes="Chased late entry into support.",
                tags=("reversion",),
                checklist_misses=("Ignored 5m demand zone",),
            ),
        ),
        risk_events=("CPI release caused spread widening",),
        mindset_notes=("Felt rushed pre-open",),
        metrics={"win_rate": 0.5, "net_pnl": 200.0},
        environment={"platform": "MT5", "desk": "London"},
    )


def _config(client: StubClient, name: str = "stub") -> LLMConfig:
    return LLMConfig(name=name, client=client, temperature=0.2, nucleus_p=0.9, max_tokens=512)


def test_trade_journal_engine_compiles_multi_llm_report(journal_request: TradeJournalRequest) -> None:
    analysis_payload = {
        "summary": "Session execution was disciplined with one deviation on GBPUSD.",
        "highlights": [
            "Position sizing respected risk limits",
            "Position sizing respected risk limits",
            "Patience to wait for London momentum confirmation",
        ],
        "lessons": ["Avoid chasing Cable into structural demand"],
        "mindset_notes": ["Pre-open anxiety eased after first trade"],
        "metrics": {"win_rate": 0.5, "net_pnl": 200.0},
        "callouts": ["Review re-entry criteria before US data"],
    }
    insight_payload = {
        "adjustments": [
            "Rehearse CPI playbook before London open",
            "Rehearse CPI playbook before London open",
        ],
        "next_actions": ["Tag GBPUSD trade for replay", "Update risk checklist"],
        "lessons": ["Execute only when confluence is present"],
        "reflection_prompts": ["What signals confirmed EURUSD continuation?"],
    }
    coach_payload = {
        "prompts": ["How did you reset after the GBPUSD loss?"],
        "affirmations": ["You protected capital by cutting quickly."],
        "mindset": ["Anchor breathing before high-impact news"],
    }

    analysis_client = StubClient([json.dumps(analysis_payload)])
    insight_client = StubClient([json.dumps(insight_payload)])
    coach_client = StubClient([json.dumps(coach_payload)])

    engine = TradeJournalEngine(
        analysis=_config(analysis_client, name="analysis"),
        insight=_config(insight_client, name="insight"),
        coach=_config(coach_client, name="coach"),
        max_trades=5,
    )

    report = engine.generate(journal_request)

    assert isinstance(report, TradeJournalReport)
    assert report.summary == analysis_payload["summary"]
    assert report.performance_highlights == [
        "Position sizing respected risk limits",
        "Patience to wait for London momentum confirmation",
        "Review re-entry criteria before US data",
    ]
    assert "Avoid chasing Cable into structural demand" in report.lessons
    assert "Execute only when confluence is present" in report.lessons
    assert report.next_actions == [
        "Rehearse CPI playbook before London open",
        "Tag GBPUSD trade for replay",
        "Update risk checklist",
    ]
    assert "Felt rushed pre-open" in report.mindset_reflections
    assert "You protected capital by cutting quickly." in report.mindset_reflections
    assert "How did you reset after the GBPUSD loss?" in report.coach_prompts

    assert report.metadata["trade_count"] == 2
    assert report.metadata["analysis_payload"]["metrics"]["net_pnl"] == 200.0
    assert report.metadata["next_actions_count"] == len(report.next_actions)
    assert report.raw_response is not None

    analysis_prompt = analysis_client.calls[0]["prompt"]
    assert "Session date: 2024-03-15" in analysis_prompt
    assert "\"symbol\": \"EURUSD\"" in analysis_prompt
    assert "Risk events" in analysis_prompt

    insight_prompt = insight_client.calls[0]["prompt"]
    assert "execution quality auditor" in insight_prompt.lower()
    assert "Analyst findings" in insight_prompt

    coach_prompt = coach_client.calls[0]["prompt"]
    assert "trading coach" in coach_prompt
    assert "Execution adjustments" in coach_prompt


def test_trade_journal_engine_handles_text_fallbacks(journal_request: TradeJournalRequest) -> None:
    analysis_client = StubClient(["Overall execution showed progress."])
    insight_client = StubClient(["Focus on respecting news windows."])

    engine = TradeJournalEngine(
        analysis=_config(analysis_client, name="analysis"),
        insight=_config(insight_client, name="insight"),
    )

    report = engine.generate(journal_request)

    assert report.summary == "Overall execution showed progress."
    assert report.performance_highlights == []
    assert report.lessons == []
    assert report.next_actions == []
    assert "Overall execution showed progress." == report.metadata["analysis_summary"]
    assert report.coach_prompts == []
