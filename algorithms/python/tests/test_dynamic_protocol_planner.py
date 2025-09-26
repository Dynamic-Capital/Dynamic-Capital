import json
from typing import Any, Dict, Sequence

import pytest

from algorithms.python.dynamic_protocol_planner import (
    CATEGORY_KEYS,
    DynamicProtocolPlanner,
    HORIZON_KEYS,
    ProtocolDraft,
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


def _config(client: StubClient) -> LLMConfig:
    return LLMConfig(name="stub", client=client, temperature=0.2, nucleus_p=0.9, max_tokens=512)


def test_planner_aggregates_multiple_models() -> None:
    architect_payload = {
        "protocol": {
            "Yearly": {
                "Setting Goals": ["Codify annual vision"],
                "Objectives": ["Build automation"],
                "Daily Tasks": ["Refresh dashboards"],
            },
            "monthly": {
                "trade plan": ["Document A setups"],
                "risk & money management": ["Cap loss at 6%"],
                "Review": ["Publish scorecard"],
            },
        }
    }

    risk_payload = {
        "risk_overrides": {
            "risk_and_money_management": {"monthly": ["Tighten stop variance"]},
            "review": {"weekly": ["Audit compliance logs"]},
        }
    }

    psychology_payload = {
        "psychology": {
            "trading_psychology": {"weekly": ["Run mindset retro"]},
            "daily_tasks": {"daily": ["Log sentiment"], "Monthly": ["Schedule rest days"]},
        }
    }

    review_payload = {
        "audit": {
            "review": {"daily": ["Micro closeout checklist"]},
            "trade_journaling": {"weekly": ["Tag trades by structure"]},
        }
    }

    architect_client = StubClient([json.dumps(architect_payload)])
    risk_client = StubClient([json.dumps(risk_payload)])
    psychology_client = StubClient([json.dumps(psychology_payload)])
    review_client = StubClient([json.dumps(review_payload)])

    planner = DynamicProtocolPlanner(
        architect=_config(architect_client),
        risk=_config(risk_client),
        psychology=_config(psychology_client),
        review=_config(review_client),
    )

    draft = planner.generate_protocol(context={"desk": "FX", "focus": "structure"})

    assert isinstance(draft, ProtocolDraft)
    assert set(draft.plan.keys()) == set(HORIZON_KEYS)
    assert any("Codify annual vision" in entry for entry in draft.plan["yearly"]["setting_goals"])
    assert "Tighten stop variance" in draft.plan["monthly"]["risk_and_money_management"]
    assert "Audit compliance logs" in draft.plan["weekly"]["review"]
    assert "Log sentiment" in draft.plan["daily"]["daily_tasks"]
    assert "Schedule rest days" in draft.plan["monthly"]["daily_tasks"]
    assert "Tag trades by structure" in draft.plan["weekly"]["trade_journaling"]
    assert len(draft.runs) == 4
    assert "Design an integrated trading protocol" in architect_client.calls[0]["prompt"]
    assert "risk and capital management" in risk_client.calls[0]["prompt"].lower()
    assert "psychology specialist" in psychology_client.calls[0]["prompt"]
    assert "audit model" in review_client.calls[0]["prompt"]


def test_planner_handles_textual_fallbacks() -> None:
    architect_client = StubClient(["Narrative only response"])
    planner = DynamicProtocolPlanner(architect=_config(architect_client))

    draft = planner.generate_protocol()

    for horizon in HORIZON_KEYS:
        for category in CATEGORY_KEYS:
            assert draft.plan[horizon][category] == []
    assert len(draft.runs) == 1


def test_to_dict_excludes_empty_categories() -> None:
    architect_payload = {"protocol": {"yearly": {"objectives": ["Ship tooling"]}}}
    architect_client = StubClient([json.dumps(architect_payload)])
    planner = DynamicProtocolPlanner(architect=_config(architect_client))

    draft = planner.generate_protocol(context={"team": "alpha"})
    serialised = draft.to_dict()

    assert "yearly" in serialised
    assert "objectives" in serialised["yearly"]
    assert "weekly" not in serialised
    assert serialised["annotations"]["horizons"] == HORIZON_KEYS
    assert serialised["annotations"]["categories"] == CATEGORY_KEYS

