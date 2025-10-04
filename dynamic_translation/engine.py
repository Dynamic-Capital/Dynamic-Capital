"""High-level orchestration for the dynamic translation model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, Iterator, Sequence

from .model import (
    DynamicTranslationModel,
    Glossary,
    GlossaryEntry,
    TranslationMemory,
    TranslationMemoryEntry,
    TranslationRequest,
    TranslationResult,
    normalise,
)

__all__ = [
    "GlossaryEntry",
    "Glossary",
    "TranslationMemoryEntry",
    "TranslationMemory",
    "TranslationRequest",
    "TranslationResult",
    "DynamicTranslationModel",
    "DynamicTranslationEngine",
]


@dataclass(slots=True)
class DynamicTranslationEngine:
    """High-level orchestrator combining glossary, memory, and translation model."""

    supported_languages: Sequence[str]
    memory: TranslationMemory = field(default_factory=TranslationMemory)
    glossary: Glossary = field(default_factory=Glossary)
    model: DynamicTranslationModel = field(default_factory=DynamicTranslationModel)
    translator: Callable[[str, str, str], str] | None = None

    def __post_init__(self) -> None:
        languages = {normalise(language) for language in self.supported_languages}
        if len(languages) != len(tuple(self.supported_languages)):
            raise ValueError("supported_languages contains duplicates")
        object.__setattr__(self, "supported_languages", tuple(self.supported_languages))

        if self.translator is not None:
            self.model.configure_translator(self.translator)

    def translate(self, request: TranslationRequest) -> TranslationResult:
        """Translate ``request`` using the dynamic translation model."""

        self._validate_languages(request.source_language, request.target_language)

        candidate = self.model.translate(request, self.memory, self.glossary)
        instructions = self.model.post_edit_instructions(candidate, request)

        return TranslationResult(
            translated_text=candidate.translated_text,
            confidence=candidate.confidence,
            applied_memory=candidate.applied_memory,
            glossary_terms=candidate.glossary_terms,
            post_edit_instructions=instructions,
            model_features=dict(candidate.features),
        )

    def add_memory_entries(self, entries: Iterable[TranslationMemoryEntry]) -> None:
        """Append ``entries`` to the translation memory."""

        self.memory = self.memory.extend(*tuple(entries))

    def with_glossary(self, glossary: Glossary) -> "DynamicTranslationEngine":
        """Return a new engine with ``glossary`` merged into the existing one."""

        return DynamicTranslationEngine(
            supported_languages=self.supported_languages,
            memory=self.memory,
            glossary=self.glossary.merge(glossary),
            model=self._clone_model(),
            translator=self.translator,
        )

    def configure_translator(
        self, translator: Callable[[str, str, str], str] | None
    ) -> None:
        """Configure the translator used by the engine."""

        self.translator = translator
        self.model.configure_translator(translator)

    def clear_translation_cache(self) -> None:
        """Clear cached translator outputs on the model."""

        self.model.clear_cache()

    def translate_stream(
        self, requests: Iterable[TranslationRequest]
    ) -> Iterator[TranslationResult]:
        """Yield translations lazily for each request in ``requests``."""

        for request in requests:
            yield self.translate(request)

    def translate_batch(
        self, requests: Iterable[TranslationRequest]
    ) -> tuple[TranslationResult, ...]:
        """Translate an iterable of ``requests`` and return the aggregated results."""

        return tuple(self.translate_stream(requests))

    def _clone_model(self) -> DynamicTranslationModel:
        return DynamicTranslationModel(
            weights=self.model.weights,
            min_memory_score=self.model.min_memory_score,
            length_penalty_reference=self.model.length_penalty_reference,
            translator=self.model.translator,
        )

    def _validate_languages(self, source: str, target: str) -> None:
        normalised = {normalise(lang) for lang in self.supported_languages}
        if normalise(source) not in normalised:
            raise ValueError(f"Unsupported source language: {source}")
        if normalise(target) not in normalised:
            raise ValueError(f"Unsupported target language: {target}")
        if normalise(source) == normalise(target):
            raise ValueError("Source and target languages must be different")

