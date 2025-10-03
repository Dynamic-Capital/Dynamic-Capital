"""Index Google Drive PDF metadata with optional OCR support."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
import hashlib
from typing import Callable, Iterable, Iterator, Mapping, MutableMapping, Sequence

from dynamic_corpus_extraction.engine import (
    CorpusDocument,
    DynamicCorpusExtractionEngine,
)
from dynamic_corpus_extraction.google_drive import build_google_drive_pdf_loader
from dynamic_keepers.bookkeeping import GoogleDriveBookkeeper
from dynamic_database.database import DatabaseRecord


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
        "--knowledge-base-drop-id",
        help=(
            "Optional drop identifier. When provided, the indexed documents are "
            "serialised into data/knowledge_base/<drop>/extracted.json for "
            "downstream ingestion."
        ),
    )
    parser.add_argument(
        "--knowledge-base-title",
        help="Optional human readable title stored alongside the drop payload.",
    )
    parser.add_argument(
        "--knowledge-base-root",
        default="data/knowledge_base",
        help="Directory where knowledge base drops are written when enabled.",
    )
    parser.add_argument(
        "--install-missing-pypdf2",
        action="store_true",
        help=(
            "Automatically install the PyPDF2 dependency if it is not already available "
            "before running extraction."
        ),
    )
    parser.add_argument(
        "--local-pdf-dir",
        help=(
            "Path to a directory containing PDF files. When provided the extractor runs "
            "offline using the local files instead of contacting Google Drive."
        ),
    )
    return parser.parse_args()


def _ensure_source(args: argparse.Namespace) -> None:
    has_remote_sources = any((args.share_link, args.folder_id, args.file_ids))
    if args.local_pdf_dir:
        if has_remote_sources:
            raise SystemExit(
                "--local-pdf-dir cannot be combined with Google Drive share or folder arguments."
            )
        return
    if not has_remote_sources:
        raise SystemExit(
            "At least one --share-link, --folder-id, or --file-id value must be provided."
        )


class _LocalDriveFixtureClient:
    """Minimal client that mirrors the Google Drive API over local PDFs."""

    def __init__(
        self,
        *,
        files: Mapping[str, Mapping[str, object]],
        file_paths: Mapping[str, Path],
        folder_id: str,
    ) -> None:
        self._files = {key: dict(value) for key, value in files.items()}
        self._file_paths = dict(file_paths)
        self._folder_id = folder_id

    def iter_files(
        self,
        *,
        folder_id: str,
        mime_types: Iterable[str] | None = None,
        page_size: int,
        fields: str | None = None,
        resource_key: str | None = None,
    ) -> Iterator[MutableMapping[str, object]]:
        if folder_id != self._folder_id:
            return iter(())
        allowed_mime_types = set(mime_types or ())
        entries: list[MutableMapping[str, object]] = []
        for metadata in self._files.values():
            mime_type = str(metadata.get("mimeType") or "")
            if allowed_mime_types and mime_type not in allowed_mime_types:
                continue
            entries.append(dict(metadata))
        return iter(entries)

    def download_file(self, file_id: str, *, resource_key: str | None = None) -> bytes:
        path = self._file_paths.get(file_id)
        if path is None:
            raise KeyError(file_id)
        return path.read_bytes()

    def get_file_metadata(
        self,
        file_id: str,
        *,
        fields: str | None = None,
        resource_key: str | None = None,
    ) -> MutableMapping[str, object]:
        if file_id not in self._files:
            raise KeyError(file_id)
        return dict(self._files[file_id])


def _build_local_drive_client(
    root_dir: Path, *, folder_id: str
) -> Callable[[], _LocalDriveFixtureClient]:
    resolved_root = root_dir.expanduser().resolve()
    if not resolved_root.is_dir():
        raise SystemExit(f"Local PDF directory '{resolved_root}' does not exist or is not a directory.")

    files: dict[str, dict[str, object]] = {}
    file_paths: dict[str, Path] = {}
    for pdf_path in resolved_root.rglob("*.pdf"):
        if not pdf_path.is_file():
            continue
        relative = pdf_path.relative_to(resolved_root).as_posix()
        digest = hashlib.sha1(relative.encode("utf-8")).hexdigest()[:12]
        file_id = f"local-{digest}"
        stat = pdf_path.stat()
        modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        metadata = {
            "id": file_id,
            "name": pdf_path.name,
            "mimeType": "application/pdf",
            "size": stat.st_size,
            "modifiedTime": modified,
            "webViewLink": pdf_path.resolve().as_uri(),
            "localPath": relative,
        }
        files[file_id] = metadata
        file_paths[file_id] = pdf_path

    if not files:
        raise SystemExit(f"No PDF files were found under '{resolved_root}'.")

    def factory() -> _LocalDriveFixtureClient:
        return _LocalDriveFixtureClient(files=files, file_paths=file_paths, folder_id=folder_id)

    return factory


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


def _serialise_record(record: DatabaseRecord) -> dict[str, object]:
    return {
        "key": record.key,
        "canonical_key": record.canonical_key,
        "payload": dict(record.payload),
        "confidence": record.confidence,
        "relevance": record.relevance,
        "freshness": record.freshness,
        "weight": record.weight,
        "timestamp": record.timestamp.isoformat(),
        "tags": list(record.tags),
        "sources": list(record.sources),
    }


def _write_knowledge_base_drop(
    *,
    drop_id: str,
    title: str | None,
    root_dir: str | Path,
    summary: Mapping[str, object],
    documents: Sequence[CorpusDocument],
    snapshot: Mapping[str, object],
    records: Sequence[DatabaseRecord],
    share_link: str | None,
    folder_id: str | None,
    file_ids: Sequence[str] | None,
) -> Path:
    """Emit a structured knowledge base payload for downstream ingestion."""

    drop_key = str(drop_id or "").strip()
    if not drop_key:
        raise ValueError("drop_id must not be empty when writing a knowledge base payload")

    drop_title = str(title).strip() if title else drop_key
    knowledge_base_root = Path(root_dir).expanduser()
    drop_dir = knowledge_base_root / drop_key
    drop_dir.mkdir(parents=True, exist_ok=True)
    extracted_path = drop_dir / "extracted.json"

    generated_at = datetime.now(timezone.utc).isoformat()

    source_payload: dict[str, object] = {"type": "google_drive"}
    if share_link:
        source_payload["share_link"] = share_link
    if folder_id:
        source_payload["folder_id"] = folder_id
    cleaned_file_ids = [file_id.strip() for file_id in file_ids or [] if str(file_id).strip()]
    if cleaned_file_ids:
        source_payload["file_ids"] = cleaned_file_ids

    payload = {
        "dropId": drop_key,
        "title": drop_title,
        "generatedAt": generated_at,
        "source": source_payload,
        "summary": dict(summary),
        "documents": [document.as_payload() for document in documents],
        "snapshot": dict(snapshot),
        "records": [_serialise_record(record) for record in records],
    }

    extracted_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return extracted_path


def _run() -> None:
    args = _parse_args()
    _ensure_source(args)

    client_factory: Callable[[], object] | None = None
    folder_id = args.folder_id
    share_link = args.share_link
    file_ids = list(args.file_ids or [])
    api_key = args.api_key
    access_token = args.access_token

    if args.local_pdf_dir:
        folder_id = folder_id or "local-fixture"
        client_factory = _build_local_drive_client(Path(args.local_pdf_dir), folder_id=folder_id)
        share_link = None
        file_ids = []
        api_key = None
        access_token = None

    loader = build_google_drive_pdf_loader(
        share_link=share_link,
        folder_id=folder_id,
        file_ids=file_ids,
        api_key=api_key,
        access_token=access_token,
        enable_ocr=args.enable_ocr,
        ocr_languages=args.ocr_languages,
        ocr_dpi=args.ocr_dpi,
        max_file_size=args.max_file_size,
        batch_size=args.batch_size,
        install_missing_pypdf2=args.install_missing_pypdf2,
        client_factory=client_factory,
    )

    engine = DynamicCorpusExtractionEngine()
    engine.register_source("google_drive", loader)
    summary = engine.extract(limit=args.limit)

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
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2, ensure_ascii=False)

    print(
        f"Indexed {len(indexed_records)} document(s) into '{args.table}'. "
        f"Snapshot written to {output_path}"
    )

    if args.knowledge_base_drop_id:
        drop_path = _write_knowledge_base_drop(
            drop_id=args.knowledge_base_drop_id,
            title=args.knowledge_base_title,
            root_dir=args.knowledge_base_root,
            summary=output["summary"],
            documents=summary.documents,
            snapshot=output["snapshot"],
            records=indexed_records,
            share_link=share_link,
            folder_id=folder_id,
            file_ids=tuple(file_ids),
        )
        print(f"Knowledge base payload written to {drop_path}")


if __name__ == "__main__":
    _run()
