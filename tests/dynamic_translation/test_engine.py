from __future__ import annotations

from typing import Iterable

import pytest

from dynamic_translation.engine import (
    DynamicTranslationEngine,
    Glossary,
    GlossaryEntry,
    TranslationMemory,
    TranslationMemoryEntry,
    TranslationRequest,
)


class _Recorder:
    """Capture invocations to prove when the fallback translator runs."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    def __call__(self, text: str, source: str, target: str) -> str:
        self.calls.append((text, source, target))
        return f"[{source}->{target}] {text.upper()}"


def _memory_entry() -> TranslationMemoryEntry:
    return TranslationMemoryEntry(
        source_text="Launch the Dynamic Capital playbook.",
        target_text="Lancez le playbook Dynamic Capital.",
        source_language="en",
        target_language="fr",
        domain="product",
        quality_score=0.82,
    )


def test_engine_prefers_memory_and_applies_glossary() -> None:
    recorder = _Recorder()
    engine = DynamicTranslationEngine(
        supported_languages=("en", "fr", "es"),
        translator=recorder,
    )
    engine.add_memory_entries((_memory_entry(),))

    glossary = Glossary(
        (
            GlossaryEntry("Dynamic Capital", "Dynamic Capital™"),
            GlossaryEntry("playbook", "guide opérationnel"),
        )
    )

    enriched = engine.with_glossary(glossary)
    request = TranslationRequest(
        text="Launch the Dynamic Capital playbook.",
        source_language="en",
        target_language="fr",
        domain="operations",
        metadata={"requested_by": "ci"},
    )

    result = enriched.translate(request)

    assert result.applied_memory is not None
    assert result.applied_memory.quality_score == pytest.approx(0.82)
    assert "Dynamic Capital™" in result.translated_text
    assert "guide opérationnel" in result.translated_text
    assert result.glossary_terms
    assert "Ensure terminology aligns with the operations domain." in result.post_edit_instructions
    assert (
        "Validate translation memory segment due to suboptimal quality score."
        in result.post_edit_instructions
    )

    # Fallback translator still prepares a comparison candidate, but memory result wins.
    assert recorder.calls == [
        ("Launch the Dynamic Capital playbook.", "en", "fr"),
    ]


def test_engine_rejects_invalid_language_pairs() -> None:
    engine = DynamicTranslationEngine(supported_languages=("en", "fr"))

    with pytest.raises(ValueError):
        engine.translate(
            TranslationRequest(
                text="Hola",
                source_language="es",
                target_language="fr",
            )
        )

    with pytest.raises(ValueError):
        engine.translate(
            TranslationRequest(
                text="Same lang",
                source_language="en",
                target_language="EN",
            )
        )


def test_engine_uses_fallback_translator_when_memory_misses() -> None:
    recorder = _Recorder()
    engine = DynamicTranslationEngine(
        supported_languages=("en", "fr"),
        translator=recorder,
        memory=TranslationMemory((_memory_entry(),)),
    )

    request = TranslationRequest(
        text="Launch the treasury dashboard",
        source_language="en",
        target_language="fr",
    )

    result = engine.translate(request)

    assert result.applied_memory is None
    assert result.translated_text.startswith("[en->fr]")
    assert recorder.calls == [("Launch the treasury dashboard", "en", "fr")]


def test_engine_translate_batch_processes_all_requests() -> None:
    recorder = _Recorder()
    engine = DynamicTranslationEngine(
        supported_languages=("en", "fr"),
        translator=recorder,
        memory=TranslationMemory((_memory_entry(),)),
    )

    requests = (
        TranslationRequest(
            text="Launch the Dynamic Capital playbook.",
            source_language="en",
            target_language="fr",
        ),
        TranslationRequest(
            text="Launch the treasury dashboard",
            source_language="en",
            target_language="fr",
        ),
    )

    results = engine.translate_batch(requests)

    assert isinstance(results, tuple)
    assert len(results) == 2
    assert results[0].applied_memory is not None
    assert results[1].applied_memory is None
    assert recorder.calls == [
        ("Launch the Dynamic Capital playbook.", "en", "fr"),
        ("Launch the treasury dashboard", "en", "fr"),
    ]


def test_engine_translate_stream_is_lazy() -> None:
    recorder = _Recorder()
    engine = DynamicTranslationEngine(
        supported_languages=("en", "fr"),
        translator=recorder,
        memory=TranslationMemory((_memory_entry(),)),
    )

    generated = 0

    def request_iter() -> Iterable[TranslationRequest]:
        nonlocal generated

        for text in (
            "Launch the Dynamic Capital playbook.",
            "Launch the treasury dashboard",
        ):
            generated += 1
            yield TranslationRequest(
                text=text,
                source_language="en",
                target_language="fr",
            )

    stream = engine.translate_stream(request_iter())

    assert recorder.calls == []
    assert generated == 0

    first = next(stream)

    assert first.applied_memory is not None
    assert recorder.calls == [("Launch the Dynamic Capital playbook.", "en", "fr")]
    assert generated == 1

    second = next(stream)

    assert second.applied_memory is None
    assert recorder.calls == [
        ("Launch the Dynamic Capital playbook.", "en", "fr"),
        ("Launch the treasury dashboard", "en", "fr"),
    ]
    assert generated == 2

    with pytest.raises(StopIteration):
        next(stream)
