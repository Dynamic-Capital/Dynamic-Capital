from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_letter_index import DynamicLetterIndex, LetterSample


def test_ingest_text_and_snapshot() -> None:
    index = DynamicLetterIndex(history=3)
    samples = index.ingest_text("abBA cab", weight=2.0, context="First batch")
    assert {sample.letter for sample in samples} == {"A", "B", "C"}

    index.observe({"letter": "d", "occurrences": 2, "weight": 0.5, "context": "delta"})

    entries = {entry.letter: entry for entry in index.entries()}
    assert entries["A"].total_occurrences == 3
    assert entries["A"].weighted_occurrences == pytest.approx(6.0)
    assert entries["A"].contexts == ("First batch",)
    assert entries["D"].weighted_occurrences == pytest.approx(1.0)

    snapshot = index.snapshot()
    assert snapshot.unique_letters == 4
    assert snapshot.total_occurrences == 9
    assert snapshot.weighted_total == pytest.approx(15.0)

    top_letters = snapshot.top_letters
    assert top_letters[0].letter == "A"
    assert top_letters[0].share == pytest.approx(0.4)
    assert any(note.startswith("narrow coverage") for note in snapshot.notes)
    assert any(note.startswith("low diversity") for note in snapshot.notes)
    assert "letters surging recently" in snapshot.notes


def test_snapshot_empty_index() -> None:
    index = DynamicLetterIndex()
    snapshot = index.snapshot()
    assert snapshot.unique_letters == 0
    assert snapshot.total_occurrences == 0
    assert snapshot.weighted_total == 0.0
    assert snapshot.top_letters == ()
    assert snapshot.notes == ("index is empty",)


def test_momentum_respects_history_window() -> None:
    index = DynamicLetterIndex(history=2)
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)

    index.observe(LetterSample(letter="x", occurrences=3, timestamp=base_time))
    index.observe(
        LetterSample(
            letter="x",
            occurrences=1,
            timestamp=base_time + timedelta(minutes=1),
        )
    )
    index.observe(
        LetterSample(
            letter="x",
            occurrences=6,
            timestamp=base_time + timedelta(minutes=2),
        )
    )

    snapshot = index.snapshot()
    assert snapshot.top_letters[0].letter == "X"
    assert snapshot.top_letters[0].momentum == pytest.approx(0.7)
