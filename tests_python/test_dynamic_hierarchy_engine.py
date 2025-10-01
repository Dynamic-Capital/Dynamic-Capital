"""Tests for the dynamic hierarchy engine."""
from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - import side effect
    sys.path.insert(0, str(PROJECT_ROOT))

from dynamic_hierarchy import (  # noqa: E402 - imported after sys.path mutation
    DynamicHierarchy,
    HierarchyBlueprint,
    HierarchyEngine,
)


def test_engine_build_creates_hierarchy_from_blueprint() -> None:
    engine = HierarchyEngine()
    root_blueprint = HierarchyBlueprint(
        key="root",
        title="Root",
        children=(
            HierarchyBlueprint(key="alpha", title="Alpha"),
            HierarchyBlueprint(
                key="beta",
                title="Beta",
                children=(HierarchyBlueprint(key="beta-child", title="Beta Child"),),
            ),
        ),
    )

    hierarchy = engine.build(root_blueprint)

    assert isinstance(hierarchy, DynamicHierarchy)
    assert hierarchy.get("root") is not None
    assert set(hierarchy.descendants("root")) == {"alpha", "beta", "beta-child"}


def test_engine_accepts_mapping_blueprint() -> None:
    engine = HierarchyEngine()
    specification = {
        "key": "root",
        "title": "Root",
        "children": [
            {
                "key": "child",
                "title": "Child",
                "tags": ["example", "Hierarchy"],
                "metadata": {"priority": "high"},
            }
        ],
    }

    hierarchy = engine.build(specification)

    child = hierarchy.get("child")
    assert child is not None
    assert child.tags == ("example", "hierarchy")
    assert child.metadata == {"priority": "high"}
    assert hierarchy.ancestors("child")[0].key == "root"


def test_engine_describe_combines_model_and_hierarchy() -> None:
    engine = HierarchyEngine()
    engine.build(
        HierarchyBlueprint(
            key="root",
            title="Root",
            children=(HierarchyBlueprint(key="child", title="Child"),),
        )
    )

    description = engine.describe()

    assert "definition" in description
    assert len(description["characteristics"]) >= 1
    assert "nodes" in description
    assert "root" in description["nodes"]
