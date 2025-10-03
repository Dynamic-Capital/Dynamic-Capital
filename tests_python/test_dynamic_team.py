from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_team import (  # noqa: E402  - path mutation for test isolation
    DynamicTeamAgent,
    LLMConfig,
    TEAM_PLAYBOOKS,
    TeamOperationsLLMPlanner,
    build_team_playbooks,
    build_team_sync,
    get_team_playbook,
    list_team_agents,
    plan_team_alignment,
    synchronise_team,
)


def test_get_team_playbook_returns_expected_role() -> None:
    playbook = get_team_playbook("Marketing Strategist")
    assert playbook.name == "Marketing Strategist"
    assert playbook.objectives[0].startswith("Align")


def test_list_team_agents_respects_optional_flag() -> None:
    all_agents = list_team_agents()
    core_agents = list_team_agents(include_optional=False)

    assert "Growth Hacker" in all_agents
    assert "Growth Hacker" not in core_agents
    assert "Quality Assurance" in all_agents
    assert "Quality Assurance" not in core_agents
    assert "General Development" in all_agents
    assert "General Development" not in core_agents

    strategist_result = all_agents["Marketing Strategist"].run({"focus": ["Launch"]})
    assert strategist_result.focus == ("Launch",)
    assert strategist_result.role == "Marketing Strategist"


def test_synchronise_team_filters_focus() -> None:
    result = synchronise_team(
        focus=["Marketing Strategist", "Community Manager"],
        context={"initiative": "Product Launch"},
    )

    assert set(result.playbooks) == {"Marketing Strategist", "Community Manager"}
    assert result.context["initiative"] == "Product Launch"
    assert result.focus == ("Marketing Strategist", "Community Manager")


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


def test_plan_team_alignment_uses_default_playbooks() -> None:
    strategy_response = """
    {
      "summary": "Coordinate marketing and community around launch readiness.",
      "priorities": ["Launch readiness"],
      "dependencies": ["Marketing Strategist ↔ Community Manager"],
      "next_actions": ["Run launch huddle"]
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
    report = plan_team_alignment(
        planner,
        focus=["Marketing Strategist", "Community Manager"],
        context={"initiative": "Launch"},
    )

    assert report.summary == "Coordinate marketing and community around launch readiness."
    assert "Launch readiness" in report.priorities
    assert "Marketing Strategist ↔ Community Manager" in report.dependencies
    assert report.metadata["context"]["initiative"] == "Launch"


def test_build_team_playbooks_matches_constant() -> None:
    playbooks = build_team_playbooks()
    assert set(playbooks) == set(TEAM_PLAYBOOKS)
    assert isinstance(list(TEAM_PLAYBOOKS.values())[0].workflow, tuple)


def test_dynamic_team_agent_plan_returns_playbook() -> None:
    playbook = get_team_playbook("Community Manager")
    agent = DynamicTeamAgent(playbook)
    assert agent.plan() is playbook


def test_build_team_playbooks_reuses_catalogue_instances() -> None:
    first = build_team_playbooks()
    second = build_team_playbooks()

    role = "Marketing Strategist"
    assert first[role] is second[role]


def test_list_team_agents_returns_cached_agent_instances() -> None:
    first = list_team_agents()
    second = list_team_agents()

    assert first["Marketing Strategist"] is second["Marketing Strategist"]


def test_build_team_sync_returns_cached_algorithm() -> None:
    assert build_team_sync() is build_team_sync()
