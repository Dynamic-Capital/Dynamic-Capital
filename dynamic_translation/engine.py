"""Core orchestration layer for the Dynamic Translation Engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Callable, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "GlossaryEntry",
    "Glossary",
    "TranslationMemoryEntry",
    "TranslationMemory",
    "TranslationRequest",
    "TranslationResult",
    "DynamicTranslationEngine",
]


def _normalise(value: str) -> str:
    """Return a whitespace normalised, lowercase representation of ``value``."""

    return " ".join(value.strip().lower().split())


@dataclass(slots=True, frozen=True)
class GlossaryEntry:
    """Glossary mapping for a specific bilingual terminology pair."""

    source_term: str
    target_term: str
    description: str | None = None

    def matches(self, text: str) -> bool:
        return _normalise(self.source_term) in _normalise(text)


@dataclass(slots=True)
class Glossary:
    """Terminology management for the translation engine."""

    entries: Sequence[GlossaryEntry] = field(default_factory=tuple)

    def apply(self, text: str) -> str:
        """Replace known terms in ``text`` using the glossary entries."""

        updated = text
        for entry in self.entries:
            updated = self._apply_entry(updated, entry)
        return updated

    @staticmethod
    def _apply_entry(text: str, entry: GlossaryEntry) -> str:
        if not entry.source_term:
            return text

        source = entry.source_term
        target = entry.target_term
        return text.replace(source, target)

    def merge(self, *others: "Glossary") -> "Glossary":
        """Return a new glossary composed of ``self`` and ``others``."""

        combined = list(self.entries)
        for other in others:
            combined.extend(other.entries)
        # Remove duplicates based on the normalised source term.
        deduped: MutableMapping[str, GlossaryEntry] = {}
        for entry in combined:
            deduped[_normalise(entry.source_term)] = entry
        return Glossary(tuple(deduped.values()))


@dataclass(slots=True, frozen=True)
class TranslationMemoryEntry:
    """Stores a bilingual segment pair captured by the engine."""

    source_text: str
    target_text: str
    source_language: str
    target_language: str
    domain: str | None = None
    quality_score: float = 1.0

    def similarity(self, text: str, language: str) -> float:
        if _normalise(language) != _normalise(self.source_language):
            return 0.0
        return SequenceMatcher(a=_normalise(text), b=_normalise(self.source_text)).ratio()


@dataclass(slots=True)
class TranslationMemory:
    """Fuzzy retriever for previously translated segments."""

    entries: Sequence[TranslationMemoryEntry] = field(default_factory=tuple)

    def lookup(
        self,
        text: str,
        source_language: str,
        target_language: str,
        *,
        min_score: float = 0.75,
    ) -> TranslationMemoryEntry | None:
        """Return the highest scoring translation memory entry if available."""

        best_entry: TranslationMemoryEntry | None = None
        best_score = 0.0

        for entry in self.entries:
            if _normalise(entry.target_language) != _normalise(target_language):
                continue

            score = entry.similarity(text, source_language) * entry.quality_score
            if score > best_score:
                best_score = score
                best_entry = entry

        if best_score >= min_score:
            return best_entry
        return None

    def extend(self, *entries: TranslationMemoryEntry) -> "TranslationMemory":
        """Return a new translation memory with ``entries`` appended."""

        return TranslationMemory(self.entries + entries)


@dataclass(slots=True, frozen=True)
class TranslationRequest:
    """Structured payload describing the translation requirements."""

    text: str
    source_language: str
    target_language: str
    domain: str | None = None
    metadata: Mapping[str, object] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class TranslationResult:
    """Outcome of a translation call performed by the engine."""

    translated_text: str
    confidence: float
    applied_memory: TranslationMemoryEntry | None = None
    glossary_terms: tuple[GlossaryEntry, ...] = ()
    post_edit_instructions: tuple[str, ...] = ()


@dataclass(slots=True)
class DynamicTranslationEngine:
    """High-level orchestrator that combines glossary and translation memory."""

    supported_languages: Sequence[str]
    memory: TranslationMemory = field(default_factory=TranslationMemory)
    glossary: Glossary = field(default_factory=Glossary)
    translator: Callable[[str, str, str], str] | None = None

    def __post_init__(self) -> None:
        languages = {_normalise(language) for language in self.supported_languages}
        if len(languages) != len(tuple(self.supported_languages)):
            raise ValueError("supported_languages contains duplicates")
        object.__setattr__(self, "supported_languages", tuple(self.supported_languages))

    def translate(self, request: TranslationRequest) -> TranslationResult:
        """Translate ``request`` using the available knowledge sources."""

        self._validate_languages(request.source_language, request.target_language)

        memory_entry = self.memory.lookup(
            request.text, request.source_language, request.target_language
        )
        if memory_entry:
            applied_text = self.glossary.apply(memory_entry.target_text)
            glossary_terms = self._matched_terms(memory_entry.target_text)
            return TranslationResult(
                translated_text=applied_text,
                confidence=min(1.0, memory_entry.quality_score),
                applied_memory=memory_entry,
                glossary_terms=glossary_terms,
            )

        machine_translation = self._fallback_translation(
            request.text, request.source_language, request.target_language
        )
        translated_text = self.glossary.apply(machine_translation)
        glossary_terms = self._matched_terms(machine_translation)

        instructions: list[str] = []
        if glossary_terms:
            instructions.append("Verify glossary substitutions for context sensitivity.")
        instructions.append("Perform human review for fluency and domain accuracy.")

        confidence = 0.5
        if glossary_terms:
            confidence += 0.1
        if machine_translation == request.text:
            confidence -= 0.2

        return TranslationResult(
            translated_text=translated_text,
            confidence=max(0.0, min(1.0, confidence)),
            glossary_terms=glossary_terms,
            post_edit_instructions=tuple(instructions),
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
            translator=self.translator,
        )

    def _fallback_translation(self, text: str, source: str, target: str) -> str:
        if self.translator:
            return self.translator(text, source, target)
        return f"[{source}->{target}] {text}"

    def _validate_languages(self, source: str, target: str) -> None:
        normalised = {_normalise(lang) for lang in self.supported_languages}
        if _normalise(source) not in normalised:
            raise ValueError(f"Unsupported source language: {source}")
        if _normalise(target) not in normalised:
            raise ValueError(f"Unsupported target language: {target}")
        if _normalise(source) == _normalise(target):
            raise ValueError("Source and target languages must be different")

    def _matched_terms(self, text: str) -> tuple[GlossaryEntry, ...]:
        matches = [entry for entry in self.glossary.entries if entry.matches(text)]
        return tuple(matches)
