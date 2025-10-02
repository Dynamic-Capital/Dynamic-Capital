from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_translation import (  # noqa: E402
    available_segments,
    corpus_preview,
    get_corpus_path,
    iter_corpus_lines,
)


def test_corpus_path_exists() -> None:
    path = get_corpus_path()
    assert path.exists()
    assert path.is_file()


def test_iter_corpus_lines_returns_content() -> None:
    iterator = iter_corpus_lines(limit=3)
    lines = list(iterator)
    assert len(lines) == 3
    for line in lines:
        assert isinstance(line, str)
        assert line


def test_corpus_preview_matches_limit() -> None:
    preview = corpus_preview(limit=2)
    assert isinstance(preview, tuple)
    assert len(preview) == 2
    assert all(isinstance(entry, str) and entry for entry in preview)


def test_corpus_preview_is_cached() -> None:
    first = corpus_preview(limit=3)
    second = corpus_preview(limit=3)
    assert first is second


def test_negative_limit_is_rejected() -> None:
    with pytest.raises(ValueError):
        corpus_preview(limit=-1)
    with pytest.raises(ValueError):
        next(iter_corpus_lines(limit=-1))


def test_additional_segment_metadata() -> None:
    segments = available_segments()
    assert "1-15" in segments
    assert "16-30" in segments


def test_alternate_segment_is_accessible() -> None:
    preview = corpus_preview(limit=3, segment="16-30")
    assert len(preview) == 3
    assert all(isinstance(entry, str) and entry for entry in preview)


def test_unknown_segment_is_rejected() -> None:
    with pytest.raises(ValueError):
        get_corpus_path(segment="99-105")  # type: ignore[arg-type]
