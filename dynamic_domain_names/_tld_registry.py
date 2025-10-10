"""Utilities for working with recognised top-level domains."""

from __future__ import annotations

from functools import lru_cache
from importlib import resources

_DATA_FILE = "data/iana_tlds.txt"


def _load_registry() -> set[str]:
    data = resources.files(__package__).joinpath(_DATA_FILE).read_text(encoding="utf-8")
    tlds: set[str] = set()
    for line in data.splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#"):
            continue
        tlds.add(f".{entry.lower()}")
    return tlds


@lru_cache(maxsize=1)
def get_known_tlds() -> set[str]:
    """Return the cached set of recognised IANA TLDs."""

    return _load_registry()


def is_known_tld(tld: str) -> bool:
    """Return ``True`` if *tld* exists in the IANA registry."""

    if not tld:
        return False
    cleaned = tld.strip().lower()
    if not cleaned:
        return False
    if not cleaned.startswith("."):
        cleaned = f".{cleaned}"
    return cleaned in get_known_tlds()
