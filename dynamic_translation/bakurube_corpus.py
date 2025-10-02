"""Utility helpers for the Bakurube Dhivehi translation corpus."""

from __future__ import annotations

from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from typing import Generator, Iterator, Literal, Sequence, TextIO

import lzma

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
CorpusSegment = Literal["1-15", "16-30"]

_CORPUS_FILENAMES: dict[CorpusSegment, str] = {
    "1-15": "data/dhivehi/bakurube_translation_1-15.txt",
    "16-30": "data/dhivehi/bakurube_translation_16-30.txt",
}


def available_segments() -> tuple[CorpusSegment, ...]:
    """Return a tuple of supported Bakurube corpus segment identifiers."""

    return tuple(_CORPUS_FILENAMES.keys())


def get_corpus_path(segment: CorpusSegment = "1-15") -> Path:
    """Return the absolute path to a Bakurube corpus excerpt.

    The corpus assets are stored in plain UTF-8 text within the repository,
    with optional ``.xz`` variants supported for callers who need to work with
    a compressed export. Callers should prefer :func:`iter_corpus_lines` unless
    they need direct filesystem access.

    Raises:
        FileNotFoundError: If the corpus file is missing from the repository.
        ValueError: If ``segment`` is not one of the known corpus segments.
    """

    try:
        base_filename = _CORPUS_FILENAMES[segment]
    except KeyError as error:
        raise ValueError(
            f"Unsupported corpus segment '{segment}'. "
            f"Available segments: {', '.join(available_segments())}"
        ) from error

    candidates = (
        Path(base_filename),
        Path(f"{base_filename}.xz"),
    )
    for candidate in candidates:
        corpus_path = PACKAGE_ROOT / candidate
        if corpus_path.is_file():
            return corpus_path

    raise FileNotFoundError(
        "Bakurube corpus excerpt is not available in either plain text or "
        "compressed form."
    )


@contextmanager
def _open_corpus(segment: CorpusSegment) -> Generator[TextIO, None, None]:
    """Yield a text handle for the requested corpus segment."""

    path = get_corpus_path(segment)
    if path.suffix == ".xz":
        with lzma.open(path, mode="rt", encoding="utf-8") as handle:
            yield handle
    else:
        with path.open(encoding="utf-8") as handle:
            yield handle


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

    with _open_corpus(segment) as handle:
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
