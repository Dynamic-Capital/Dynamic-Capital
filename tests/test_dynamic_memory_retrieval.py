from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_memory import DynamicMemoryRetriever, MemoryMatch, MemoryQuery, MemoryRecord


UTC = timezone.utc


def _ts(days: int) -> datetime:
    return datetime(2024, 1, 10, tzinfo=UTC) + timedelta(days=days)


def test_memory_record_normalisation() -> None:
    record = MemoryRecord(
        record_id="  42  ",
        domain=" Memory ",
        summary="  Recalled disciplined exit  ",
        details="  Captured trailing stop adjustments.  ",
        tags=("Focus", "focus", "Archive"),
        weight=-1.2,
        timestamp=datetime(2024, 1, 5, 12, tzinfo=UTC),
        metadata={"note": "ok"},
    )

    assert record.record_id == "42"
    assert record.domain == "memory"
    assert record.summary == "Recalled disciplined exit"
    assert record.details == "Captured trailing stop adjustments."
    assert record.tags == ("focus", "archive")
    assert record.weight == 0.0
    assert record.timestamp.tzinfo is UTC
    assert record.metadata == {"note": "ok"}


@pytest.mark.parametrize("terms", [["disciplined"], "disciplined exit"])
def test_memory_retriever_ranks_matches(terms: object) -> None:
    retriever = DynamicMemoryRetriever(
        records=[
            {
                "record_id": "1",
                "domain": "memory",
                "summary": "Recalled disciplined exit with calm execution",
                "tags": ("focus", "wins"),
                "weight": 1.5,
                "timestamp": _ts(0),
            },
            {
                "record_id": "2",
                "domain": "memory",
                "summary": "Logged distracted entry with sloppy sizing",
                "tags": ("lessons",),
                "weight": 0.5,
                "timestamp": _ts(-2),
            },
            {
                "record_id": "3",
                "domain": "vision",
                "summary": "Outlined multi-quarter liquidity roadmap",
                "tags": ("planning",),
                "weight": 2.0,
                "timestamp": _ts(-1),
            },
        ],
        time_decay_half_life_days=14.0,
    )

    query = MemoryQuery(terms=terms, domain="Memory", tags=["focus"], reference_time=_ts(1))
    matches = retriever.retrieve(query, limit=5)

    assert [match.record.record_id for match in matches] == ["1"]
    assert matches[0].score > 0
    assert any(reason.startswith("term_hits=") for reason in matches[0].reasons)
    assert any(reason.startswith("tag_overlap=") for reason in matches[0].reasons)


def test_memory_retriever_time_filters_and_limit() -> None:
    retriever = DynamicMemoryRetriever(time_decay_half_life_days=30.0)
    retriever.extend(
        [
            MemoryRecord(
                record_id="a",
                domain="memory",
                summary="Captured treasury rebalance",
                tags=("treasury",),
                timestamp=_ts(-5),
            ),
            MemoryRecord(
                record_id="b",
                domain="memory",
                summary="Documented governance vote",
                tags=("governance",),
                timestamp=_ts(-3),
            ),
            MemoryRecord(
                record_id="c",
                domain="memory",
                summary="Recorded liquidity partner outreach",
                tags=("treasury", "ops"),
                timestamp=_ts(-1),
            ),
        ]
    )

    query = MemoryQuery(
        terms="treasury",
        since=_ts(-4),
        until=_ts(0),
        reference_time=_ts(0),
    )

    matches = retriever.retrieve(query, limit=2)

    assert [match.record.record_id for match in matches] == ["c"]
    assert matches[0].record.summary == "Recorded liquidity partner outreach"


def test_memory_retriever_returns_empty_when_no_match() -> None:
    retriever = DynamicMemoryRetriever()
    retriever.add(
        MemoryRecord(
            record_id="x",
            domain="memory",
            summary="Calibrated volatility hedges",
            tags=("risk",),
            timestamp=_ts(-7),
        )
    )

    query = MemoryQuery(terms="treasury", domain="memory", reference_time=_ts(0))
    matches = retriever.retrieve(query)

    assert matches == []


@pytest.mark.parametrize("limit", [0, -1])
def test_memory_retriever_limit_guard(limit: int) -> None:
    retriever = DynamicMemoryRetriever()
    retriever.add(
        {
            "record_id": "1",
            "domain": "memory",
            "summary": "Baseline record",
        }
    )

    matches = retriever.retrieve(MemoryQuery(reference_time=_ts(0)), limit=limit)

    assert matches == []
    assert all(isinstance(match, MemoryMatch) for match in retriever.retrieve(MemoryQuery(reference_time=_ts(0))))
