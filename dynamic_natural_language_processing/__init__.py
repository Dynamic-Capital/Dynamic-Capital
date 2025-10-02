"""Dhivehi-centric natural language processing primitives."""

from .dhivehi import (
    DhivehiLanguageProfile,
    DhivehiMorphology,
    DhivehiNormalizer,
    DhivehiNLPipeline,
    DhivehiStopwords,
    DhivehiTokenizer,
    DhivehiTransliterator,
    detect_script,
)

__all__ = [
    "DhivehiLanguageProfile",
    "DhivehiMorphology",
    "DhivehiNormalizer",
    "DhivehiNLPipeline",
    "DhivehiStopwords",
    "DhivehiTokenizer",
    "DhivehiTransliterator",
    "detect_script",
]
