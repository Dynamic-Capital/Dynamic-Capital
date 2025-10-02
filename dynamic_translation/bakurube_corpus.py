"""Utility helpers for the Bakurube Dhivehi translation corpus."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Iterator, Sequence
from typing import Literal

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
CorpusSegment = Literal["1-15", "16-30"]

_CORPUS_FILES: dict[CorpusSegment, Path] = {
    "1-15": Path("data/dhivehi/bakurube_translation_1-15.txt"),
    "16-30": Path("data/dhivehi/bakurube_translation_16-30.txt"),
}


def available_segments() -> tuple[CorpusSegment, ...]:
    """Return a tuple of supported Bakurube corpus segment identifiers."""

    return tuple(_CORPUS_FILES.keys())


def get_corpus_path(segment: CorpusSegment = "1-15") -> Path:
    """Return the absolute path to a Bakurube corpus excerpt.

    Raises:
        FileNotFoundError: If the corpus file is missing from the repository.
        ValueError: If ``segment`` is not one of the known corpus segments.
    """

    try:
        relative_path = _CORPUS_FILES[segment]
    except KeyError as error:
        raise ValueError(
            f"Unsupported corpus segment '{segment}'. "
            f"Available segments: {', '.join(available_segments())}"
        ) from error

    corpus_path = PACKAGE_ROOT / relative_path
    if not corpus_path.is_file():
        raise FileNotFoundError(
            f"Bakurube corpus excerpt is not available at {corpus_path}"
        )
    return corpus_path


def iter_corpus_lines(
    *,
    strip: bool = True,
    skip_empty: bool = True,
    limit: int | None = None,
    segment: CorpusSegment = "1-15",
) -> Iterator[str]:
    """Iterate over raw lines from the Bakurube corpus.

    Args:
        strip: Whether to strip leading and trailing whitespace from each line.
        skip_empty: Whether to omit empty lines after stripping.
        limit: Optional cap on the number of lines to yield.
        segment: Identifier of the corpus excerpt to read.
    """

    if limit is not None and limit < 0:
        raise ValueError("limit must be non-negative")

    path = get_corpus_path(segment)
    with path.open(encoding="utf-8") as handle:
        remaining = limit
        for line in handle:
            if strip:
                line = line.strip()
            if skip_empty and not line:
                continue
            yield line
            if remaining is not None:
                remaining -= 1
                if remaining == 0:
                    break


@lru_cache(maxsize=16)
def corpus_preview(limit: int = 5, *, segment: CorpusSegment = "1-15") -> Sequence[str]:
    """Return the first ``limit`` lines from the corpus."""

    if limit < 0:
        raise ValueError("limit must be non-negative")
    return tuple(iter_corpus_lines(limit=limit, segment=segment))
