"""Index Google Drive PDF metadata with optional OCR support."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_corpus_extraction.engine import DynamicCorpusExtractionEngine
from dynamic_corpus_extraction.google_drive import (
    build_google_drive_pdf_loader,
    parse_drive_share_link,
)
from dynamic_keepers.bookkeeping import GoogleDriveBookkeeper


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape PDF metadata from Google Drive, optionally run OCR to extract "
            "text, and organise the results into a dynamic database snapshot."
        )
    )
    source = parser.add_mutually_exclusive_group(required=False)
    source.add_argument(
        "--share-link",
        help="Google Drive share link pointing to a folder or file.",
    )
    source.add_argument(
        "--folder-id",
        help="Explicit folder identifier to traverse.",
    )
    parser.add_argument(
        "--file-id",
        action="append",
        dest="file_ids",
        default=None,
        help="Individual file identifiers to fetch alongside any folder traversal.",
    )
    parser.add_argument("--api-key", help="Google API key for Drive access.")
    parser.add_argument("--access-token", help="OAuth access token for Drive.")
    parser.add_argument(
        "--enable-ocr",
        action="store_true",
        help="Enable OCR fallback when PDFs do not contain embedded text.",
    )
    parser.add_argument(
        "--ocr-language",
        action="append",
        dest="ocr_languages",
        default=None,
        help="Language hint(s) for Tesseract OCR (may be supplied multiple times).",
    )
    parser.add_argument(
        "--ocr-dpi",
        type=int,
        default=300,
        help="Rasterisation DPI used when OCR is enabled (default: 300).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of documents to index during this run.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Override the batch size used when paging Drive results.",
    )
    parser.add_argument(
        "--pages-per-document",
        type=int,
        default=99,
        help=(
            "Maximum number of PDF pages to include in each extracted document. "
            "Set to 0 to disable page batching (default: 99)."
        ),
    )
    parser.add_argument(
        "--max-file-size",
        type=int,
        default=50_000_000,
        help="Maximum allowed file size in bytes (default: 50MB).",
    )
    parser.add_argument(
        "--table",
        default="google_drive_pdfs",
        help="Database table name used for indexed records.",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="data/google_drive_database_snapshot.json",
        help="Location where the resulting snapshot JSON will be stored.",
    )
    parser.add_argument(
        "--documents-jsonl",
        help=(
            "Optional path to export the extracted corpus documents as JSONL. "
            "Each line will contain the identifier, content, metadata, and tags "
            "returned by the extraction engine."
        ),
    )
    return parser.parse_args()


def _ensure_source(args: argparse.Namespace) -> None:
    if not any((args.share_link, args.folder_id, args.file_ids)):
        raise SystemExit(
            "At least one --share-link, --folder-id, or --file-id value must be provided."
        )


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


def _resolve_source_identifiers(
    args: argparse.Namespace,
) -> tuple[str | None, list[str]]:
    folder_id = args.folder_id.strip() if args.folder_id else None
    file_ids = [
        value.strip()
        for value in (args.file_ids or [])
        if value and value.strip()
    ]

    if args.share_link:
        target_type, identifier = parse_drive_share_link(args.share_link)
        if target_type == "folder":
            if folder_id and folder_id != identifier:
                raise SystemExit(
                    "Conflicting folder identifiers detected between --folder-id and --share-link"
                )
            folder_id = identifier
        else:
            if identifier not in file_ids:
                file_ids.append(identifier)

    return folder_id, file_ids


def _serialise_snapshot(keeper: GoogleDriveBookkeeper) -> dict[str, object]:
    snapshot = keeper.snapshot()
    events = keeper.recent_events(limit=50)
    return {
        "table": snapshot.table,
        "record_count": snapshot.record_count,
        "mean_confidence": snapshot.mean_confidence,
        "mean_relevance": snapshot.mean_relevance,
        "mean_freshness": snapshot.mean_freshness,
        "tag_catalog": list(snapshot.tag_catalog),
        "updated_at": snapshot.updated_at.isoformat(),
        "records": [
            {
                "key": record.key,
                "canonical_key": record.canonical_key,
                "payload": record.payload,
                "confidence": record.confidence,
                "relevance": record.relevance,
                "freshness": record.freshness,
                "weight": record.weight,
                "timestamp": record.timestamp.isoformat(),
                "tags": list(record.tags),
                "sources": list(record.sources),
            }
            for record in snapshot.records
        ],
        "recent_events": [
            {
                "table": event.table,
                "key": event.key,
                "action": event.action,
                "confidence_shift": event.confidence_shift,
                "relevance_shift": event.relevance_shift,
                "timestamp": event.timestamp.isoformat(),
            }
            for event in events
        ],
    }


def _run() -> None:
    args = _parse_args()
    _ensure_source(args)
    folder_id, file_ids = _resolve_source_identifiers(args)
    api_key, access_token = _resolve_credentials(args)

    loader = build_google_drive_pdf_loader(
        share_link=args.share_link,
        folder_id=folder_id,
        file_ids=file_ids,
        api_key=api_key,
        access_token=access_token,
        enable_ocr=args.enable_ocr,
        ocr_languages=args.ocr_languages,
        ocr_dpi=args.ocr_dpi,
        max_file_size=args.max_file_size,
        batch_size=args.batch_size,
        page_batch_size=args.pages_per_document,
    )

    engine = DynamicCorpusExtractionEngine()
    engine.register_source("google_drive", loader)
    summary = engine.extract(limit=args.limit)

    if args.documents_jsonl:
        export_path = Path(args.documents_jsonl)
        exported_count = summary.export_jsonl(export_path, ensure_ascii=False)
        print(
            f"Exported {exported_count} document(s) to JSONL at {export_path.resolve()}"
        )

    keeper = GoogleDriveBookkeeper(table=args.table)
    extra_tags = ("ocr",) if args.enable_ocr else ()
    indexed_records = keeper.index_documents(summary.documents, extra_tags=extra_tags)

    output = {
        "summary": {
            "documents": len(summary.documents),
            "duplicate_count": summary.duplicate_count,
            "source_statistics": dict(summary.source_statistics),
            "elapsed_seconds": summary.elapsed_seconds,
            "ocr_enabled": args.enable_ocr,
        },
        "snapshot": _serialise_snapshot(keeper),
        "indexed_records": len(indexed_records),
        "source": {
            "share_link": args.share_link,
            "folder_id": folder_id,
            "file_ids": file_ids,
        },
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2, ensure_ascii=False)

    print(
        f"Indexed {len(indexed_records)} document(s) into '{args.table}'. "
        f"Snapshot written to {output_path}"
    )


if __name__ == "__main__":
    _run()
