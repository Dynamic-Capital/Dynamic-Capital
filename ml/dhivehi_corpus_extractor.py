"""Radheef Dhivehi corpus extraction utilities."""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Iterator, List, Optional, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

BASE_URL = "https://www.radheef.info/index.php"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)
DEFAULT_DELAY = 0.4


@dataclass
class RadheefEntry:
    """Structured representation of a Radheef dictionary record."""

    word: str
    detail: str
    url: str
    page: int

    def to_training_example(self) -> dict[str, object]:
        """Convert the entry into a Dynamic Capital corpus JSONL payload."""

        prompt = f"Document the Dhivehi dictionary entry for \"{self.word}\"."
        context_lines = [
            f"Source: {self.url}",
            f"Radheef page: {self.page}",
        ]
        context = "\n".join(context_lines)
        tags = ["dictionary", "dhivehi", "lexicon"]
        return {
            "prompt": prompt,
            "response": self.detail,
            "context": context,
            "language": "dv",
            "tags": tags,
        }


class _RadheefHTMLParser(HTMLParser):
    """Parse Radheef listing HTML to extract dictionary entries."""

    def __init__(self) -> None:
        super().__init__()
        self.entries: List[RadheefEntry] = []
        self._in_box = False
        self._box_depth = 0
        self._in_heading = False
        self._in_detail = False
        self._current_word: List[str] = []
        self._current_detail: List[str] = []
        self._current_page = 0
        self._base_url = BASE_URL

    def feed_with_metadata(self, html: str, *, page: int, base_url: str) -> None:
        self.entries = []
        self._current_page = page
        self._base_url = base_url
        self.feed(html)

    # HTMLParser interface -------------------------------------------------
    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        attr_map = {key: value for key, value in attrs}
        if tag == "div" and attr_map.get("class") == "box_green":
            self._start_entry()
            return
        if not self._in_box:
            return
        if tag == "div":
            self._box_depth += 1
            if attr_map.get("class") == "heading":
                self._in_heading = True
            elif attr_map.get("class") == "detail":
                self._in_detail = True
        elif tag == "a" and self._in_heading:
            href = attr_map.get("href")
            if href:
                self._base_url = urljoin(BASE_URL, href)
        elif tag == "br" and self._in_detail:
            self._append_detail("\n")

    def handle_endtag(self, tag: str) -> None:
        if not self._in_box:
            return
        if tag == "div":
            if self._in_heading:
                self._in_heading = False
            if self._in_detail:
                # Details are contained in a nested div; closing tag ends detail.
                self._in_detail = False
            if self._box_depth > 0:
                self._box_depth -= 1
            if self._box_depth == 0:
                self._end_entry()

    def handle_data(self, data: str) -> None:
        if not data.strip():
            return
        if self._in_heading:
            self._current_word.append(data.strip())
        elif self._in_detail:
            self._append_detail(data)

    def handle_entityref(self, name: str) -> None:  # pragma: no cover - thin wrapper
        text = self.unescape(f"&{name};")
        if self._in_detail:
            self._append_detail(text)
        elif self._in_heading:
            self._current_word.append(text)

    def handle_charref(self, name: str) -> None:  # pragma: no cover - thin wrapper
        text = self.unescape(f"&#{name};")
        if self._in_detail:
            self._append_detail(text)
        elif self._in_heading:
            self._current_word.append(text)

    # Helpers --------------------------------------------------------------
    def _start_entry(self) -> None:
        self._in_box = True
        self._box_depth = 1
        self._in_heading = False
        self._in_detail = False
        self._current_word = []
        self._current_detail = []

    def _append_detail(self, chunk: str) -> None:
        if chunk == "\n":
            self._current_detail.append("\n")
            return
        cleaned = chunk.strip()
        if cleaned:
            self._current_detail.append(cleaned)

    def _end_entry(self) -> None:
        word = " ".join(part for part in self._current_word if part).strip()
        detail = self._normalise_detail(self._current_detail)
        url = self._base_url
        if word and detail:
            self.entries.append(
                RadheefEntry(
                    word=word,
                    detail=detail,
                    url=url,
                    page=self._current_page,
                )
            )
        self._in_box = False
        self._box_depth = 0
        self._in_heading = False
        self._in_detail = False
        self._current_word = []
        self._current_detail = []

    @staticmethod
    def _normalise_detail(chunks: Iterable[str]) -> str:
        text = ""
        for chunk in chunks:
            if chunk == "\n":
                text = text.rstrip() + "\n"
                continue
            if text and not text.endswith(("\n", " ")):
                text += " "
            text += chunk.strip()
        # Normalise whitespace while keeping intentional line breaks.
        lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
        return "\n".join(line for line in lines if line)


