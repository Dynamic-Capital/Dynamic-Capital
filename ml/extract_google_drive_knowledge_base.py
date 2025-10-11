"""Build a knowledge base dataset from Google Drive PDF shares."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, MutableMapping, Sequence

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_corpus_extraction.engine import (  # noqa: E402
    CorpusExtractionSummary,
    DynamicCorpusExtractionEngine,
)
from dynamic_corpus_extraction.google_drive import (  # noqa: E402
    build_google_drive_pdf_loader,
    parse_drive_share_link,
)

LOGGER = logging.getLogger("extract_google_drive_knowledge_base")


DEFAULT_OUTPUT = Path("data/knowledge_base/google_drive/processed/google_drive_corpus.jsonl")
DEFAULT_SUMMARY = Path("data/knowledge_base/google_drive/processed/google_drive_summary.json")
DEFAULT_SAMPLE = Path("data/knowledge_base/google_drive/processed/google_drive_sample.jsonl")


def _configure_logging(level: str) -> None:
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=numeric_level, format="%(levelname)s: %(message)s")


def _normalise_iterable(values: Iterable[str] | None) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        candidate = (value or "").strip()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        cleaned.append(candidate)
    return cleaned


def _load_links_from_file(path: str | None) -> list[str]:
    if not path:
        return []
    file_path = Path(path)
    if not file_path.exists():
        raise SystemExit(f"Share links file '{path}' does not exist")
    return [line.strip() for line in file_path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _normalise_credential(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _resolve_credentials(args: argparse.Namespace) -> tuple[str | None, str | None]:
    api_key = _normalise_credential(args.api_key)
    access_token = _normalise_credential(args.access_token)
    if api_key is None:
        api_key = _normalise_credential(os.getenv("GOOGLE_API_KEY"))
    if access_token is None:
        access_token = _normalise_credential(os.getenv("GOOGLE_ACCESS_TOKEN"))
    if api_key is None and access_token is None:
        raise SystemExit(
            "Google Drive credentials are required. Provide --api-key/--access-token "
            "arguments or set GOOGLE_API_KEY/GOOGLE_ACCESS_TOKEN environment variables."
        )
    return api_key, access_token


def _ensure_output_paths(output: Path, summary: Path | None, sample: Path | None) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if summary is not None:
        summary.parent.mkdir(parents=True, exist_ok=True)
    if sample is not None:
        sample.parent.mkdir(parents=True, exist_ok=True)


def _load_skip_file_ids(paths: Sequence[str] | None) -> set[str]:
    identifiers: set[str] = set()
    for entry in paths or []:
        candidate = (entry or "").strip()
        if not candidate:
            continue
        path = Path(candidate)
        if not path.exists():
            LOGGER.warning("Skip file '%s' does not exist; ignoring", candidate)
            continue
        try:
            for line in path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    LOGGER.debug("Skipping malformed JSONL line in %s", candidate)
                    continue
                metadata = payload.get("metadata") if isinstance(payload, dict) else None
                if isinstance(metadata, MutableMapping):
                    file_id = metadata.get("file_id") or metadata.get("drive_file_id")
                    if isinstance(file_id, str) and file_id.strip():
                        identifiers.add(file_id.strip())
                        continue
                    checkpoint = metadata.get("checkpoint")
                    if isinstance(checkpoint, MutableMapping):
                        checkpoint_id = checkpoint.get("file_id")
                        if isinstance(checkpoint_id, str) and checkpoint_id.strip():
                            identifiers.add(checkpoint_id.strip())
        except OSError as error:
            LOGGER.warning("Failed to read %s: %s", candidate, error)
    return identifiers


def _write_sample(source: Path, destination: Path, size: int) -> int:
    if size <= 0:
        return 0
    count = 0
    with source.open("r", encoding="utf-8") as reader, destination.open("w", encoding="utf-8") as writer:
        for line in reader:
            if not line.strip():
                continue
            writer.write(line)
            count += 1
            if count >= size:
                break
    return count


@dataclass(slots=True)
class ExtractionInputs:
    share_links: tuple[str, ...]
    folder_ids: tuple[str, ...]
    file_ids: tuple[str, ...]
    skip_file_ids: tuple[str, ...]


def _resolve_inputs(args: argparse.Namespace) -> ExtractionInputs:
    share_links = _normalise_iterable((args.share_links or []) + _load_links_from_file(args.share_links_file))
    folder_ids = _normalise_iterable(args.folder_ids)
    file_ids = _normalise_iterable(args.file_ids)
    skip_file_ids = _normalise_iterable(args.skip_file_ids)
    if not share_links and not folder_ids and not file_ids:
        raise SystemExit("At least one share link, folder ID, or file ID must be provided")
    return ExtractionInputs(
        share_links=tuple(share_links),
        folder_ids=tuple(folder_ids),
        file_ids=tuple(file_ids),
        skip_file_ids=tuple(skip_file_ids),
    )


def _build_loader_kwargs(args: argparse.Namespace) -> dict[str, object]:
    if args.pages_per_document is None:
        page_batch_size = None
    else:
        page_batch_size = int(args.pages_per_document)
        if page_batch_size <= 0:
            page_batch_size = None
    return {
        "max_file_size": args.max_file_size,
        "batch_size": args.batch_size,
        "page_batch_size": page_batch_size,
        "enable_ocr": args.enable_ocr,
        "ocr_languages": args.ocr_languages,
        "ocr_dpi": args.ocr_dpi,
        "include_docx": args.include_docx,
    }


def _register_share_sources(
    engine: DynamicCorpusExtractionEngine,
    inputs: ExtractionInputs,
    *,
    api_key: str | None,
    access_token: str | None,
    loader_kwargs: dict[str, object],
    inherited_skip_ids: set[str],
) -> None:
    for share_link in inputs.share_links:
        try:
            target_type, identifier = parse_drive_share_link(share_link)
        except ValueError as error:
            raise SystemExit(f"Failed to parse share link '{share_link}': {error}") from error
        source_name = f"{target_type}-{identifier}"
        loader = build_google_drive_pdf_loader(
            share_link=share_link,
            api_key=api_key,
            access_token=access_token,
            skip_file_ids=tuple(sorted(inherited_skip_ids | set(inputs.skip_file_ids))),
            **loader_kwargs,
        )
        engine.register_source(
            source_name,
            loader,
            metadata={
                "share_link": share_link,
                "share_type": target_type,
            },
        )

    if inputs.folder_ids:
        for folder_id in inputs.folder_ids:
            source_name = f"folder-{folder_id}"
            loader = build_google_drive_pdf_loader(
                folder_id=folder_id,
                file_ids=inputs.file_ids,
                api_key=api_key,
                access_token=access_token,
                skip_file_ids=tuple(sorted(inherited_skip_ids | set(inputs.skip_file_ids))),
                **loader_kwargs,
            )
            engine.register_source(
                source_name,
                loader,
                metadata={"folder_id": folder_id},
            )
    elif inputs.file_ids:
        source_name = "files"
        loader = build_google_drive_pdf_loader(
            file_ids=inputs.file_ids,
            api_key=api_key,
            access_token=access_token,
            skip_file_ids=tuple(sorted(inherited_skip_ids | set(inputs.skip_file_ids))),
            **loader_kwargs,
        )
        engine.register_source(source_name, loader, metadata={"file_ids": list(inputs.file_ids)})


def _parse_metadata_pairs(pairs: Sequence[str] | None) -> dict[str, str]:
    metadata: dict[str, str] = {}
    for pair in pairs or []:
        if "=" not in pair:
            raise SystemExit(f"Invalid metadata pair '{pair}'. Use key=value format.")
        key, value = pair.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise SystemExit(f"Metadata key missing in pair '{pair}'")
        metadata[key] = value
    return metadata


def _serialise_summary(
    summary: CorpusExtractionSummary,
    *,
    output_path: Path,
    summary_path: Path | None,
    sample_path: Path | None,
    sample_count: int,
    args: argparse.Namespace,
    inputs: ExtractionInputs,
    skip_file_ids: set[str],
    inherited_skip_ids: set[str],
) -> None:
    payload = {
        "document_count": len(summary.documents),
        "source_statistics": summary.source_statistics,
        "duplicate_count": summary.duplicate_count,
        "elapsed_seconds": summary.elapsed_seconds,
        "output_path": str(output_path),
        "sample_path": str(sample_path) if sample_path else None,
        "sample_size": sample_count,
        "limit": args.limit,
        "share_links": list(inputs.share_links),
        "folder_ids": list(inputs.folder_ids),
        "file_ids": list(inputs.file_ids),
        "skip_file_ids": sorted(skip_file_ids),
        "inherited_skip_file_ids": sorted(inherited_skip_ids),
    }
    if summary_path is not None:
        summary_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Extract Google Drive PDFs into a JSONL knowledge base dataset. The script"
            " batches PDF pages, skips previously processed files, and emits a run"
            " summary for provenance tracking."
        )
    )
    parser.add_argument(
        "--share-link",
        dest="share_links",
        action="append",
        default=None,
        help="Google Drive share link (folder or file). May be provided multiple times.",
    )
    parser.add_argument(
        "--share-links-file",
        help="Optional newline-delimited file of share links to append to the run.",
    )
    parser.add_argument(
        "--folder-id",
        dest="folder_ids",
        action="append",
        default=None,
        help="Explicit folder identifier(s) to traverse when share links are unavailable.",
    )
    parser.add_argument(
        "--file-id",
        dest="file_ids",
        action="append",
        default=None,
        help="Individual file identifier(s) to fetch in addition to folder traversal.",
    )
    parser.add_argument("--api-key", help="Google API key for Drive access.")
    parser.add_argument("--access-token", help="OAuth access token for Drive.")
    parser.add_argument(
        "--enable-ocr",
        action="store_true",
        help="Enable OCR fallback when PDFs lack embedded text.",
    )
    parser.add_argument(
        "--ocr-language",
        dest="ocr_languages",
        action="append",
        default=None,
        help="Language hint(s) for Tesseract OCR (may be provided multiple times).",
    )
    parser.add_argument(
        "--ocr-dpi",
        type=int,
        default=300,
        help="Rasterisation DPI used when OCR is enabled (default: 300).",
    )
    parser.add_argument(
        "--include-docx",
        action="store_true",
        help="Include DOCX files alongside PDFs during traversal.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Override the page listing batch size used when querying Drive (default: 10).",
    )
    parser.add_argument(
        "--pages-per-document",
        type=int,
        default=99,
        help="Maximum number of PDF pages to include per JSONL document (default: 99).",
    )
    parser.add_argument(
        "--max-file-size",
        type=int,
        default=50_000_000,
        help="Skip files larger than this many bytes (default: 50MB).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on the number of documents to extract across all sources.",
    )
    parser.add_argument(
        "--metadata",
        dest="metadata_pairs",
        action="append",
        default=None,
        help="Additional key=value metadata pairs to attach to the extraction context.",
    )
    parser.add_argument(
        "--continue-from",
        dest="continue_from",
        action="append",
        default=None,
        help=(
            "Existing JSONL export(s) whose Google Drive file IDs should be skipped."
            " Provide multiple times to merge several previous runs."
        ),
    )
    parser.add_argument(
        "--skip-file-id",
        dest="skip_file_ids",
        action="append",
        default=None,
        help="Explicit Google Drive file ID(s) to ignore during extraction.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Destination JSONL path for the extracted corpus.",
    )
    parser.add_argument(
        "--summary",
        type=Path,
        default=DEFAULT_SUMMARY,
        help="Optional path for writing summary metadata (set to '-' to disable).",
    )
    parser.add_argument(
        "--sample",
        type=Path,
        default=DEFAULT_SAMPLE,
        help="Optional sample JSONL path containing the first N documents (set to '-' to disable).",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=5,
        help="Number of records to include in the sample export (default: 5).",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging verbosity for the run.",
    )
    return parser


def run(args: argparse.Namespace) -> CorpusExtractionSummary:
    _configure_logging(args.log_level)
    inputs = _resolve_inputs(args)
    api_key, access_token = _resolve_credentials(args)
    inherited_skip_ids = _load_skip_file_ids(args.continue_from)
    skip_file_ids = inherited_skip_ids | set(inputs.skip_file_ids)
    loader_kwargs = _build_loader_kwargs(args)

    engine = DynamicCorpusExtractionEngine()
    _register_share_sources(
        engine,
        inputs,
        api_key=api_key,
        access_token=access_token,
        loader_kwargs=loader_kwargs,
        inherited_skip_ids=inherited_skip_ids,
    )

    metadata = _parse_metadata_pairs(args.metadata_pairs)
    metadata.setdefault("skip_file_ids", sorted(skip_file_ids))

    summary = engine.extract(limit=args.limit, metadata=metadata)

    summary.export_jsonl(args.output)

    sample_path: Path | None
    if str(args.sample) == "-":
        sample_path = None
    else:
        sample_path = args.sample

    summary_path: Path | None
    if str(args.summary) == "-":
        summary_path = None
    else:
        summary_path = args.summary

    _ensure_output_paths(args.output, summary_path, sample_path)

    sample_count = 0
    if sample_path is not None:
        sample_count = _write_sample(args.output, sample_path, args.sample_size)

    _serialise_summary(
        summary,
        output_path=args.output,
        summary_path=summary_path,
        sample_path=sample_path,
        sample_count=sample_count,
        args=args,
        inputs=inputs,
        skip_file_ids=skip_file_ids,
        inherited_skip_ids=inherited_skip_ids,
    )

    LOGGER.info(
        "Extracted %s document(s) from %s source(s)",
        len(summary.documents),
        len(summary.source_statistics),
    )
    return summary


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        run(args)
    except Exception as error:
        LOGGER.error("Extraction failed: %s", error)
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI shim
    raise SystemExit(main())

