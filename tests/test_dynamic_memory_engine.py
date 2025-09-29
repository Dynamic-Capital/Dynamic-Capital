from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_memory import DynamicMemoryEngine, MemoryFragment


def _fragment(
    *,
    domain: str,
    summary: str,
    recency: float,
    relevance: float,
    novelty: float,
    weight: float,
    timestamp: datetime,
    tags: tuple[str, ...] = (),
) -> MemoryFragment:
    return MemoryFragment(
        domain=domain,
        summary=summary,
        recency=recency,
        relevance=relevance,
        novelty=novelty,
        weight=weight,
        timestamp=timestamp,
        tags=tags,
    )


def test_recall_ranked_returns_highest_scoring_fragments() -> None:
    engine = DynamicMemoryEngine(history=5)
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
    engine.extend(
        [
            _fragment(
                domain="ops",
                summary="Stabilise liquidity protocol",
                recency=0.9,
                relevance=0.4,
                novelty=0.2,
                weight=1.0,
                timestamp=base_time,
            ),
            _fragment(
                domain="ops",
                summary="Integrate automated hedging",
                recency=0.6,
                relevance=0.9,
                novelty=0.7,
                weight=1.2,
                timestamp=base_time.replace(hour=1),
            ),
            _fragment(
                domain="ops",
                summary="Refine incident response",
                recency=0.8,
                relevance=0.5,
                novelty=0.8,
                weight=0.8,
                timestamp=base_time.replace(hour=2),
            ),
        ]
    )

    top_two = engine.recall_ranked(limit=2)

    assert len(top_two) == 2
    assert top_two[0].summary == "Integrate automated hedging"
    assert top_two[1].summary == "Stabilise liquidity protocol"


def test_recall_ranked_filters_by_domain_and_tags() -> None:
    engine = DynamicMemoryEngine(history=5)
    base_time = datetime(2024, 2, 1, tzinfo=timezone.utc)
    engine.extend(
        [
            _fragment(
                domain="ops",
                summary="Add proactive controls",
                recency=0.7,
                relevance=0.65,
                novelty=0.5,
                weight=1.0,
                tags=("risk", "controls"),
                timestamp=base_time,
            ),
            _fragment(
                domain="ops",
                summary="Refine service blueprint",
                recency=0.6,
                relevance=0.55,
                novelty=0.4,
                weight=1.1,
                tags=("operations",),
                timestamp=base_time.replace(hour=1),
            ),
            _fragment(
                domain="intel",
                summary="Track macro dislocations",
                recency=0.8,
                relevance=0.75,
                novelty=0.6,
                weight=1.0,
                tags=("risk",),
                timestamp=base_time.replace(hour=2),
            ),
        ]
    )

    filtered = engine.recall_ranked(limit=5, tags=(" Risk ",), domain="OPS")

    assert len(filtered) == 1
    assert filtered[0].summary == "Add proactive controls"


def test_recall_ranked_custom_weights_and_validation() -> None:
    engine = DynamicMemoryEngine(history=5)
    base_time = datetime(2024, 3, 1, tzinfo=timezone.utc)
    engine.extend(
        [
            _fragment(
                domain="ops",
                summary="Document baseline process",
                recency=0.9,
                relevance=0.4,
                novelty=0.3,
                weight=1.0,
                timestamp=base_time,
            ),
            _fragment(
                domain="ops",
                summary="Capture novel research insight",
                recency=0.5,
                relevance=0.5,
                novelty=0.95,
                weight=1.0,
                timestamp=base_time.replace(hour=1),
            ),
        ]
    )

    ranked = engine.recall_ranked(limit=1, weights={"novelty": 1.0})
    assert ranked[0].summary == "Capture novel research insight"

    with pytest.raises(ValueError):
        engine.recall_ranked(weights={"recency": -0.1})

    with pytest.raises(KeyError):
        engine.recall_ranked(weights={"focus": 0.5})
