"""CLI to extract the Holy Quran English translation PDF into page-level JSONL."""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Iterator, Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_corpus_extraction.engine import (  # noqa: E402
    CorpusDocument,
    CorpusExtractionContext,
    DynamicCorpusExtractionEngine,
)


def _load_pdfium() -> Any:
    try:
        import pypdfium2 as pdfium  # type: ignore[import]
    except ModuleNotFoundError as exc:  # pragma: no cover - import guard
        raise RuntimeError(
            "pypdfium2 is required for Holy Quran PDF extraction. Install it with `pip install pypdfium2`."
        ) from exc
    return pdfium


def _extract_page_texts(path: Path) -> list[str]:
    pdfium = _load_pdfium()
    document = pdfium.PdfDocument(str(path))
    try:
        page_texts: list[str] = []
        for page_index in range(len(document)):
            page = document.get_page(page_index)
            textpage = page.get_textpage()
            try:
                text = textpage.get_text_range()
            finally:
                textpage.close()
                page.close()
            page_texts.append(text)
    finally:
        document.close()
    return page_texts


DEFAULT_SOURCE_URL = "https://files.alislam.cloud/pdf/Holy-Quran-English.pdf"
DEFAULT_DOCUMENT_TITLE = "The Holy Quran (English Translation)"
DEFAULT_SOURCE_NAME = "holy-quran-english"
DEFAULT_IDENTIFIER_PREFIX = "holy-quran-english-page"
DEFAULT_TAGS: tuple[str, ...] = ("holy-quran", "english-translation", "pdf-page")


@dataclass(slots=True)
class HolyQuranExtractionOptions:
    """Configuration for extracting the Holy Quran PDF."""

    source_url: str = DEFAULT_SOURCE_URL
    document_title: str = DEFAULT_DOCUMENT_TITLE
    source_name: str = DEFAULT_SOURCE_NAME
    identifier_prefix: str = DEFAULT_IDENTIFIER_PREFIX
    tags: tuple[str, ...] = DEFAULT_TAGS


@dataclass(slots=True)
class HolyQuranExtractionState:
    """Mutable state captured during extraction for reporting purposes."""

    total_pages: int = 0
    empty_pages: int = 0


def _download_pdf(url: str, destination: Path) -> Path:
    """Download ``url`` into ``destination`` returning the saved path."""

    destination.parent.mkdir(parents=True, exist_ok=True)
    request = Request(url, headers={"User-Agent": "DynamicCorpusExtractor/1.0"})
    try:
        with urlopen(request) as response, destination.open("wb") as handle:
            shutil.copyfileobj(response, handle)
    except HTTPError as error:  # pragma: no cover - network failure surface
        raise RuntimeError(
            f"Failed to download {url}: {error.code} {error.reason}"
        ) from error
    except URLError as error:  # pragma: no cover - network failure surface
        raise RuntimeError(f"Failed to download {url}: {error.reason}") from error
    return destination


def _normalise_page_text(text: str) -> str:
    """Collapse whitespace noise while preserving line breaks."""

    cleaned_lines: list[str] = []
    for raw_line in text.splitlines():
        candidate = raw_line.strip()
        if candidate:
            cleaned_lines.append(candidate)
    return "\n".join(cleaned_lines).strip()


def _iter_pdf_documents(
    context: CorpusExtractionContext,
    options: HolyQuranExtractionOptions,
    state: HolyQuranExtractionState,
) -> Iterator[CorpusDocument]:
    """Yield ``CorpusDocument`` instances for each non-empty PDF page."""

    with TemporaryDirectory() as temp_dir:
        pdf_path = Path(temp_dir) / "holy-quran-english.pdf"
        _download_pdf(options.source_url, pdf_path)
        page_texts = _extract_page_texts(pdf_path)
        total_pages = len(page_texts)
        state.total_pages = total_pages

        emitted = 0
        empty_pages = 0
        limit = context.limit

        for page_number, raw_text in enumerate(page_texts, start=1):
            if page_number % 25 == 0:
                print(
                    f"Processed {page_number}/{total_pages} pages from {options.source_name}",
                    flush=True,
                )
            content = _normalise_page_text(raw_text or "")
            if not content:
                empty_pages += 1
                continue

            metadata = {
                "page_number": page_number,
                "pages_total": total_pages,
                "source_url": options.source_url,
                "document_title": options.document_title,
            }
            document = CorpusDocument(
                identifier=f"{options.identifier_prefix}-{page_number:03d}",
                content=content,
                source=options.source_name,
                metadata=metadata,
                tags=options.tags,
            )
            yield document
            emitted += 1

            if limit is not None and emitted >= limit:
                break

        state.empty_pages = empty_pages


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI argument parser."""

    parser = argparse.ArgumentParser(
        description=(
            "Extract the Holy Quran English translation PDF into JSONL documents "
            "with one entry per non-empty page."
        )
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/knowledge_base/research/processed/holy_quran_english.jsonl"),
        help="Destination JSONL file for the extracted pages.",
    )
    parser.add_argument(
        "--summary",
        type=Path,
        default=Path("data/knowledge_base/research/processed/holy_quran_english_summary.json"),
        help="Optional path to write a JSON summary of the extraction run.",
    )
    parser.add_argument(
        "--sample",
        type=Path,
        help="Optional path to write a sample JSONL file containing the first N documents.",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=5,
        help="Number of documents to include when writing the sample file (default: 5).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of documents to export (useful for sampling).",
    )
    parser.add_argument(
        "--source-url",
        type=str,
        default=DEFAULT_SOURCE_URL,
        help="Override the Holy Quran PDF URL (defaults to the Al Islam distribution URL).",
    )
    return parser


def run(args: argparse.Namespace) -> int:
    """Execute the extraction workflow and return the exported count."""

    options = HolyQuranExtractionOptions(source_url=args.source_url)
    state = HolyQuranExtractionState()

    engine = DynamicCorpusExtractionEngine()
    engine.register_source(
        options.source_name,
        lambda ctx: _iter_pdf_documents(ctx, options, state),
        tags=options.tags,
        metadata={
            "source_url": options.source_url,
            "document_title": options.document_title,
        },
    )

    summary = engine.extract(
        sources=(options.source_name,),
        limit=args.limit,
        metadata={"source_url": options.source_url},
    )
    exported = summary.export_jsonl(args.output)

    if args.summary:
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        payload = summary.as_dict()
        payload.update(
            {
                "documents_exported": exported,
                "source_url": options.source_url,
                "document_title": options.document_title,
                "total_pages": state.total_pages,
                "empty_pages": state.empty_pages,
                "limit": args.limit,
            }
        )
        args.summary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    if args.sample and summary.documents:
        sample_size = max(1, args.sample_size)
        sample_documents = summary.documents[:sample_size]
        args.sample.parent.mkdir(parents=True, exist_ok=True)
        with args.sample.open("w", encoding="utf-8") as handle:
            for document in sample_documents:
                json.dump(document.as_payload(), handle, ensure_ascii=False)
                handle.write("\n")

    return exported


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    exported = run(args)
    print(f"Exported {exported} documents to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
