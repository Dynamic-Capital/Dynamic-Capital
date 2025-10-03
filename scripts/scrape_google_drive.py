"""Utilities for scraping public Google Drive folders.

This script recursively walks a public Google Drive folder using the
`embeddedfolderview` endpoint and stores structured metadata about every folder
and file it encounters. The collected data intentionally omits the binary
contents of each file, keeping the output lightweight while still providing
information that downstream consumers can use to decide what to download.

Example usage::

    python scripts/scrape_google_drive.py \
        https://drive.google.com/drive/folders/1jD0Z06Hhfj4XSzGL81h9x8olE4KkmVZR \
        --output data/google_drive_manifest.json

The resulting JSON document contains a tree structure with folder names, file
names, file sizes (as reported by Google Drive), last modified timestamps, and
direct links back to each resource on Drive.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup


FOLDER_VIEW_URL = "https://drive.google.com/embeddedfolderview?id={id}#list"


class GoogleDriveScrapeError(RuntimeError):
    """Raised when the scraper encounters an unrecoverable error."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape metadata from a public Google Drive folder using the "
            "embedded folder view."
        )
    )
    parser.add_argument(
        "url",
        help=(
            "A Google Drive folder URL or raw folder ID. Nested folders are "
            "scraped recursively."
        ),
    )
    parser.add_argument(
        "--output",
        "-o",
        default="data/google_drive_manifest.json",
        help="Path to the JSON file where scraped metadata will be stored.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30,
        help="Timeout (in seconds) to use for HTTP requests.",
    )
    return parser.parse_args()


def extract_folder_id(url_or_id: str) -> str:
    """Extract the folder ID from a Drive URL or return the argument as-is."""

    pattern = re.compile(r"/folders/([a-zA-Z0-9_-]+)")
    match = pattern.search(url_or_id)
    if match:
        return match.group(1)
    return url_or_id.strip()


def request_folder_page(folder_id: str, *, timeout: float) -> BeautifulSoup:
    response = requests.get(FOLDER_VIEW_URL.format(id=folder_id), timeout=timeout)
    if response.status_code != requests.codes.ok:
        raise GoogleDriveScrapeError(
            f"Failed to fetch folder {folder_id}: HTTP {response.status_code}"
        )
    return BeautifulSoup(response.text, "html.parser")


def is_folder_entry(entry: BeautifulSoup) -> bool:
    link = entry.find("a")
    if not link or not link.has_attr("href"):
        return False
    return "/folders/" in link["href"]


@dataclass
class DriveEntry:
    name: str
    url: str
    last_modified: Optional[str]
    entry_type: str
    id: Optional[str] = None
    size: Optional[str] = None
    children: List["DriveEntry"] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "name": self.name,
            "url": self.url,
            "type": self.entry_type,
        }
        if self.id:
            payload["id"] = self.id
        if self.last_modified:
            payload["last_modified"] = self.last_modified
        if self.size:
            payload["size"] = self.size
        if self.children:
            payload["children"] = [child.to_dict() for child in self.children]
        return payload


def parse_entry(
    entry: BeautifulSoup,
    *,
    timeout: float,
    visited: Optional[set[str]] = None,
) -> DriveEntry:
    link = entry.find("a")
    if not link or not link.has_attr("href"):
        raise GoogleDriveScrapeError("Encountered an entry without a hyperlink")

    name = entry.select_one(".flip-entry-title")
    if not name:
        raise GoogleDriveScrapeError("Missing title element in entry")
    name_text = name.get_text(strip=True)

    last_modified_container = entry.select_one(".flip-entry-last-modified div")
    last_modified = (
        last_modified_container.get_text(strip=True)
        if last_modified_container
        else None
    )

    size_container = entry.select_one(".flip-entry-size")
    size_text = size_container.get_text(strip=True) if size_container else None

    href = link["href"]

    if is_folder_entry(entry):
        folder_id = extract_folder_id(href)
        if visited is None:
            visited = set()
        if folder_id in visited:
            children: List[DriveEntry] = []
        else:
            visited.add(folder_id)
            children = scrape_folder(folder_id, timeout=timeout, visited=visited).children
        return DriveEntry(
            name=name_text,
            url=href,
            last_modified=last_modified,
            entry_type="folder",
            id=folder_id,
            children=children,
        )

    file_id_match = re.search(r"/d/([a-zA-Z0-9_-]+)", href)
    file_id = file_id_match.group(1) if file_id_match else None

    return DriveEntry(
        name=name_text,
        url=href,
        last_modified=last_modified,
        entry_type="file",
        id=file_id,
        size=size_text,
    )


