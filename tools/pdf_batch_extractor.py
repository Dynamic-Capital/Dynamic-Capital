"""Batch extract text and tables from mirrored PDF corpora."""

from __future__ import annotations

import argparse
import concurrent.futures
import csv
import gc
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Iterator, Sequence

__all__ = [
    "TableResult",
    "ExtractionResult",
    "TableWriteSummary",
    "ProcessingStats",
    "extract_text_from_pdf",
    "extract_structured_from_pdf",
    "process_pdfs",
    "build_parser",
    "main",
]

_LOGGER = logging.getLogger("pdf_batch_extractor")


@dataclass(slots=True)
class TableResult:
    """Structured representation of an extracted table."""

    page: int
    headers: list[str]
    rows: list[list[str | None]]


@dataclass(slots=True)
class ExtractionResult:
    """Outcome for a single PDF extraction run."""

    source: Path
    status: str
    text: str | None = None
    pages: int | None = None
    tables: list[TableResult] | None = None
    page_texts: list[str] | None = None
    error: str | None = None

    def succeeded(self) -> bool:
        return self.status == "success"


@dataclass(slots=True)
class TableWriteSummary:
    """Summary of the persisted table artifacts for a PDF."""

    csv_paths: list[Path]
    summary_path: Path | None

    @property
    def count(self) -> int:
        return len(self.csv_paths)


@dataclass(slots=True)
class ProcessingStats:
    """Aggregated counters for a batch extraction run."""

    total: int = 0
    succeeded: int = 0
    failed: int = 0
    skipped: int = 0

    @property
    def attempted(self) -> int:
        return self.total - self.skipped


def _load_pypdf() -> "PyPDF2.PdfReader":  # type: ignore[name-defined]
    try:
        import PyPDF2  # type: ignore[import]
    except ModuleNotFoundError as exc:  # pragma: no cover - import guard
        raise RuntimeError(
            "PyPDF2 is required for text extraction. Install it with `pip install PyPDF2`."
        ) from exc

    return PyPDF2


def _load_pdfplumber() -> "pdfplumber":  # type: ignore[name-defined]
    try:
        import pdfplumber  # type: ignore[import]
    except ModuleNotFoundError as exc:  # pragma: no cover - import guard
        raise RuntimeError(
            "pdfplumber is required for structured extraction. Install it with `pip install pdfplumber`."
        ) from exc

    return pdfplumber


def extract_text_from_pdf(path: Path) -> ExtractionResult:
    """Extract free text from a PDF file using PyPDF2."""

    PyPDF2 = _load_pypdf()

    try:
        with path.open("rb") as handle:
            reader = PyPDF2.PdfReader(handle)
            text_parts: list[str] = []
            page_texts: list[str] = []
            for page in reader.pages:
                extracted = page.extract_text() or ""
                text_parts.append(extracted)
                page_texts.append(extracted)

            return ExtractionResult(
                source=path,
                status="success",
                text="\n".join(text_parts),
                pages=len(reader.pages),
                page_texts=page_texts,
            )
    except Exception as exc:  # pragma: no cover - defensive path
        return ExtractionResult(source=path, status="error", error=str(exc))


def extract_structured_from_pdf(path: Path) -> ExtractionResult:
    """Extract free text and tables from a PDF file using pdfplumber."""

    pdfplumber = _load_pdfplumber()

    try:
        with pdfplumber.open(path) as pdf:
            text_parts: list[str] = []
            tables: list[TableResult] = []
            page_texts: list[str] = []

            for page_index, page in enumerate(pdf.pages, start=1):
                extracted = page.extract_text() or ""
                text_parts.append(extracted)
                page_texts.append(extracted)
                for table in page.extract_tables() or []:
                    if not table:
                        continue
                    headers: list[str] = [str(value) if value is not None else "" for value in table[0]]
                    rows: list[list[str | None]] = [
                        [str(value) if value is not None else None for value in row] for row in table[1:]
                    ]
                    tables.append(TableResult(page=page_index, headers=headers, rows=rows))

            return ExtractionResult(
                source=path,
                status="success",
                text="\n".join(text_parts),
                pages=len(pdf.pages),
                tables=tables,
                page_texts=page_texts,
            )
    except Exception as exc:  # pragma: no cover - defensive path
        return ExtractionResult(source=path, status="error", error=str(exc))


def _batched(iterable: Sequence[Path], size: int) -> Iterator[Sequence[Path]]:
    for start in range(0, len(iterable), size):
        yield iterable[start : start + size]


