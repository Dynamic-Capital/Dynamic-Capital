"""Generate page-level corpora from mirrored knowledge base books."""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Iterable

from pdf_batch_extractor import ExtractionResult, ProcessingStats, process_pdfs

DEFAULT_PDF_DIR = Path("data/knowledge_base/books/raw")
DEFAULT_OUTPUT_DIR = Path("data/knowledge_base/books/extracted")
DEFAULT_JSONL_PATH = Path("data/knowledge_base/books/processed/books_corpus.jsonl")
DEFAULT_SUMMARY_PATH = Path("data/knowledge_base/books/processed/books_corpus_summary.json")


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _normalise_text(value: str) -> str:
    return " ".join(value.split())


def generate_books_corpus(
    pdf_directory: Path = DEFAULT_PDF_DIR,
    *,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    jsonl_path: Path = DEFAULT_JSONL_PATH,
    summary_path: Path | None = DEFAULT_SUMMARY_PATH,
    batch_size: int = 12,
    max_workers: int = 4,
    structured: bool = True,
    recursive: bool = True,
    skip_existing: bool = True,
    log_level: str | int = "INFO",
) -> dict[str, object]:
    """Run the PDF extractor against the books directory and emit a corpus."""

    logging.basicConfig(level=getattr(logging, str(log_level).upper(), logging.INFO), format="%(message)s")

    pdf_directory = pdf_directory.expanduser()
    output_dir = output_dir.expanduser()
    jsonl_path = jsonl_path.expanduser()
    if summary_path is not None:
        summary_path = summary_path.expanduser()

    text_dir = output_dir / "text"
    table_dir = output_dir / "tables"

    _ensure_parent(jsonl_path)
    if summary_path is not None:
        _ensure_parent(summary_path)

    records_written = 0
    tables_written = 0

    if jsonl_path.exists():
        jsonl_path.unlink()

    with jsonl_path.open("w", encoding="utf-8") as jsonl_handle:

        def on_result(result: ExtractionResult) -> None:
            nonlocal records_written, tables_written

            page_texts = result.page_texts or []
            if not page_texts and result.text is not None:
                page_texts = [result.text]

            tables_by_page: dict[int, list[dict[str, object]]] = {}
            if result.tables:
                tables_written += len(result.tables)
                for table in result.tables:
                    payload = {"headers": table.headers, "rows": table.rows}
                    tables_by_page.setdefault(table.page, []).append(payload)

            for page_number, page_text in enumerate(page_texts, start=1):
                payload: dict[str, object] = {
                    "source": result.source.name,
                    "source_path": str(result.source),
                    "page": page_number,
                    "text": _normalise_text(page_text),
                }
                if tables_by_page:
                    tables = tables_by_page.get(page_number)
                    if tables:
                        payload["tables"] = tables
                jsonl_handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
                records_written += 1

        stats: ProcessingStats = process_pdfs(
            pdf_directory,
            output_dir=output_dir,
            batch_size=batch_size,
            max_workers=max_workers,
            structured=structured,
            recursive=recursive,
            skip_existing=skip_existing,
            on_result=on_result,
        )

    summary: dict[str, object] = {
        "pdf_directory": str(pdf_directory),
        "output_dir": str(output_dir),
        "text_dir": str(text_dir),
        "table_dir": str(table_dir),
        "jsonl_path": str(jsonl_path),
        "batch_size": batch_size,
        "max_workers": max_workers,
        "structured": structured,
        "recursive": recursive,
        "skip_existing": skip_existing,
        "stats": {
            "total": stats.total,
            "attempted": stats.attempted,
            "succeeded": stats.succeeded,
            "failed": stats.failed,
            "skipped": stats.skipped,
        },
        "records_written": records_written,
        "tables_written": tables_written,
    }

    if summary_path is not None:
        summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf-dir", type=Path, default=DEFAULT_PDF_DIR, help="Directory containing the mirrored book PDFs.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for text/table outputs from the extractor.",
    )
    parser.add_argument(
        "--jsonl-path",
        type=Path,
        default=DEFAULT_JSONL_PATH,
        help="Destination for the aggregated JSONL corpus (page-level records).",
    )
    parser.add_argument(
        "--summary-path",
        type=Path,
        default=DEFAULT_SUMMARY_PATH,
        help="Optional path for writing summary metadata (set to '-' to skip writing).",
    )
    parser.add_argument("--batch-size", type=int, default=12, help="Number of PDFs to process per batch.")
    parser.add_argument("--max-workers", type=int, default=4, help="Maximum concurrent workers.")
    parser.add_argument(
        "--no-structured",
        action="store_true",
        help="Disable table extraction (enabled by default).",
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Do not search the PDF directory recursively.",
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Reprocess PDFs even when text/table outputs already exist.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging verbosity for the run.",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    summary_path: Path | None
    if str(args.summary_path) == "-":
        summary_path = None
    else:
        summary_path = args.summary_path

    try:
        summary = generate_books_corpus(
            args.pdf_dir,
            output_dir=args.output_dir,
            jsonl_path=args.jsonl_path,
            summary_path=summary_path,
            batch_size=args.batch_size,
            max_workers=args.max_workers,
            structured=not args.no_structured,
            recursive=not args.no_recursive,
            skip_existing=not args.no_skip_existing,
            log_level=args.log_level,
        )
    except Exception as exc:  # pragma: no cover - defensive path
        logging.getLogger(__name__).error(str(exc))
        return 1

    logging.getLogger(__name__).info(
        "Extraction complete — %s records written (summary: %s)",
        summary["records_written"],
        summary.get("jsonl_path"),
    )
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
