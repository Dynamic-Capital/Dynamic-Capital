"""Tests covering the dynamic metadata tooling surface."""

from __future__ import annotations

from datetime import datetime

import pytest

from dynamic_ai.agents import MetadataAgent, MetadataAgentResult
from dynamic_bots import DynamicMetadataBot
from dynamic_helpers import ensure_metadata_mapping, merge_metadata
from dynamic_keepers import DynamicMetadataKeeperAlgorithm, MetadataKeeperSyncResult
from dynamic_metadata.engine import (
    MetadataEntry,
    MetadataLedger,
    coerce_entries,
    coerce_filters,
    coerce_focus_terms,
)
from dynamic_metadata.keeper import DynamicMetadataKeeperAlgorithm as DirectMetadataKeeperAlgorithm


def _sample_entries() -> list[dict[str, object]]:
    return [
        {
            "name": "alpha-data",
            "kind": "dataset",
            "owner": "research",
            "tags": ["market", "daily"],
            "metadata": {"source": "s3", "schema": "ticks"},
        },
        {
            "name": "beta-model",
            "kind": "model",
            "owner": "risk",
            "tags": ["governance"],
            "metadata": {"sensitivity": "high"},
        },
    ]


def test_metadata_engine_coercion_and_search() -> None:
    ledger = MetadataLedger()
    entries = coerce_entries(_sample_entries())
    registered = ledger.register_many(entries)
    assert len(registered) == 2
    assert all(isinstance(entry, MetadataEntry) for entry in registered)

    focus = coerce_focus_terms("dataset")
    filters = coerce_filters({"owner": ["research"]})
    results = ledger.search(focus_terms=focus, filters=filters)
    assert len(results) == 1
    assert results[0].identifier == "alpha-data"

    mapping = ensure_metadata_mapping({"foo": "bar", "empty": "  "})
    assert mapping == {"foo": "bar", "empty": ""}


def test_metadata_agent_curates_records() -> None:
    agent = MetadataAgent()
    with pytest.raises(ValueError):
        agent.run({})

    first_result = agent.run({"entries": _sample_entries(), "focus": ["dataset"]})
    assert isinstance(first_result, MetadataAgentResult)
    assert first_result.records and first_result.records[0].identifier == "alpha-data"
    assert first_result.ledger_size == 2
    assert first_result.metadata.get("ingested") == 2

    filtered = agent.run({"filters": {"owner": ["risk"]}})
    assert filtered.records and all(record.owner == "risk" for record in filtered.records)
    assert filtered.metadata.get("filters") == {"owner": ["risk"]}


def test_metadata_bot_broadcasts_digest() -> None:
    bot = DynamicMetadataBot()
    response = bot.broadcast({"entries": _sample_entries(), "focus": "model"})
    assert response["ingested"] == 2
    assert response["records"]
    assert response["ledger_size"] == 2
    assert "summary" in response


def test_metadata_keeper_sync_and_reexports() -> None:
    keeper = DynamicMetadataKeeperAlgorithm()
    # re-export should point to the direct implementation
    assert isinstance(keeper, DirectMetadataKeeperAlgorithm)

    keeper.register_many(coerce_entries(_sample_entries()))
    result = keeper.sync(focus=("dataset",), filters={"owner": ["research"]})
    assert isinstance(result, MetadataKeeperSyncResult)
    assert result.records and result.records[0]["identifier"] == "alpha-data"
    assert isinstance(result.timestamp, datetime)
    summary = result.summary()
    assert "metadata record" in summary

    payload = result.to_dict()
    assert payload["records"] == result.records
    assert payload["focus"] == ["dataset"]

    merged = merge_metadata({"alpha": 1}, {"beta": 2}, None)
    assert merged == {"alpha": 1, "beta": 2}
