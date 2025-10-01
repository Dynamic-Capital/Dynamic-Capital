"""Tests for the dynamic hierarchy agent utilities."""
from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - import side effect
    sys.path.insert(0, str(PROJECT_ROOT))

from dynamic_hierarchy import (  # noqa: E402 - imported after sys.path mutation
    HierarchyAgent,
    HierarchyBuilder,
    HierarchyHelperBot,
)


def test_builder_emits_blueprints_for_local_tree() -> None:
    builder = HierarchyBuilder()
    builder.add_node(key="root", title="Root")
    builder.add_node(key="child", title="Child", parent="root")

    blueprints = builder.to_blueprints()

    assert len(blueprints) == 1
    assert blueprints[0].key == "root"
    assert blueprints[0].children[0].key == "child"


def test_agent_commit_builds_and_extends_hierarchy() -> None:
    agent = HierarchyAgent()
    agent.stage_node(key="root", title="Root")
    agent.stage_node(key="child", title="Child", parent="root", tags=("Alpha",))

    hierarchy = agent.commit()

    assert hierarchy.get("root") is not None
    assert hierarchy.get("child") is not None
    assert hierarchy.get("child").tags == ("alpha",)

    agent.stage_node(key="leaf", title="Leaf", parent="child", description="Leaf node")
    hierarchy = agent.commit()

    assert hierarchy.get("leaf") is not None
    assert hierarchy.ancestors("leaf")[0].key == "child"


def test_helper_bot_produces_outline_and_description() -> None:
    agent = HierarchyAgent()
    agent.stage_node(key="root", title="Root")
    agent.stage_node(key="child", title="Child", parent="root")
    agent.stage_node(key="leaf", title="Leaf", parent="child", description="Leaf node")
    agent.commit()

    helper = HierarchyHelperBot(agent=agent)
    description = helper.describe_node("leaf")
    outline = helper.outline()
    branches = helper.list_branches()

    assert "Leaf" in description
    assert "Root > Child > Leaf" in description
    assert "Leaf node" in description

    assert "- Root" in outline
    assert "- Leaf" in outline

    assert branches["root"] == ("child", "leaf")
