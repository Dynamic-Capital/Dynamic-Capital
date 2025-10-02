"""Extract Dhivehi translations from the Bakurube Qur'an PDF corpus."""
from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterator, Sequence
from urllib.parse import quote

import requests
from PyPDF2 import PdfReader

ARCHIVE_ITEM = "BakurubeTranslationDhivehi"
VOLUME_FILES: dict[str, str] = {
    "1-15": "1-15 (25 April 2011).pdf",
    "16-30": "16-30 (25 April 2011).pdf",
}
TAGS = ("religious", "quran", "dhivehi", "translation", "bakurube")
_ZERO_WIDTH = {"\u200c", "\u200d", "\u200e", "\u200f", "\ufeff"}
_ALLOWED_PUNCTUATION = {
    "!",
    "?",
    ",",
    ";",
    ":",
    ".",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "«",
    "»",
    "'",
    '"',
    "-",
    "–",
    "—",
    "…",
    "/",
    "٪",
    "%",
    "+",
}


@dataclass(slots=True)
class BakurubeEntry:
    identifier: str
    arabic: str
    dhivehi: str
    volume: str
    page: int
    line: int
    source_url: str

    def as_payload(self) -> dict[str, object]:
        context_lines = [
            f"Source: {self.source_url}",
            f"Volume: {self.volume}",
            f"Page: {self.page}",
            f"Entry: {self.identifier}",
        ]
        prompt = f"Translate the following Arabic Qur'an excerpt into Dhivehi: {self.arabic}"
        return {
            "prompt": prompt,
            "response": self.dhivehi,
            "context": "\n".join(context_lines),
            "language": "dv",
            "tags": list(TAGS),
        }


def build_download_url(file_name: str) -> str:
    encoded = quote(file_name, safe="")
    return f"https://archive.org/download/{ARCHIVE_ITEM}/{encoded}"


def download_pdf(file_name: str) -> tuple[BytesIO, str]:
    url = build_download_url(file_name)
    try:
        response = requests.get(url, stream=True, timeout=60)
    except requests.RequestException as error:  # pragma: no cover - network failure
        raise RuntimeError(f"Failed to download {file_name} from Internet Archive: {error}") from error
    if response.status_code != 200:
        raise RuntimeError(f"Archive request for {file_name} failed with status {response.status_code}")
    buffer = BytesIO()
    for chunk in response.iter_content(chunk_size=1_048_576):
        if chunk:
            buffer.write(chunk)
    buffer.seek(0)
    return buffer, url


def _normalise_line(text: str, *, allowed_scripts: tuple[str, ...]) -> str:
    parts: list[str] = []
    for char in text:
        if char == "=":
            continue
        if char in _ZERO_WIDTH:
            continue
        category = unicodedata.category(char)
        if category == "Co":
            continue
        if category.startswith("Z"):
            parts.append(" ")
            continue
        if char.isdigit():
            parts.append(char)
            continue
        name = unicodedata.name(char, "")
        if any(script in name for script in allowed_scripts):
            parts.append(char)
            continue
        if name.startswith("ARABIC-INDIC DIGIT") or name.startswith("EASTERN ARABIC-INDIC DIGIT"):
            parts.append(char)
            continue
        if char in _ALLOWED_PUNCTUATION:
            parts.append(char)
            continue
    collapsed = " ".join("".join(parts).split())
    return collapsed.strip(" -–—/:;,.%")


def _contains_range(text: str, start: int, end: int) -> bool:
    return any(start <= ord(char) <= end for char in text)


def _has_arabic(text: str) -> bool:
    return _contains_range(text, 0x0600, 0x06FF) or _contains_range(text, 0x0750, 0x077F)


def _has_thaana(text: str) -> bool:
    return _contains_range(text, 0x0780, 0x07BF)


