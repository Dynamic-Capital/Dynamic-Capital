"""Utility to extract PDF text from a shared Google Drive folder."""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Sequence
from urllib.parse import unquote

import gdown  # type: ignore[import]
import requests
from bs4 import BeautifulSoup

from dynamic_corpus_extraction.google_drive import parse_drive_share_link


@dataclass(frozen=True)
class DriveFolderEntry:
    """Metadata for a file discovered in a shared Google Drive folder."""

    file_id: str
    name: str
    href: str
    modified_label: str | None
    mime_hint: str | None
    is_folder: bool


_FOLDER_VIEW_URL = "https://drive.google.com/embeddedfolderview?id={folder_id}#list"
_FILE_ID_PATTERN = re.compile(r"/file/d/([A-Za-z0-9_-]+)")
_FOLDER_ID_PATTERN = re.compile(r"/folders/([A-Za-z0-9_-]+)")
_MIME_HINT_PATTERN = re.compile(r"/type/([^/?]+)")


def iter_shared_folder_entries(folder_id: str) -> Iterator[DriveFolderEntry]:
    """Yield entries for a shared folder by scraping the embedded view page."""

    response = requests.get(_FOLDER_VIEW_URL.format(folder_id=folder_id), timeout=60)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    for entry in soup.select("div.flip-entry"):
        anchor = entry.find("a", href=True)
        if not anchor:
            continue
        href = anchor["href"]
        folder_match = _FOLDER_ID_PATTERN.search(href)
        file_match = _FILE_ID_PATTERN.search(href)
        is_folder = False
        identifier: str | None = None
        if folder_match:
            identifier = folder_match.group(1)
            is_folder = True
        elif file_match:
            identifier = file_match.group(1)
        if identifier is None:
            continue
        title_element = entry.select_one("div.flip-entry-title")
        name = title_element.get_text(strip=True) if title_element else identifier
        modified_element = entry.select_one("div.flip-entry-last-modified")
        modified_label = modified_element.get_text(strip=True) if modified_element else None
        mime_hint: str | None = None
        icon = entry.select_one("div.flip-entry-list-icon img")
        if icon and icon.has_attr("src"):
            icon_src = icon["src"]
            mime_match = _MIME_HINT_PATTERN.search(icon_src)
            if mime_match:
                mime_hint = unquote(mime_match.group(1))
        yield DriveFolderEntry(
            file_id=identifier,
            name=name,
            href=href,
            modified_label=modified_label,
            mime_hint=mime_hint,
            is_folder=is_folder,
        )


def iter_folder_files(folder_id: str, *, seen: set[str] | None = None) -> Iterator[DriveFolderEntry]:
    """Recursively yield file entries for ``folder_id``."""

    visited = seen if seen is not None else set()
    if folder_id in visited:
        return
    visited.add(folder_id)
    for entry in iter_shared_folder_entries(folder_id):
        if entry.is_folder:
            yield from iter_folder_files(entry.file_id, seen=visited)
        else:
            yield entry


def extract_pdf_pages(path: Path) -> list[dict[str, object]]:
    """Return a list of page payloads extracted from ``path``."""

    from PyPDF2 import PdfReader  # type: ignore[import]

    reader = PdfReader(path)
    pages: list[dict[str, object]] = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as error:  # pragma: no cover - defensive guard
            raise RuntimeError(f"Failed to extract text from page {index} of '{path.name}'") from error
        cleaned = text.strip()
        pages.append({
            "page": index,
            "text": cleaned,
        })
    return pages


def download_file(file_id: str, destination: Path) -> Path:
    """Download a Google Drive file to ``destination`` using gdown."""

    destination.parent.mkdir(parents=True, exist_ok=True)
    output = gdown.download(id=file_id, output=str(destination), quiet=True)
    if not output:
        raise RuntimeError(f"Failed to download Google Drive file '{file_id}'")
    return destination


def build_identifier(file_id: str, page: int | None = None) -> str:
    base = f"google-drive-{file_id}"
    if page is not None:
        return f"{base}-p{page:04d}"
    return base


def normalise_tags(tags: Sequence[str] | None) -> list[str]:
    if not tags:
        return []
    unique: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            unique.append(cleaned)
            seen.add(cleaned)
    return unique


def write_jsonl(entries: Iterator[dict[str, object]], output_path: Path) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output_path.open("w", encoding="utf-8") as handle:
        for payload in entries:
            json.dump(payload, handle, ensure_ascii=False)
            handle.write("\n")
            count += 1
    return count


def run_extraction(
    *,
    share_link: str,
    output_path: Path,
    limit: int | None,
    skip: int,
    tags: Sequence[str] | None,
) -> int:
    """Extract PDF text from a shared folder into ``output_path``."""

    target_type, identifier = parse_drive_share_link(share_link)
    if target_type != "folder":
        raise ValueError("Share link must reference a Google Drive folder")

    selected_tags = normalise_tags(tags)

    def iter_documents() -> Iterator[dict[str, object]]:
        skipped = 0
        emitted = 0
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            for entry in iter_folder_files(identifier):
                if skip and skipped < skip:
                    skipped += 1
                    continue
                if limit is not None and emitted >= limit:
                    break
                suffix = Path(entry.name).suffix.lower()
                if suffix not in {".pdf"}:
                    continue
                temp_path = temp_root / f"{entry.file_id}.pdf"
                download_file(entry.file_id, temp_path)
                try:
                    page_payloads = extract_pdf_pages(temp_path)
                except Exception as error:
                    print(
                        f"Skipping '{entry.name}' ({entry.file_id}): {error}",
                        file=sys.stderr,
                    )
                    continue
                for payload in page_payloads:
                    if limit is not None and emitted >= limit:
                        break
                    page_number = int(payload["page"])
                    text = str(payload.get("text") or "").strip()
                    if not text:
                        continue
                    emitted += 1
                    document_metadata = {
                        "file_id": entry.file_id,
                        "file_name": entry.name,
                        "modified_label": entry.modified_label,
                        "page": page_number,
                    }
                    yield {
                        "identifier": build_identifier(entry.file_id, page=page_number),
                        "content": text,
                        "source": identifier,
                        "metadata": document_metadata,
                        "tags": selected_tags,
                    }
                temp_path.unlink(missing_ok=True)

    return write_jsonl(iter_documents(), output_path)


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("share_link", help="Google Drive folder share link")
    parser.add_argument("output", help="Path to the JSONL file to create")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of page documents to export")
    parser.add_argument("--skip", type=int, default=0, help="Number of files to skip from the start")
    parser.add_argument("--tags", nargs="*", default=["google_drive", "pdf"], help="Tags to attach to each document")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    output_path = Path(args.output)
    count = run_extraction(
        share_link=args.share_link,
        output_path=output_path,
        limit=args.limit,
        skip=args.skip,
        tags=args.tags,
    )
    print(f"Exported {count} documents to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
