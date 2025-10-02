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
]
