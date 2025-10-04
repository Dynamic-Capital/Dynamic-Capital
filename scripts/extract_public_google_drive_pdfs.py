"""Extract PDF corpus documents from public Google Drive share links."""

from __future__ import annotations

import argparse
import dataclasses
import io
import json
import logging
import os
import re
import tempfile
from collections.abc import Iterator, Sequence
from pathlib import Path
from typing import Final

import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_corpus_extraction.engine import (
    CorpusExtractionContext,
    CorpusExtractionSummary,
    DynamicCorpusExtractionEngine,
)
from dynamic_corpus_extraction.google_drive import parse_drive_share_link


LOGGER = logging.getLogger("extract_public_google_drive_pdfs")
_USER_AGENT: Final[str] = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


try:  # pragma: no cover - optional dependency guard
    from gdown.download import download as gdown_download
    from gdown.download_folder import (
        _download_and_parse_google_drive_link,
        _get_session,
    )
except ModuleNotFoundError as error:  # pragma: no cover - runtime guard
    raise SystemExit(
        "The gdown package is required. Install it with `pip install gdown`."
    ) from error


def _load_pypdf() -> "PyPDF2":  # type: ignore[name-defined]
    try:
        import PyPDF2  # type: ignore[import]
    except ModuleNotFoundError as error:  # pragma: no cover - runtime guard
        raise SystemExit(
            "PyPDF2 is required for PDF text extraction. Install it with `pip install PyPDF2`."
        ) from error
    return PyPDF2


@dataclasses.dataclass(slots=True)
class PublicDriveFile:
    """Lightweight descriptor for a file discovered in a Drive share."""

    share_link: str
    file_id: str
    name: str
    mime_type: str
    relative_path: str


def _ensure_folder_url(identifier: str) -> str:
    return f"https://drive.google.com/drive/folders/{identifier}"


def _build_session():
    return _get_session(proxy=None, use_cookies=False, user_agent=_USER_AGENT)


def _iter_folder_files(
    node, *, prefix: tuple[str, ...], share_link: str
) -> Iterator[PublicDriveFile]:
    for child in node.children:
        child_name = child.name.strip()
        if child_name:
            parts = prefix + (child_name,)
        else:
            parts = prefix
        if getattr(child, "is_folder", lambda: False)():
            yield from _iter_folder_files(child, prefix=parts, share_link=share_link)
            continue
        mime_type = getattr(child, "type", "") or ""
        if not child.id:
            continue
        yield PublicDriveFile(
            share_link=share_link,
            file_id=child.id,
            name=child_name or child.id,
            mime_type=mime_type,
            relative_path="/".join(parts),
        )


def _discover_folder_files(share_link: str, folder_id: str) -> list[PublicDriveFile]:
    session = _build_session()
    success, root = _download_and_parse_google_drive_link(
        session,
        _ensure_folder_url(folder_id),
        quiet=True,
        remaining_ok=True,
    )
    if not success or root is None:
        raise RuntimeError(f"Failed to traverse Google Drive folder '{folder_id}'")
    files = [
        entry
        for entry in _iter_folder_files(root, prefix=(root.name,), share_link=share_link)
    ]
    LOGGER.info(
        "Discovered %s files in Google Drive folder %s", len(files), folder_id
    )
    return files


