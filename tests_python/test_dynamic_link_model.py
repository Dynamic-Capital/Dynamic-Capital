from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - ensure import path for pytest
    sys.path.append(str(PROJECT_ROOT))

from dynamic_link_model import (
    DynamicLinkModel,
    LinkEntity,
    LinkEvidence,
)


def test_observe_creates_bidirectional_relations() -> None:
    model = DynamicLinkModel()
    model.upsert_entities(
        [
            LinkEntity(identifier="alpha", label="Alpha"),
            LinkEntity(identifier="beta", label="Beta"),
        ]
    )

    model.observe(
        LinkEvidence(
            source="alpha",
            target="beta",
            interaction="co_view",
            intensity=2.0,
            fidelity=0.9,
            metadata={"source": "analytics"},
        )
    )

    forward = model.get_relation("alpha", "beta")
    reverse = model.get_relation("beta", "alpha")

    assert forward is not None
    assert reverse is not None
    assert forward.weight > 0.0
    assert reverse.interactions["co_view"] == 1


def test_suggest_relations_ranks_by_score() -> None:
    model = DynamicLinkModel()
    model.upsert_entities(
        [
            {"identifier": "alpha"},
            {"identifier": "beta"},
            {"identifier": "gamma"},
            {"identifier": "delta"},
        ]
    )

    for _ in range(3):
        model.observe(
            LinkEvidence(
                source="alpha",
                target="gamma",
                interaction="shared_read",
                intensity=3.0,
                fidelity=0.85,
            )
        )

    model.observe(
        LinkEvidence(
            source="alpha",
            target="beta",
            interaction="co_click",
            intensity=1.5,
            fidelity=0.7,
        )
    )

    model.observe(
        LinkEvidence(
            source="alpha",
            target="delta",
            interaction="random",
            intensity=0.2,
            fidelity=0.1,
        )
    )

    suggestions = model.suggest_relations("alpha", limit=3, min_confidence=0.3)
    assert [suggestion.target for suggestion in suggestions] == ["gamma", "beta"]
    assert suggestions[0].confidence >= suggestions[1].confidence


def test_snapshot_round_trip_preserves_relations() -> None:
    model = DynamicLinkModel()
    model.observe(
        LinkEvidence(
            source="alpha",
            target="beta",
            interaction="co_purchase",
            intensity=2.5,
            fidelity=0.95,
            metadata={"region": "emea"},
        )
    )
    model.observe(
        LinkEvidence(
            source="beta",
            target="gamma",
            interaction="co_purchase",
            intensity=1.2,
            fidelity=0.75,
        )
    )

    snapshot = model.snapshot()
    clone = DynamicLinkModel()
    clone.merge_snapshot(snapshot)

    assert {entity.identifier for entity in snapshot.entities} == {
        "alpha",
        "beta",
        "gamma",
    }

    original_relation = model.get_relation("alpha", "beta")
    clone_relation = clone.get_relation("alpha", "beta")
    assert original_relation is not None
    assert clone_relation is not None
    assert clone_relation.weight == original_relation.weight
    assert clone_relation.confidence == original_relation.confidence
    assert clone_relation.interactions == original_relation.interactions

    payload = snapshot.as_dict()
    model.clear()
    model.merge_snapshot(payload)
    restored_relation = model.get_relation("alpha", "beta")
    assert restored_relation is not None
    assert restored_relation.interactions["co_purchase"] >= 1