def _write_text(result: ExtractionResult, *, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{result.source.stem}.txt"
    output_path.write_text(result.text or "", encoding="utf-8")
    return output_path


def _write_tables(result: ExtractionResult, *, output_dir: Path) -> TableWriteSummary:
    if not result.tables:
        return TableWriteSummary(csv_paths=[], summary_path=None)

    table_dir = output_dir / result.source.stem
    table_dir.mkdir(parents=True, exist_ok=True)

    csv_paths: list[Path] = []
    for index, table in enumerate(result.tables, start=1):
        table_path = table_dir / f"table_{index:02d}.csv"
        with table_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(table.headers)
            writer.writerows([[value if value is not None else "" for value in row] for row in table.rows])
        csv_paths.append(table_path)

    summary_path = table_dir / "tables.json"
    summary_payload = [
        {"page": table.page, "headers": table.headers, "rows": table.rows} for table in result.tables
    ]
    summary_path.write_text(json.dumps(summary_payload, indent=2, ensure_ascii=False), encoding="utf-8")

    return TableWriteSummary(csv_paths=csv_paths, summary_path=summary_path)


def _should_skip_output(
    source: Path,
    *,
    text_output: Path,
    table_output: Path,
    structured: bool,
) -> bool:
    text_exists = (text_output / f"{source.stem}.txt").exists()
    if not structured:
        return text_exists

    summary_exists = (table_output / source.stem / "tables.json").exists()
    return text_exists and summary_exists


def process_pdfs(
    pdf_directory: Path,
    *,
    output_dir: Path,
    batch_size: int = 10,
    max_workers: int = 4,
    structured: bool = False,
    recursive: bool = False,
    skip_existing: bool = False,
    on_result: Callable[[ExtractionResult], None] | None = None,
) -> ProcessingStats:
    """Process PDFs in batches, optionally extracting structured tables.

    Args:
        pdf_directory: Directory containing the source PDFs.
        output_dir: Destination directory for extracted text and tables.
        batch_size: Number of PDFs to schedule per batch submission.
        max_workers: Maximum threads used within the shared executor.
        structured: When ``True`` also persist table CSVs via ``pdfplumber``.
        recursive: Search for PDFs recursively under ``pdf_directory``.
        skip_existing: Skip PDFs that already have text (and table) outputs.
        on_result: Optional callback invoked with each successful extraction
            result after artefacts are written to disk.
    """

    if batch_size <= 0:
        raise ValueError("batch_size must be positive")
    if max_workers <= 0:
        raise ValueError("max_workers must be positive")

    pdf_directory = pdf_directory.expanduser()
    if not pdf_directory.exists():
        raise FileNotFoundError(f"PDF directory not found: {pdf_directory}")

    output_dir = output_dir.expanduser()

    pattern = "**/*.pdf" if recursive else "*.pdf"
    pdf_files = sorted(pdf_directory.glob(pattern))
    stats = ProcessingStats(total=len(pdf_files))

    if not pdf_files:
        _LOGGER.warning("No PDF files found in %s", pdf_directory)
        return stats

    _LOGGER.info("Found %d PDF files", len(pdf_files))
    extractor = extract_structured_from_pdf if structured else extract_text_from_pdf

    text_output = output_dir / "text"
    table_output = output_dir / "tables"

    if skip_existing:
        filtered: list[Path] = []
        for path in pdf_files:
            if _should_skip_output(path, text_output=text_output, table_output=table_output, structured=structured):
                stats.skipped += 1
                _LOGGER.debug("Skipping existing output for %s", path.name)
                continue
            filtered.append(path)

        if not filtered:
            _LOGGER.info("All %d PDFs already processed", stats.total)
            return stats

        pdf_files = filtered

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        for batch_number, batch in enumerate(_batched(pdf_files, batch_size), start=1):
            _LOGGER.info("Processing batch %d (%d files)", batch_number, len(batch))
            futures = [executor.submit(extractor, path) for path in batch]

            for future in concurrent.futures.as_completed(futures):
                result = future.result()

                if not result.succeeded():
                    stats.failed += 1
                    _LOGGER.error("%s failed: %s", result.source.name, result.error)
                    continue

                stats.succeeded += 1
                path_written = _write_text(result, output_dir=text_output)
                _LOGGER.info("%s → %s (%s pages)", result.source.name, path_written, result.pages)

                if structured:
                    table_summary = _write_tables(result, output_dir=table_output)
                    if table_summary.count:
                        _LOGGER.info("%s tables persisted", table_summary.count)
                    elif table_summary.summary_path is None:
                        _LOGGER.info("%s contained no tables", result.source.name)

                if on_result is not None:
                    on_result(result)

            gc.collect()

    _LOGGER.info(
        "Summary: %d succeeded, %d failed, %d skipped (total: %d)",
        stats.succeeded,
        stats.failed,
        stats.skipped,
        stats.total,
    )

    return stats


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf_directory", type=Path, help="Path to the directory containing PDF files")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("extracted_text"),
        help="Directory to write extracted text and tables (default: extracted_text)",
    )
    parser.add_argument("--batch-size", type=int, default=10, help="Number of PDFs to process per batch")
    parser.add_argument("--max-workers", type=int, default=4, help="Maximum worker threads per batch")
    parser.add_argument("--structured", action="store_true", help="Extract tables with pdfplumber in addition to text")
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Recursively search for PDFs within the provided directory",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip PDFs that already have extracted text outputs",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging verbosity (default: INFO)",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    logging.basicConfig(level=getattr(logging, args.log_level), format="%(message)s")

    try:
        process_pdfs(
            args.pdf_directory,
            output_dir=args.output_dir,
            batch_size=args.batch_size,
            max_workers=args.max_workers,
            structured=args.structured,
            recursive=args.recursive,
            skip_existing=args.skip_existing,
        )
    except Exception as exc:
        _LOGGER.error(str(exc))
        return 1

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
