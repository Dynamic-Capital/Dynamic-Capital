from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.human_resources_playbooks import build_human_resources_playbooks
from algorithms.python.desk_sync import TeamRoleSyncAlgorithm


EXPECTED_ROLES = (
    "People Operations",
    "Talent Acquisition",
    "Total Rewards",
    "People Development",
)


def test_builder_returns_all_human_resources_roles():
    playbooks = build_human_resources_playbooks()

    for role in EXPECTED_ROLES:
        assert role in playbooks, f"missing playbook for {role}"

    for playbook in playbooks.values():
        assert playbook.objectives, f"{playbook.name} objectives should not be empty"
        assert playbook.workflow, f"{playbook.name} workflow should not be empty"
        assert playbook.outputs, f"{playbook.name} outputs should not be empty"


def test_builder_integrates_with_team_role_sync_algorithm():
    playbooks = build_human_resources_playbooks()
    algorithm = TeamRoleSyncAlgorithm(playbooks.values())

    result = algorithm.synchronise()
    assert result.context["role_count"] == len(playbooks)

    focus_result = algorithm.synchronise(focus=["Total Rewards"])
    assert list(focus_result.playbooks.keys()) == ["Total Rewards"]
    assert focus_result.context["role_count"] == 1
