"""Core data structures and scoring model for the dynamic translation engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Callable, Mapping, MutableMapping, Sequence

__all__ = [
    "GlossaryEntry",
    "Glossary",
    "TranslationMemoryEntry",
    "TranslationMemory",
    "TranslationRequest",
    "TranslationResult",
    "CandidateTranslation",
    "DynamicTranslationModel",
    "normalise",
]


def normalise(value: str) -> str:
    """Return a whitespace normalised, lowercase representation of ``value``."""

    return " ".join(value.strip().lower().split())


@dataclass(slots=True, frozen=True)
class GlossaryEntry:
    """Glossary mapping for a specific bilingual terminology pair."""

    source_term: str
    target_term: str
    description: str | None = None

    def matches(self, text: str) -> bool:
        return normalise(self.source_term) in normalise(text)


@dataclass(slots=True)
class Glossary:
    """Terminology management for the translation engine."""

    entries: Sequence[GlossaryEntry] = field(default_factory=tuple)
    _index: dict[str, GlossaryEntry] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.entries = tuple(self.entries)
        self._index = {normalise(entry.source_term): entry for entry in self.entries}

    def apply(self, text: str) -> str:
        """Replace known terms in ``text`` using the glossary entries."""

        updated = text
        for entry in self.entries:
            if not entry.source_term:
                continue
            updated = updated.replace(entry.source_term, entry.target_term)
        return updated

    def find_matches(self, text: str) -> tuple[GlossaryEntry, ...]:
        """Return glossary entries that match ``text``."""

        return tuple(entry for entry in self.entries if entry.matches(text))

    def coverage(self, matches: Sequence[GlossaryEntry]) -> float:
        """Return the ratio of matched terms to the known glossary terms."""

        if not self._index:
            return 0.0
        unique_matches = {normalise(entry.source_term) for entry in matches}
        return min(1.0, len(unique_matches) / len(self._index))

    def merge(self, *others: "Glossary") -> "Glossary":
        """Return a new glossary composed of ``self`` and ``others``."""

        combined = list(self.entries)
        for other in others:
            combined.extend(other.entries)

        deduped: dict[str, GlossaryEntry] = {}
        for entry in combined:
            deduped[normalise(entry.source_term)] = entry
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
        if normalise(language) != normalise(self.source_language):
            return 0.0
        return SequenceMatcher(
            a=normalise(text),
            b=normalise(self.source_text),
        ).ratio()


@dataclass(slots=True)
class TranslationMemory:
    """Fuzzy retriever for previously translated segments."""

    entries: Sequence[TranslationMemoryEntry] = field(default_factory=tuple)
    _by_target_language: dict[str, tuple[TranslationMemoryEntry, ...]] = field(
        init=False, repr=False
    )

    def __post_init__(self) -> None:
        self.entries = tuple(self.entries)
        buckets: dict[str, list[TranslationMemoryEntry]] = {}
        for entry in self.entries:
            key = normalise(entry.target_language)
            buckets.setdefault(key, []).append(entry)
        self._by_target_language = {
            key: tuple(value) for key, value in buckets.items()
        }

    def lookup(
        self,
        text: str,
        source_language: str,
        target_language: str,
        *,
        min_score: float = 0.75,
    ) -> TranslationMemoryEntry | None:
        """Return the highest scoring translation memory entry if available."""

        candidates = self._by_target_language.get(normalise(target_language), ())

        best_entry: TranslationMemoryEntry | None = None
        best_score = 0.0

        for entry in candidates:
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
    model_features: Mapping[str, float] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class CandidateTranslation:
    """Intermediate candidate produced by the dynamic translation model."""

    translated_text: str
    score: float
    origin: str
    applied_memory: TranslationMemoryEntry | None = None
    glossary_terms: tuple[GlossaryEntry, ...] = ()
    features: Mapping[str, float] = field(default_factory=dict)

    @property
    def confidence(self) -> float:
        return self.score


@dataclass(slots=True)
class DynamicTranslationModel:
    """Dynamic model responsible for optimising translation candidates."""

    weights: Mapping[str, float] = field(
        default_factory=lambda: {
            "memory_quality": 0.45,
            "memory_similarity": 0.35,
            "glossary_coverage": 0.15,
            "fallback_bias": 0.35,
            "length_penalty": -0.25,
        }
    )
    min_memory_score: float = 0.75
    length_penalty_reference: int = 320
    translator: Callable[[str, str, str], str] | None = None
    _cache: MutableMapping[tuple[str, str, str], str] = field(
        init=False, repr=False, default_factory=dict
    )

    def __post_init__(self) -> None:
        self.weights = dict(self.weights)
        self._cache = {}

    def configure_translator(
        self, translator: Callable[[str, str, str], str] | None
    ) -> None:
        """Configure the translator callable and clear caches."""

        self.translator = translator
        self._cache.clear()

    def clear_cache(self) -> None:
        """Clear cached translator outputs."""

        self._cache.clear()

    def translate(
        self,
        request: TranslationRequest,
        memory: TranslationMemory,
        glossary: Glossary,
    ) -> CandidateTranslation:
        """Return the highest scoring candidate for ``request``."""

        memory_candidate = self._memory_candidate(request, memory, glossary)
        fallback_candidate = self._fallback_candidate(request, glossary)

        candidates = [
            candidate
            for candidate in (memory_candidate, fallback_candidate)
            if candidate is not None
        ]
        if not candidates:
            raise ValueError("Unable to generate translation candidates")
        return max(candidates, key=lambda candidate: candidate.score)

    def post_edit_instructions(
        self, candidate: CandidateTranslation, request: TranslationRequest
    ) -> tuple[str, ...]:
        """Produce context-sensitive post-editing instructions."""

        instructions: list[str] = []

        if candidate.origin == "machine":
            instructions.append(
                "Perform human review to ensure fluency and contextual accuracy."
            )
        if candidate.applied_memory and candidate.applied_memory.quality_score < 0.9:
            instructions.append(
                "Validate translation memory segment due to suboptimal quality score."
            )
        if candidate.glossary_terms:
            terms = ", ".join(
                sorted({entry.source_term for entry in candidate.glossary_terms})
            )
            instructions.append(f"Confirm glossary terminology usage ({terms}).")
        if request.domain:
            instructions.append(
                f"Ensure terminology aligns with the {request.domain} domain."
            )
        if not instructions:
            instructions.append("Perform final proofreading for formatting consistency.")

        deduped: list[str] = []
        seen: set[str] = set()
        for instruction in instructions:
            if instruction not in seen:
                seen.add(instruction)
                deduped.append(instruction)
        return tuple(deduped)

    def _memory_candidate(
        self,
        request: TranslationRequest,
        memory: TranslationMemory,
        glossary: Glossary,
    ) -> CandidateTranslation | None:
        entry = memory.lookup(
            request.text,
            request.source_language,
            request.target_language,
            min_score=self.min_memory_score,
        )
        if not entry:
            return None

        translated_text = glossary.apply(entry.target_text)
        matches = glossary.find_matches(translated_text)
        coverage = glossary.coverage(matches)
        similarity = entry.similarity(request.text, request.source_language)

        features = {
            "memory_quality": entry.quality_score,
            "memory_similarity": similarity,
            "glossary_coverage": coverage,
        }
        score = self._score(features, base=0.25)
        return CandidateTranslation(
            translated_text=translated_text,
            score=score,
            origin="memory",
            applied_memory=entry,
            glossary_terms=matches,
            features=dict(features),
        )

    def _fallback_candidate(
        self, request: TranslationRequest, glossary: Glossary
    ) -> CandidateTranslation:
        raw_translation = self._translate(
            request.text, request.source_language, request.target_language
        )
        translated_text = glossary.apply(raw_translation)
        matches = glossary.find_matches(translated_text)
        coverage = glossary.coverage(matches)
        penalty = self._length_penalty(translated_text)

        features = {
            "fallback_bias": 1.0,
            "glossary_coverage": coverage,
            "length_penalty": penalty,
        }
        score = self._score(features, base=0.2)
        return CandidateTranslation(
            translated_text=translated_text,
            score=score,
            origin="machine",
            glossary_terms=matches,
            features=dict(features),
        )

    def _score(self, features: Mapping[str, float], *, base: float = 0.0) -> float:
        score = base
        for key, value in features.items():
            weight = self.weights.get(key)
            if weight is None:
                continue
            score += value * weight
        return self._clamp(score)

    @staticmethod
    def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
        return max(minimum, min(maximum, value))

    def _length_penalty(self, text: str) -> float:
        length = len(text)
        if length <= 0:
            return 0.0
        if length <= self.length_penalty_reference:
            return 0.0
        overflow = length - self.length_penalty_reference
        return min(1.0, overflow / self.length_penalty_reference)

    def _translate(self, text: str, source: str, target: str) -> str:
        key = (text, source, target)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        if self.translator is None:
            translated = f"[{source}->{target}] {text}"
        else:
            try:
                translated = self.translator(text, source, target)
            except Exception:
                translated = f"[{source}->{target}] {text}"
        self._cache[key] = translated
        return translated