def scrape_folder(
    folder_id: str,
    *,
    timeout: float,
    visited: Optional[set[str]] = None,
) -> DriveEntry:
    if visited is None:
        visited = set()
    visited.add(folder_id)

    soup = request_folder_page(folder_id, timeout=timeout)
    title_tag = soup.find("title")
    folder_name = title_tag.get_text(strip=True) if title_tag else folder_id

    entries: List[DriveEntry] = []
    for raw_entry in soup.select(".flip-entry"):
        entries.append(parse_entry(raw_entry, timeout=timeout, visited=visited))

    entries.sort(key=lambda entry: (entry.entry_type != "folder", entry.name.lower()))
    return DriveEntry(
        name=folder_name,
        url=FOLDER_VIEW_URL.format(id=folder_id),
        last_modified=None,
        entry_type="folder",
        id=folder_id,
        children=entries,
    )


def iter_entries(entry: DriveEntry, *, path: Tuple[str, ...] = ()) -> Iterable[Tuple[DriveEntry, Tuple[str, ...]]]:
    yield entry, path
    for child in entry.children:
        yield from iter_entries(child, path=path + (entry.name,))


def build_sections(root: DriveEntry) -> List[Dict[str, object]]:
    sections: List[Dict[str, object]] = []

    def walk(entry: DriveEntry, path: Tuple[str, ...]) -> None:
        if entry.entry_type != "folder":
            return

        breadcrumb = tuple(filter(None, path + (entry.name,)))
        path_string = "/".join(breadcrumb) if breadcrumb else entry.name
        section: Dict[str, object] = {
            "title": entry.name,
            "path": path_string,
            "breadcrumbs": list(breadcrumb) if breadcrumb else [entry.name],
            "folders": [],
            "files": [],
        }

        for child in entry.children:
            child_breadcrumb = breadcrumb + (child.name,)
            child_payload = {
                "name": child.name,
                "id": child.id,
                "url": child.url,
                "last_modified": child.last_modified,
                "size": child.size,
                "type": child.entry_type,
                "path": "/".join(child_breadcrumb),
                "breadcrumbs": list(child_breadcrumb),
            }
            if child.entry_type == "folder":
                section["folders"].append(child_payload)
            else:
                section["files"].append(child_payload)

        sections.append(section)

        for child in entry.children:
            walk(child, breadcrumb)

    walk(root, ())
    return sections


def build_lookup(root: DriveEntry) -> Dict[str, Dict[str, object]]:
    lookup: Dict[str, Dict[str, object]] = {}

    for entry, path in iter_entries(root):
        identifier = entry.id or entry.url
        breadcrumb = tuple(filter(None, path + (entry.name,)))
        lookup[identifier] = {
            "name": entry.name,
            "type": entry.entry_type,
            "url": entry.url,
            "path": "/".join(breadcrumb),
            "breadcrumbs": list(breadcrumb),
            "last_modified": entry.last_modified,
            "size": entry.size,
        }

    return lookup


def main() -> None:
    args = parse_args()
    folder_id = extract_folder_id(args.url)
    root_entry = scrape_folder(folder_id, timeout=args.timeout)

    with open(args.output, "w", encoding="utf-8") as f:
        payload = {
            "title": root_entry.name,
            "tree": root_entry.to_dict(),
            "sections": build_sections(root_entry),
            "lookup": build_lookup(root_entry),
        }
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Scraped metadata written to {args.output}")


if __name__ == "__main__":
    main()
