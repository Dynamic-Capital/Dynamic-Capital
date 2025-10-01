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
from typing import Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Set
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
PAGE_PATTERN = re.compile(r"Radheef page:\s*(\d+)")


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


@dataclass
class WriteStats:
    """Capture summary details from a corpus write."""

    entries: int = 0
    batches: int = 0
    last_page: Optional[int] = None


def write_corpus(
    entries: Iterable[RadheefEntry],
    output_path: Path,
    *,
    batch_size: Optional[int] = None,
    max_batches: Optional[int] = None,
) -> WriteStats:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    stats = WriteStats()
    stop_requested = False
    with output_path.open("w", encoding="utf-8") as handle:
        if batch_size and batch_size > 0:
            batch: List[RadheefEntry] = []
            batch_number = 1
            for entry in entries:
                batch.append(entry)
                if len(batch) == batch_size:
                    stats.entries += _write_batch(batch, handle)
                    stats.batches += 1
                    stats.last_page = batch[-1].page
                    print(
                        f"Wrote batch {batch_number} with {len(batch)} entries",
                        file=sys.stderr,
                    )
                    batch_number += 1
                    batch = []
                    if max_batches and stats.batches >= max_batches:
                        stop_requested = True
                        break
            if batch:
                if not stop_requested or (max_batches and stats.batches < max_batches):
                    stats.entries += _write_batch(batch, handle)
                    stats.batches += 1
                    stats.last_page = batch[-1].page
                    print(
                        f"Wrote batch {batch_number} with {len(batch)} entries",
                        file=sys.stderr,
                    )
                else:
                    print(
                        "Discarding partial batch to honour max batch limit",
                        file=sys.stderr,
                    )
        else:
            for entry in entries:
                if max_batches and stats.batches >= max_batches:
                    stop_requested = True
                    break
                stats.entries += _write_batch([entry], handle)
                stats.batches += 1
                stats.last_page = entry.page
    return stats


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
    parser.add_argument(
        "--max-batches",
        type=int,
        default=0,
        help=(
            "Maximum number of batches to process before exiting. "
            "Use alongside --batch-size to crawl incrementally."
        ),
    )
    parser.add_argument(
        "--report-missing",
        action="store_true",
        help=(
            "Summarise missing Radheef pages from existing corpus files "
            "instead of performing a new crawl."
        ),
    )
    parser.add_argument(
        "--coverage-input",
        type=Path,
        action="append",
        help="Existing JSONL corpus file(s) to analyse when reporting coverage.",
    )
    parser.add_argument(
        "--coverage-start",
        type=int,
        default=1,
        help="First Radheef page to consider when reporting coverage.",
    )
    parser.add_argument(
        "--coverage-end",
        type=int,
        default=0,
        help="Last Radheef page to consider when reporting coverage.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Iterable[str]] = None) -> None:
    args = parse_args(argv)
    if args.report_missing:
        coverage_files = args.coverage_input or []
        if not coverage_files:
            raise SystemExit(
                "--report-missing requires at least one --coverage-input file"
            )
        if args.coverage_end <= 0:
            raise SystemExit(
                "--report-missing requires --coverage-end to define the range"
            )

        coverage = collect_page_coverage(coverage_files)
        start_page = args.coverage_start
        end_page = args.coverage_end
        missing = missing_pages(coverage, start_page, end_page)
        if missing:
            ranges = format_page_ranges(missing)
            print(
                (
                    f"Missing Radheef pages between {start_page}-{end_page}: "
                    + ", ".join(ranges)
                )
            )
            print(
                "Provide the reported pages to the extractor to backfill the corpus.",
                file=sys.stderr,
            )
        else:
            print(
                f"All Radheef pages between {start_page}-{end_page} are covered."
            )
        return
    entries = iter_entries(
        start_page=args.start_page,
        end_page=args.end_page,
        delay=args.delay,
    )
    stats = write_corpus(
        entries,
        args.output,
        batch_size=args.batch_size,
        max_batches=args.max_batches or None,
    )
    if stats.entries == 0:
        raise SystemExit("No Radheef entries were extracted")
    summary = (
        f"Wrote {stats.entries} Radheef entries across {stats.batches} batches "
        f"to {args.output}"
    )
    if stats.last_page is not None:
        summary += f" (up to page {stats.last_page})"
    print(summary)
    if args.max_batches and stats.batches >= args.max_batches:
        next_page = stats.last_page + 1 if stats.last_page is not None else None
        if next_page is not None:
            print(
                (
                    "Reached the configured batch cap. "
                    f"Re-run with --start-page {next_page} or the last processed page "
                    "to continue."
                ),
                file=sys.stderr,
            )
        else:
            print(
                "Reached the configured batch cap. Re-run with an updated --start-page to continue.",
                file=sys.stderr,
            )


def extract_pages_from_file(path: Path) -> Set[int]:
    """Return the set of Radheef pages referenced in a JSONL corpus file."""

    pages: Set[int] = set()
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            stripped = raw.strip()
            if not stripped:
                continue
            try:
                payload = json.loads(stripped)
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive
                raise ValueError(
                    f"Invalid JSON on line {line_number} of {path}: {exc}"
                ) from exc
            context = payload.get("context")
            if not isinstance(context, str):
                continue
            match = PAGE_PATTERN.search(context)
            if match:
                pages.add(int(match.group(1)))
    return pages


def collect_page_coverage(paths: Sequence[Path]) -> Dict[int, List[Path]]:
    """Map Radheef page numbers to the files that contain them."""

    coverage: Dict[int, List[Path]] = {}
    for path in paths:
        if not path.exists():
            raise FileNotFoundError(f"Corpus file not found: {path}")
        for page in extract_pages_from_file(path):
            coverage.setdefault(page, []).append(path)
    return coverage


def missing_pages(
    coverage: Mapping[int, Sequence[Path]], start: int, end: int
) -> List[int]:
    """Return sorted page numbers missing from the provided coverage map."""

    if end < start:
        raise ValueError("coverage end must be greater than or equal to start")
    return [page for page in range(start, end + 1) if page not in coverage]


def format_page_ranges(pages: Sequence[int]) -> List[str]:
    """Format a sequence of page numbers into consolidated ranges."""

    if not pages:
        return []

    sorted_pages = sorted(set(pages))
    ranges: List[str] = []
    range_start = sorted_pages[0]
    previous = range_start

    for page in sorted_pages[1:]:
        if page == previous + 1:
            previous = page
            continue
        ranges.append(_format_range(range_start, previous))
        range_start = page
        previous = page

    ranges.append(_format_range(range_start, previous))
    return ranges


def _format_range(start: int, end: int) -> str:
    return str(start) if start == end else f"{start}-{end}"


if __name__ == "__main__":
    main()