_OG_TITLE_RE = re.compile(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"')


def _discover_file_metadata(share_link: str, file_id: str) -> PublicDriveFile:
    import requests

    url = f"https://drive.google.com/file/d/{file_id}/view"
    response = requests.get(url, headers={"User-Agent": _USER_AGENT}, timeout=30)
    response.raise_for_status()
    match = _OG_TITLE_RE.search(response.text)
    name = match.group(1) if match else file_id
    return PublicDriveFile(
        share_link=share_link,
        file_id=file_id,
        name=name,
        mime_type="application/octet-stream",
        relative_path=name,
    )


def _discover_share_files(share_link: str) -> list[PublicDriveFile]:
    target_type, identifier = parse_drive_share_link(share_link)
    if target_type == "folder":
        return _discover_folder_files(share_link, identifier)
    file_entry = _discover_file_metadata(share_link, identifier)
    LOGGER.info("Discovered file %s from direct share", file_entry.file_id)
    return [file_entry]


def _download_file(file_id: str) -> bytes:
    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = Path(temp_dir, f"{file_id}")
        downloaded = gdown_download(
            id=file_id,
            output=str(output_path),
            quiet=True,
            use_cookies=False,
            user_agent=_USER_AGENT,
        )
        if not downloaded:
            raise RuntimeError(f"Failed to download Google Drive file '{file_id}'")
        data = Path(downloaded).read_bytes()
        return data


def _extract_pdf_text(payload: bytes, *, file_name: str) -> str:
    PyPDF2 = _load_pypdf()
    reader = PyPDF2.PdfReader(io.BytesIO(payload))
    text_parts: list[str] = []
    for page in reader.pages:
        extracted = page.extract_text() or ""
        cleaned = extracted.strip()
        if cleaned:
            text_parts.append(cleaned)
    text = "\n".join(text_parts)
    if not text.strip():
        raise RuntimeError(f"No extractable text found in PDF '{file_name}'")
    return text


def _build_loader(entries: Sequence[PublicDriveFile]):
    pdf_entries = [
        entry
        for entry in entries
        if entry.mime_type.lower() == "application/pdf"
        or entry.name.lower().endswith(".pdf")
    ]
    skipped = len(entries) - len(pdf_entries)
    if skipped:
        LOGGER.warning("Skipping %s non-PDF file(s)", skipped)

    def loader(context: CorpusExtractionContext):
        remaining = context.limit
        for entry in pdf_entries:
            if remaining is not None and remaining <= 0:
                break
            try:
                payload = _download_file(entry.file_id)
            except Exception as error:
                LOGGER.error(
                    "Failed to download file %s (%s): %s",
                    entry.file_id,
                    entry.relative_path,
                    error,
                )
                continue
            try:
                text = _extract_pdf_text(payload, file_name=entry.name)
            except Exception as error:
                LOGGER.error(
                    "Failed to extract text from %s: %s", entry.relative_path, error
                )
                continue
            metadata = {
                "file_id": entry.file_id,
                "file_name": entry.name,
                "relative_path": entry.relative_path,
                "share_link": entry.share_link,
                "mime_type": entry.mime_type,
                "size": len(payload),
            }
            yield {
                "identifier": f"public-google-drive-{entry.file_id}",
                "content": text,
                "metadata": metadata,
                "tags": ("google_drive", "pdf", "public_share"),
            }
            if remaining is not None:
                remaining -= 1

    return loader


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract PDF text from public Google Drive share links."
    )
    parser.add_argument(
        "share_links",
        nargs="+",
        help="One or more Google Drive share links (folders or files).",
    )
    parser.add_argument(
        "--output",
        default="data/corpus/google_drive_public/documents.jsonl",
        help="Destination JSONL path for extracted corpus documents.",
    )
    parser.add_argument(
        "--summary",
        default="data/corpus/google_drive_public/summary.json",
        help="Path to store a JSON summary of the extraction run.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of documents to extract.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        help="Logging verbosity level.",
    )
    return parser.parse_args()


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )


def _export_summary(
    summary: CorpusExtractionSummary,
    *,
    share_links: Sequence[str],
    summary_path: str | os.PathLike[str],
) -> None:
    payload = {
        "share_links": list(share_links),
        "document_count": len(summary.documents),
        "source_statistics": dict(summary.source_statistics),
        "duplicate_count": summary.duplicate_count,
        "elapsed_seconds": summary.elapsed_seconds,
    }
    destination = Path(summary_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    args = _parse_args()
    _configure_logging(args.log_level)
    LOGGER.info("Discovering files from %s share link(s)", len(args.share_links))
    all_entries: list[PublicDriveFile] = []
    for link in args.share_links:
        try:
            entries = _discover_share_files(link)
        except Exception as error:
            LOGGER.error("Failed to inspect share link %s: %s", link, error)
            continue
        LOGGER.info("Share %s yielded %s file(s)", link, len(entries))
        all_entries.extend(entries)

    if not all_entries:
        LOGGER.error("No files discovered; aborting extraction")
        raise SystemExit(1)

    engine = DynamicCorpusExtractionEngine()
    engine.register_source(
        "public_google_drive",
        _build_loader(all_entries),
        tags=("google_drive_public",),
        metadata={"share_links": tuple(args.share_links)},
    )

    summary = engine.extract(limit=args.limit)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    exported = summary.export_jsonl(output_path)
    LOGGER.info("Exported %s document(s) to %s", exported, output_path)
    _export_summary(summary, share_links=args.share_links, summary_path=args.summary)
    LOGGER.info("Summary stored at %s", args.summary)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()

