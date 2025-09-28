"""Helper utilities for working with metadata payloads."""

from __future__ import annotations

from typing import Any, Dict, Mapping

from .engine import ensure_metadata_mapping, merge_metadata_dicts

__all__ = ["ensure_metadata_mapping", "merge_metadata"]


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, (str, bytes)):
        return not value.strip()
    if isinstance(value, Mapping):
        return not any(not _is_empty(item) for item in value.values())
    if isinstance(value, (list, tuple, set, frozenset)):
        return not any(not _is_empty(item) for item in value)
    return False


def merge_metadata(*sources: Mapping[str, Any] | None, trim_empty: bool = True) -> Dict[str, Any]:
    """Merge metadata sources into a single dictionary."""

    merged = merge_metadata_dicts(*sources)
    if trim_empty:
        merged = {key: value for key, value in merged.items() if not _is_empty(value)}
    return merged

