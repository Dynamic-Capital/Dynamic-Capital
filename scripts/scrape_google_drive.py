"""Utilities for scraping metadata from a public Google Drive folder.

This module downloads the HTML representation of a Google Drive folder and
parses the inline `_DRIVE_ivd` payload that Drive exposes to its web client.
The payload contains structured metadata for each child item. We convert that
into a Python data structure and optionally recurse through nested folders to
produce a full tree of the publicly accessible files.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Iterable, List, Optional
from urllib.parse import parse_qs, urlparse

import requests


FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
DRIVE_IVD_PATTERN = re.compile(r"window\['_DRIVE_ivd'\]\s*=\s*'([^']+)';")
TITLE_PATTERN = re.compile(r"<title>(.+?) - Google Drive</title>")


def _extract_folder_id(value: str) -> str:
    """Return the folder identifier from a URL or raw id string."""

    if re.fullmatch(r"[A-Za-z0-9_-]+", value):
        return value

    parsed = urlparse(value)
    path_parts = [part for part in parsed.path.split("/") if part]
    if "folders" in path_parts:
        idx = path_parts.index("folders")
        if idx + 1 < len(path_parts):
            return path_parts[idx + 1]

    query_id = parse_qs(parsed.query).get("id")
    if query_id:
        return query_id[0]

    raise ValueError(f"Unable to determine folder id from: {value}")


def _decode_drive_payload(html_text: str) -> List[List]:
    """Extract the JSON payload that lists folder children."""

    match = DRIVE_IVD_PATTERN.search(html_text)
    if not match:
        raise RuntimeError("Unable to locate _DRIVE_ivd payload in the page")

    encoded = match.group(1)
    decoded = encoded.replace("\\/", "/").encode("utf-8").decode("unicode_escape")
    data = json.loads(decoded)

    if not data or not isinstance(data[0], list):
        raise RuntimeError("Unexpected payload structure for _DRIVE_ivd")

    return [item for item in data[0] if isinstance(item, list) and item]


def _parse_title(html_text: str) -> Optional[str]:
    match = TITLE_PATTERN.search(html_text)
    if not match:
        return None
    return html.unescape(match.group(1)).strip()


def _ms_to_iso(ms: Optional[int]) -> Optional[str]:
    if not isinstance(ms, int) or ms <= 0:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=UTC).isoformat()


@dataclass
class DriveItem:
    id: str
    name: str
    mime_type: str
    is_folder: bool
    parents: List[str] = field(default_factory=list)
    size_bytes: Optional[int] = None
    modified_time: Optional[str] = None
    view_url: Optional[str] = None
    file_extension: Optional[str] = None
    children: List["DriveItem"] = field(default_factory=list)

    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "name": self.name,
            "mime_type": self.mime_type,
            "is_folder": self.is_folder,
            "parents": self.parents,
            "children": [child.to_dict() for child in self.children],
        }

        if self.size_bytes is not None:
            result["size_bytes"] = self.size_bytes
        if self.modified_time is not None:
            result["modified_time"] = self.modified_time
        if self.view_url:
            result["view_url"] = self.view_url
        if self.file_extension:
            result["file_extension"] = self.file_extension
        return result


class DriveScraper:
    def __init__(self) -> None:
        self._session = requests.Session()
        self._session.headers["User-Agent"] = (
            "Mozilla/5.0 (X11; Linux x86_64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
        self._visited: set[str] = set()

    def scrape(self, folder_id: str, *, max_depth: Optional[int] = None) -> DriveItem:
        return self._scrape(folder_id, current_depth=0, max_depth=max_depth)

    def _scrape(
        self, folder_id: str, *, current_depth: int, max_depth: Optional[int]
    ) -> DriveItem:
        url = f"https://drive.google.com/drive/folders/{folder_id}"
        response = self._session.get(url)
        response.raise_for_status()

        html_text = response.text
        title = _parse_title(html_text) or folder_id
        raw_items = _decode_drive_payload(html_text)

        folder_item = DriveItem(
            id=folder_id,
            name=title,
            mime_type=FOLDER_MIME_TYPE,
            is_folder=True,
            parents=[],
            view_url=url,
        )

        if folder_id in self._visited:
            return folder_item

        self._visited.add(folder_id)

        if max_depth is not None and current_depth >= max_depth:
            return folder_item

        for raw_item in raw_items:
            parsed = self._parse_drive_item(raw_item)
            if parsed.is_folder and (max_depth is None or current_depth < max_depth):
                child = self._scrape(
                    parsed.id,
                    current_depth=current_depth + 1,
                    max_depth=max_depth,
                )
                if child.children:
                    parsed.children = child.children
                if child.name and child.name != parsed.name:
                    parsed.name = child.name
                if not parsed.view_url and child.view_url:
                    parsed.view_url = child.view_url
            folder_item.children.append(parsed)

        return folder_item

    def _parse_drive_item(self, raw_item: List) -> DriveItem:
        item_id = raw_item[0]
        parents = raw_item[1] if len(raw_item) > 1 and isinstance(raw_item[1], list) else []
        name = raw_item[2] if len(raw_item) > 2 else item_id
        mime_type = raw_item[3] if len(raw_item) > 3 else "application/octet-stream"
        is_folder = mime_type == FOLDER_MIME_TYPE

        size_bytes = None
        for idx in (13, 27):
            if len(raw_item) > idx and isinstance(raw_item[idx], int) and raw_item[idx] > 0:
                size_bytes = raw_item[idx]
                break

        modified_ms = None
        for idx in (10, 9, 69):
            if len(raw_item) > idx and isinstance(raw_item[idx], int) and raw_item[idx] > 0:
                modified_ms = raw_item[idx]
                break

        view_url = None
        if len(raw_item) > 114 and isinstance(raw_item[114], str):
            view_url = raw_item[114]

        file_extension = None
        if len(raw_item) > 44 and isinstance(raw_item[44], str):
            file_extension = raw_item[44]

        return DriveItem(
            id=item_id,
            name=name,
            mime_type=mime_type,
            is_folder=is_folder,
            parents=parents,
            size_bytes=size_bytes,
            modified_time=_ms_to_iso(modified_ms),
            view_url=view_url,
            file_extension=file_extension,
        )


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", help="Google Drive folder URL or identifier")
    parser.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="Maximum recursion depth (0 = only the target folder)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Optional path to write the scraped metadata as JSON",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level for pretty-printing",
    )
    return parser


def main(argv: Optional[Iterable[str]] = None) -> None:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)

    folder_id = _extract_folder_id(args.folder)
    scraper = DriveScraper()
    root_item = scraper.scrape(folder_id, max_depth=args.max_depth)
    result = root_item.to_dict()

    json_output = json.dumps(result, indent=args.indent, ensure_ascii=False)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(json_output)
    else:
        print(json_output)


if __name__ == "__main__":
    main()
