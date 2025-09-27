from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from algorithms.python.multi_llm import LLMConfig
from algorithms.python.team_operations import (
    TEAM_OPERATIONS_PLAYBOOKS,
    TeamOperationsLLMPlanner,
    build_team_operations_playbooks,
    build_team_operations_sync_algorithm,
)


def test_build_team_operations_playbooks_includes_expected_roles() -> None:
    playbooks = build_team_operations_playbooks()
    expected = {
        "Marketing Strategist",
        "Content Creator / Copywriter",
        "Front-End Developer",
        "Project Manager",
        "Growth Hacker",
    }
    assert expected.issubset(playbooks)
    assert playbooks["Marketing Strategist"].workflow[0].startswith(
        "Pull the latest KPI dashboard"
    )


def test_build_team_operations_playbooks_can_exclude_optional_roles() -> None:
    playbooks = build_team_operations_playbooks(include_optional=False)
    assert "Growth Hacker" not in playbooks
    assert "Marketing Strategist" in playbooks


def test_team_operations_sync_algorithm_filters_focus() -> None:
    sync = build_team_operations_sync_algorithm()
    result = sync.synchronise(focus=["Community Manager", "Moderator"])
    assert set(result.playbooks) == {"Community Manager", "Moderator"}
    assert result.context["role_count"] == 2


@dataclass
class _StubClient:
    responses: Iterable[str]

    def __post_init__(self) -> None:
        self._iterator = iter(self.responses)

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:  # noqa: D401 - protocol stub
        try:
            return next(self._iterator)
        except StopIteration:  # pragma: no cover - defensive guard
            raise AssertionError("LLM client invoked more times than expected") from None


def test_team_operations_planner_coalesces_multi_llm_outputs() -> None:
    strategy_response = """
    {
      "summary": "Focus marketing and community on launch readiness.",
      "priorities": [
        "Launch readiness",
        "Community sentiment",
        "Marketing analytics refresh"
      ],
      "dependencies": ["Marketing Strategist ↔ Community Manager"],
      "risks": ["Launch collateral backlog"],
      "next_actions": ["Run launch huddle"]
    }
    """
    operations_response = """
    {
      "next_actions": ["Publish playbook updates", "Confirm escalation rota"],
      "handoffs": ["Community Manager ↔ Customer Support Specialist"],
      "dependencies": ["Updated FAQ packets"]
    }
    """
    risk_response = """
    {
      "risks": ["Support staffing shortage"],
      "mitigations": ["Activate on-call backup"],
      "watchlist": ["Ticket backlog"]
    }
    """

    client = _StubClient((strategy_response, operations_response, risk_response))
    strategy = LLMConfig(
        name="strategy",
        client=client,
        temperature=0.1,
        nucleus_p=1.0,
        max_tokens=1024,
    )
    operations = LLMConfig(
        name="operations",
        client=client,
        temperature=0.1,
        nucleus_p=1.0,
        max_tokens=1024,
    )
    risk = LLMConfig(
        name="risk",
        client=client,
        temperature=0.1,
        nucleus_p=1.0,
        max_tokens=1024,
    )

    planner = TeamOperationsLLMPlanner(
        strategy=strategy,
        operations=operations,
        risk=risk,
    )

    playbooks = {
        name: TEAM_OPERATIONS_PLAYBOOKS[name]
        for name in ("Marketing Strategist", "Community Manager", "Customer Support Specialist")
    }

    report = planner.generate(
        playbooks,
        focus=["Marketing Strategist", "Community Manager"],
        context={"initiative": "Product launch"},
    )

    assert report.summary == "Focus marketing and community on launch readiness."
    assert "Launch readiness" in report.priorities
    assert "Community Manager ↔ Customer Support Specialist" in report.dependencies
    assert "Support staffing shortage" in report.risks
    assert "Activate on-call backup" in report.next_actions
    assert report.metadata["context"]["initiative"] == "Product launch"


def test_team_operations_planner_handles_single_llm() -> None:
    strategy_response = """
    {
      "priorities": ["Data integrity"],
      "dependencies": ["Data Analyst ↔ Legal Advisor"],
      "next_actions": ["Schedule compliance review"]
    }
    """
    client = _StubClient((strategy_response,))

    strategy = LLMConfig(
        name="strategy",
        client=client,
        temperature=0.0,
        nucleus_p=1.0,
        max_tokens=256,
    )

    planner = TeamOperationsLLMPlanner(strategy=strategy)

    playbooks = {
        name: TEAM_OPERATIONS_PLAYBOOKS[name]
        for name in ("Data Analyst", "Legal Advisor")
    }

    report = planner.generate(playbooks)
    assert report.summary.startswith("Priorities:")
    assert "Data integrity" in report.priorities
    assert "Data Analyst ↔ Legal Advisor" in report.dependencies
    assert report.risks == []
