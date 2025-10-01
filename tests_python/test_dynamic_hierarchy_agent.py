"""Tests for the dynamic hierarchy agent utilities."""
from __future__ import annotations

from pathlib import Path
import sys

import pytest

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


def test_agent_commit_handles_out_of_order_staging() -> None:
    agent = HierarchyAgent()
    agent.stage_node(key="child", title="Child", parent="root")
    agent.stage_node(key="root", title="Root")

    hierarchy = agent.commit()

    assert hierarchy.get("root") is not None
    assert hierarchy.get("child") is not None
    assert hierarchy.children("root")[0].key == "child"


def test_builder_reorders_nodes_to_respect_dependencies() -> None:
    builder = HierarchyBuilder()
    builder.add_node(key="child", title="Child", parent="root")
    builder.add_node(key="root", title="Root")

    ordered_keys = [node["key"] for node in builder.iter_pending_nodes()]
    assert ordered_keys == ["root", "child"]

    blueprints = builder.to_blueprints()
    assert blueprints[0].key == "root"
    assert blueprints[0].children[0].key == "child"


def test_builder_order_flow_reports_dependency_sequence() -> None:
    builder = HierarchyBuilder()
    builder.add_node(key="leaf", title="Leaf", parent="child")
    builder.add_node(key="child", title="Child", parent="root")
    builder.add_node(key="root", title="Root")

    flow = builder.order_flow()

    assert [entry["key"] for entry in flow] == ["root", "child", "leaf"]
    assert flow[0]["parent"] is None
    assert flow[1]["parent"] == "root"
    assert flow[2]["parent"] == "child"


def test_builder_validates_external_parents() -> None:
    builder = HierarchyBuilder()
    builder.add_node(key="orphan", title="Orphan", parent="missing")

    with pytest.raises(KeyError):
        builder.to_blueprints()

    agent = HierarchyAgent()
    agent.builder = builder
    agent.builder.engine = agent.engine

    with pytest.raises(KeyError):
        agent.commit()


def test_helper_bot_summarize_order_flow_reports_staged_nodes() -> None:
    agent = HierarchyAgent()
    agent.stage_node(key="root", title="Root")
    agent.stage_node(key="child", title="Child", parent="root")

    summary = agent.helper().summarize_order_flow()

    assert "Staged order flow:" in summary
    assert "1. Root (root) -> parent: <root>" in summary
    assert "2. Child (child) -> parent: root" in summary
