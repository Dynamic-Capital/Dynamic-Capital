from __future__ import annotations

import json
from pathlib import Path
import sys


sys.path.append(str(Path(__file__).resolve().parents[1]))

from ml.dhivehi_corpus_extractor import (  # noqa: E402
    collect_page_coverage,
    extract_pages_from_file,
    format_page_ranges,
    missing_pages,
)


def _write_jsonl(path: Path, records: list[dict[str, object]]) -> None:
    path.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n",
        encoding="utf-8",
    )


def test_extract_pages_from_file(tmp_path: Path) -> None:
    sample = tmp_path / "radheef.jsonl"
    _write_jsonl(
        sample,
        [
            {
                "prompt": "Document entry",
                "response": "މިޔަރު",
                "context": "Source: https://radheef.example\nRadheef page: 51",
            },
            {
                "prompt": "Another entry",
                "response": "ބައްދަލު",
                "context": "Source: https://radheef.example\nRadheef page: 52",
            },
        ],
    )

    pages = extract_pages_from_file(sample)
    assert pages == {51, 52}


def test_collect_page_coverage_and_missing(tmp_path: Path) -> None:
    first = tmp_path / "batch_a.jsonl"
    second = tmp_path / "batch_b.jsonl"
    _write_jsonl(
        first,
        [
            {
                "prompt": "Entry A",
                "response": "ހައްދަ",
                "context": "Source: https://radheef.example\nRadheef page: 10",
            },
            {
                "prompt": "Entry B",
                "response": "މަސް",
                "context": "Source: https://radheef.example\nRadheef page: 11",
            },
        ],
    )
    _write_jsonl(
        second,
        [
            {
                "prompt": "Entry C",
                "response": "ސައްދަރާ",
                "context": "Source: https://radheef.example\nRadheef page: 13",
            }
        ],
    )

    coverage = collect_page_coverage([first, second])
    assert coverage[10] == [first]
    assert coverage[13] == [second]

    missing = missing_pages(coverage, 10, 14)
    assert missing == [12, 14]
    assert format_page_ranges(missing) == ["12", "14"]


def test_format_page_ranges_groups_sequences() -> None:
    assert format_page_ranges([1, 2, 3, 5, 7, 8, 9]) == ["1-3", "5", "7-9"]