def _arabic_letter_count(text: str) -> int:
    count = 0
    for char in text:
        code = ord(char)
        if (0x0600 <= code <= 0x06FF or 0x0750 <= code <= 0x077F) and unicodedata.category(char).startswith("L"):
            count += 1
    return count


def _thaana_letter_count(text: str) -> int:
    count = 0
    for char in text:
        code = ord(char)
        if 0x0780 <= code <= 0x07BF and unicodedata.category(char).startswith("L"):
            count += 1
    return count


def extract_entries(reader: PdfReader, *, volume: str, source_url: str) -> Iterator[BakurubeEntry]:
    for page_index, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        if not raw_text:
            continue
        for line_index, raw_line in enumerate(raw_text.splitlines(), start=1):
            if "=" not in raw_line:
                continue
            arabic_raw, dhivehi_raw = raw_line.split("=", 1)
            arabic = _normalise_line(arabic_raw, allowed_scripts=("ARABIC",))
            dhivehi = _normalise_line(dhivehi_raw, allowed_scripts=("ARABIC", "THAANA"))
            if not arabic or not dhivehi:
                continue
            if not _has_arabic(arabic) or _arabic_letter_count(arabic) < 2:
                continue
            if not _has_thaana(dhivehi) or _thaana_letter_count(dhivehi) < 2:
                continue
            identifier = f"bakurube-{volume}-p{page_index:04d}-l{line_index:03d}"
            yield BakurubeEntry(
                identifier=identifier,
                arabic=arabic,
                dhivehi=dhivehi,
                volume=volume,
                page=page_index,
                line=line_index,
                source_url=source_url,
            )


def _write_summary(
    *,
    path: Path,
    total: int,
    duplicates: int,
    per_volume: dict[str, int],
) -> None:
    payload = {
        "total_documents": total,
        "duplicates_skipped": duplicates,
        "volumes": per_volume,
        "archive_item": ARCHIVE_ITEM,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract Dhivehi translation pairs from the Bakurube Qur'an PDF volumes.",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Destination JSONL file for the extracted corpus.",
    )
    parser.add_argument(
        "--volume",
        action="append",
        dest="volumes",
        choices=sorted(VOLUME_FILES),
        help="Specific volume to process (default: all volumes). Repeat for multiple volumes.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Optional cap on the number of documents to write across all volumes.",
    )
    parser.add_argument(
        "--summary",
        type=Path,
        help="Optional path to write an extraction summary JSON file.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    volumes: list[str]
    if args.volumes:
        volumes = list(dict.fromkeys(args.volumes))
    else:
        volumes = sorted(VOLUME_FILES)

    output_path = args.output.expanduser()
    summary_path = args.summary.expanduser() if args.summary is not None else None

    seen_pairs: set[tuple[str, str]] = set()
    per_volume_counts: dict[str, int] = {volume: 0 for volume in volumes}
    duplicates = 0
    total_written = 0

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as handle:
        for volume in volumes:
            file_name = VOLUME_FILES[volume]
            pdf_buffer, source_url = download_pdf(file_name)
            reader = PdfReader(pdf_buffer)
            for entry in extract_entries(reader, volume=volume, source_url=source_url):
                pair = (entry.arabic, entry.dhivehi)
                if pair in seen_pairs:
                    duplicates += 1
                    continue
                seen_pairs.add(pair)
                json.dump(entry.as_payload(), handle, ensure_ascii=False)
                handle.write("\n")
                per_volume_counts[volume] += 1
                total_written += 1
                if args.limit is not None and total_written >= args.limit:
                    break
            if args.limit is not None and total_written >= args.limit:
                break

    if summary_path is not None:
        _write_summary(path=summary_path, total=total_written, duplicates=duplicates, per_volume=per_volume_counts)

    print(f"Wrote {total_written} documents to {output_path}")
    print(f"Duplicates skipped: {duplicates}")
    print("Per-volume counts:")
    for volume in volumes:
        print(f"  {volume}: {per_volume_counts[volume]}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    sys.exit(main())
