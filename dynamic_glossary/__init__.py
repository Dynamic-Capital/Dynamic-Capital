"""Dynamic glossary intelligence toolkit."""

from .dynamic_academy import (
    DATA_PATH as DYNAMIC_ACADEMY_DATA_PATH,
    build_glossary as build_dynamic_academy_glossary,
    load_dataset as load_dynamic_academy_dataset,
    load_entries as load_dynamic_academy_entries,
)
from .glossary import (
    GlossaryDigest,
    GlossaryEntry,
    GlossarySnapshot,
    DynamicGlossary,
)

__all__ = [
    "GlossaryDigest",
    "GlossaryEntry",
    "GlossarySnapshot",
    "DynamicGlossary",
    "DYNAMIC_ACADEMY_DATA_PATH",
    "build_dynamic_academy_glossary",
    "load_dynamic_academy_dataset",
    "load_dynamic_academy_entries",
]