def discover_total_pages(html: str) -> Optional[int]:
    """Attempt to read the last pagination number from HTML."""

    matches = re.findall(r"index\\.php\?[^']*p=(\d+)'>&raquo;", html)
    if not matches:
        return None
    return max(int(match) for match in matches)


def fetch_page(page: int, *, timeout: float = 30.0) -> str:
    """Fetch a Radheef result page as UTF-8 text."""

    params = {"p": page}
    url = f"{BASE_URL}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:  # noqa: S310 - controlled domain
        content_type = response.headers.get("Content-Type", "")
        encoding = "utf-8"
        if "charset" in content_type:
            parts = content_type.split("charset=")
            if len(parts) > 1:
                encoding = parts[1].split(";")[0].strip()
        raw = response.read()
        return raw.decode(encoding, errors="ignore")


def iter_entries(
    start_page: int = 1,
    end_page: Optional[int] = None,
    *,
    delay: float = DEFAULT_DELAY,
) -> Iterator[RadheefEntry]:
    """Yield entries from Radheef between ``start_page`` and ``end_page``."""

    current_page = start_page
    parser = _RadheefHTMLParser()
    last_page = end_page

    while True:
        try:
            html = fetch_page(current_page)
        except (HTTPError, URLError) as exc:
            print(f"Failed to fetch page {current_page}: {exc}", file=sys.stderr)
            break
        parser.feed_with_metadata(html, page=current_page, base_url=f"{BASE_URL}?p={current_page}")
        if last_page is None:
            last_page = discover_total_pages(html)
        page_entries = parser.entries
        if not page_entries:
            break
        for entry in page_entries:
            yield entry
        if last_page is not None and current_page >= last_page:
            break
        current_page += 1
        if delay:
            time.sleep(delay)


def _write_batch(
    batch: Sequence[RadheefEntry],
    handle,
) -> int:
    written = 0
    for entry in batch:
        payload = entry.to_training_example()
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
        written += 1
    return written


def write_corpus(
    entries: Iterable[RadheefEntry],
    output_path: Path,
    *,
    batch_size: Optional[int] = None,
) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output_path.open("w", encoding="utf-8") as handle:
        if batch_size and batch_size > 0:
            batch: List[RadheefEntry] = []
            batch_number = 1
            for entry in entries:
                batch.append(entry)
                if len(batch) == batch_size:
                    count += _write_batch(batch, handle)
                    print(
                        f"Wrote batch {batch_number} with {len(batch)} entries",
                        file=sys.stderr,
                    )
                    batch_number += 1
                    batch = []
            if batch:
                count += _write_batch(batch, handle)
                print(
                    f"Wrote batch {batch_number} with {len(batch)} entries",
                    file=sys.stderr,
                )
        else:
            for entry in entries:
                count += _write_batch([entry], handle)
    return count


def parse_args(argv: Optional[Iterable[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract Dhivehi Radheef dictionary entries")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/dhivehi_radheef.jsonl"),
        help="Destination JSONL path",
    )
    parser.add_argument("--start-page", type=int, default=1, help="First page to fetch (1-indexed)")
    parser.add_argument(
        "--end-page",
        type=int,
        default=None,
        help="Optional last page to fetch. When omitted the extractor walks until pagination ends.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help="Seconds to wait between page fetches to avoid overwhelming the server.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=0,
        help="Number of entries to write per batch. Defaults to streaming all entries individually.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Iterable[str]] = None) -> None:
    args = parse_args(argv)
    entries = iter_entries(
        start_page=args.start_page,
        end_page=args.end_page,
        delay=args.delay,
    )
    total = write_corpus(entries, args.output, batch_size=args.batch_size)
    if total == 0:
        raise SystemExit("No Radheef entries were extracted")
    print(f"Wrote {total} Radheef entries to {args.output}")


if __name__ == "__main__":
    main()
