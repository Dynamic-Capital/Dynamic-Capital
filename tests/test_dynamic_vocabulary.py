from datetime import datetime, timedelta, timezone

import pytest

from dynamic_vocabulary import (
    DynamicVocabulary,
    VocabularyDigest,
    VocabularyEntry,
    VocabularySnapshot,
)


def test_vocabulary_entry_normalisation() -> None:
    entry = VocabularyEntry(
        term="  Liquidity  ",
        definition="  Capacity to meet short-term obligations  ",
        part_of_speech="  Noun  ",
        contexts=(" Treasury  Desk ", ""),
        synonyms=(" Capital ", "capital"),
        antonyms=("  Insolvency ",),
        notes=(" Reviewed quarterly  ", ""),
        metadata={"owner": " Finance Guild "},
        proficiency=1.3,
        retention=-0.2,
        momentum=2.5,
        exposures=-4,
        last_reviewed=datetime(2024, 5, 1, 12, tzinfo=timezone.utc),
    )

    assert entry.term == "Liquidity"
    assert entry.definition == "Capacity to meet short-term obligations"
    assert entry.part_of_speech == "noun"
    assert entry.contexts == ("Treasury  Desk",)
    assert entry.synonyms == ("capital",)
    assert entry.antonyms == ("insolvency",)
    assert entry.notes == ("Reviewed quarterly",)
    assert entry.metadata == {"owner": " Finance Guild "}
    assert 0.0 <= entry.proficiency <= 1.0
    assert 0.0 <= entry.retention <= 1.0
    assert 0.0 <= entry.momentum <= 1.0
    assert entry.exposures == 0
    assert entry.last_reviewed.tzinfo is timezone.utc
    payload = entry.as_dict()
    assert payload["term"] == "Liquidity"


def test_dynamic_vocabulary_search_and_review() -> None:
    alpha = VocabularyEntry(
        term="Alpha",
        definition="First strategic initiative",
        part_of_speech="noun",
        contexts=("launch program",),
        synonyms=("leader", "vanguard"),
        notes=("Use for partner briefings",),
        proficiency=0.3,
        retention=0.35,
    )
    bravo = VocabularyEntry(
        term="Bravo",
        definition="Second initiative with market follow-up",
        part_of_speech="noun",
        contexts=("growth desk", "alpha"),
        synonyms=("support",),
        retention=0.8,
        proficiency=0.82,
    )

    vocab = DynamicVocabulary([alpha, bravo])

    assert vocab.find("alpha") is alpha
    assert vocab.find("vanguard") is alpha
    assert vocab.find("growth desk") is bravo
    assert vocab.find("unknown") is None

    results = vocab.search("initiative")
    assert results[0] is bravo  # higher proficiency
    assert alpha in results

    updated = vocab.record_review("vanguard", score=0.9, exposures=2)
    assert updated is alpha
    assert updated.exposures == 2
    assert updated.proficiency > 0.3
    assert updated.retention > 0.35
    assert updated.last_reviewed.tzinfo is timezone.utc


def test_dynamic_vocabulary_digest_and_focus() -> None:
    now = datetime(2024, 8, 1, tzinfo=timezone.utc)
    struggling = VocabularyEntry(
        term="Cadence",
        definition="Regular rhythm of communication",
        part_of_speech="noun",
        contexts=("communications",),
        proficiency=0.2,
        retention=0.25,
        last_reviewed=now - timedelta(days=30),
    )
    steady = VocabularyEntry(
        term="Resonance",
        definition="Alignment between message and audience",
        part_of_speech="noun",
        contexts=("marketing",),
        proficiency=0.65,
        retention=0.7,
        last_reviewed=now - timedelta(days=10),
    )
    mastered = VocabularyEntry(
        term="Synergy",
        definition="Combined effect greater than the sum",
        part_of_speech="noun",
        proficiency=0.9,
        retention=0.85,
        last_reviewed=now - timedelta(days=5),
    )

    vocab = DynamicVocabulary([struggling, steady, mastered])

    vocab.decay_retention(factor=0.9)
    focus = vocab.suggest_focus(limit=2)
    assert focus and focus[0].term == "Cadence"
    assert focus[0].needs_attention

    snapshot = vocab.snapshot()
    assert isinstance(snapshot, VocabularySnapshot)
    assert "Synergy" in snapshot.mastered_terms
    assert "Cadence" in snapshot.attention_terms

    digest = vocab.generate_digest(stale_after=timedelta(days=7))
    assert isinstance(digest, VocabularyDigest)
    assert digest.total_entries == 3
    assert digest.focus_terms[0] == "Cadence"
    assert "Cadence" in digest.stale_terms
    assert digest.mastery_rate > 0.0

    with pytest.raises(ValueError):
        vocab.suggest_focus(limit=0)

    with pytest.raises(ValueError):
        vocab.generate_digest(stale_after=timedelta())

    with pytest.raises(ValueError):
        vocab.decay_retention(factor=0.0)
