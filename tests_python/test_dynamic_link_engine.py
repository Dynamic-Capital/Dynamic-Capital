from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - import path hygiene for pytest
    sys.path.append(str(PROJECT_ROOT))

from dynamic_link_engine import DynamicLinkEngine, LinkNode, LinkObservation


def test_record_observation_creates_edge() -> None:
    engine = DynamicLinkEngine()
    engine.upsert_nodes(
        [
            LinkNode(identifier="alpha", label="Alpha"),
            LinkNode(identifier="beta", label="Beta"),
        ]
    )

    engine.record(
        LinkObservation(
            source="alpha",
            target="beta",
            interaction="co_view",
            strength=2.0,
            quality=0.9,
            metadata={"source": "analytics"},
        )
    )

    forward = engine.get_edge("alpha", "beta")
    reverse = engine.get_edge("beta", "alpha")

    assert forward is not None
    assert forward.weight > 0.0
    assert forward.confidence > 0.0
    assert forward.interactions["co_view"] == 1
    assert reverse is not None
    assert reverse.interactions["co_view"] == 1


def test_suggest_links_ranks_by_score() -> None:
    engine = DynamicLinkEngine()
    engine.upsert_nodes(
        [
            {"identifier": "alpha"},
            {"identifier": "beta"},
            {"identifier": "gamma"},
            {"identifier": "delta"},
        ]
    )

    # Strong connection between alpha and gamma
    for _ in range(3):
        engine.record(
            LinkObservation(
                source="alpha",
                target="gamma",
                interaction="shared_read",
                strength=3.0,
                quality=0.85,
            )
        )

    # Moderate connection between alpha and beta
    engine.record(
        LinkObservation(
            source="alpha",
            target="beta",
            interaction="co_click",
            strength=1.5,
            quality=0.7,
        )
    )

    # Low quality connection should be filtered out by confidence threshold
    engine.record(
        LinkObservation(
            source="alpha",
            target="delta",
            interaction="random",
            strength=0.2,
            quality=0.1,
        )
    )

    suggestions = engine.suggest_links("alpha", limit=3, min_confidence=0.3)
    assert [suggestion.target for suggestion in suggestions] == ["gamma", "beta"]
    assert suggestions[0].confidence >= suggestions[1].confidence


def test_snapshot_round_trip_preserves_links() -> None:
    engine = DynamicLinkEngine()
    engine.record(
        LinkObservation(
            source="alpha",
            target="beta",
            interaction="co_purchase",
            strength=2.5,
            quality=0.95,
            metadata={"region": "emea"},
        )
    )
    engine.record(
        LinkObservation(
            source="beta",
            target="gamma",
            interaction="co_purchase",
            strength=1.2,
            quality=0.75,
        )
    )

    snapshot = engine.snapshot()
    clone = DynamicLinkEngine()
    clone.merge_snapshot(snapshot)

    assert {node.identifier for node in snapshot.nodes} == {"alpha", "beta", "gamma"}

    original_edge = engine.get_edge("alpha", "beta")
    clone_edge = clone.get_edge("alpha", "beta")
    assert original_edge is not None
    assert clone_edge is not None
    assert clone_edge.weight == original_edge.weight
    assert clone_edge.confidence == original_edge.confidence
    assert clone_edge.interactions == original_edge.interactions

    # Ensure merge works from dictionary payloads as well
    payload = snapshot.as_dict()
    engine.clear()
    engine.merge_snapshot(payload)
    restored_edge = engine.get_edge("alpha", "beta")
    assert restored_edge is not None
    assert restored_edge.interactions["co_purchase"] >= 1
