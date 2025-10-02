"""Dynamic Translation Engine package."""

from .engine import (
    DynamicTranslationEngine,
    DynamicTranslationModel,
    Glossary,
    GlossaryEntry,
    TranslationMemory,
    TranslationMemoryEntry,
    TranslationRequest,
    TranslationResult,
)
from .dhivehi_simulation import (
    SimulationSample,
    build_dhivehi_demo_engine,
    simulate_dhivehi_translation,
)
from .bakurube_corpus import (
    CorpusSegment,
    available_segments,
    corpus_preview,
    get_corpus_path,
    iter_corpus_lines,
)

__all__ = [
    "DynamicTranslationEngine",
    "DynamicTranslationModel",
    "Glossary",
    "GlossaryEntry",
    "TranslationMemory",
    "TranslationMemoryEntry",
    "TranslationRequest",
    "TranslationResult",
    "build_dhivehi_demo_engine",
    "simulate_dhivehi_translation",
    "SimulationSample",
    "CorpusSegment",
    "available_segments",
    "corpus_preview",
    "get_corpus_path",
    "iter_corpus_lines",
]
