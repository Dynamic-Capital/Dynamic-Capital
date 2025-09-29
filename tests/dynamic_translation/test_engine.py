from __future__ import annotations

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
