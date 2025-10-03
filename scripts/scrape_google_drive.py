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
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, DefaultDict, Dict, Iterable, List, Optional, Tuple, cast

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


def build_team(root: DriveEntry) -> Dict[str, Any]:
    """Assign folders and files to collaborating automation roles."""

    team: Dict[str, Any] = {
        "agents": [],
        "crawlers": [],
        "helpers": [],
        "bots": [],
        "scrapers": [],
        "index": {},
    }

    agents_map: Dict[str, Dict[str, object]] = {}
    bot_map: DefaultDict[str, List[Dict[str, object]]] = defaultdict(list)

    def walk(entry: DriveEntry, path: Tuple[str, ...]) -> None:
        breadcrumb = tuple(filter(None, path + (entry.name,)))
        path_string = "/".join(breadcrumb)
        parent = path[-1] if path else None
        top_agent = (
            breadcrumb[1]
            if len(breadcrumb) > 1
            else (breadcrumb[0] if len(breadcrumb) == 1 else None)
        )

        base_payload: Dict[str, object] = {
            "name": entry.name,
            "id": entry.id,
            "url": entry.url,
            "path": path_string,
            "breadcrumbs": list(breadcrumb),
            "last_modified": entry.last_modified,
            "size": entry.size,
            "type": entry.entry_type,
        }

        if entry.id:
            team_index = cast(Dict[str, str], team["index"])
            team_index[path_string] = entry.id

        if entry.entry_type == "folder":
            folder_children = {
                "folders": sum(
                    1 for child in entry.children if child.entry_type == "folder"
                ),
                "files": sum(
                    1 for child in entry.children if child.entry_type == "file"
                ),
            }

            folder_payload: Dict[str, object] = {
                **base_payload,
                "parent": parent,
                "depth": max(len(breadcrumb) - 1, 0),
                "children": folder_children,
            }

            team_scrapers = cast(List[Dict[str, object]], team["scrapers"])
            team_scrapers.append(
                {
                    "target": path_string or entry.name,
                    "id": entry.id,
                    "url": entry.url,
                    "depth": folder_payload["depth"],
                    "children": folder_children,
                }
            )

            if path:
                team_crawlers = cast(List[Dict[str, object]], team["crawlers"])
                team_crawlers.append(folder_payload)

            if len(path) == 1:
                agents_map.setdefault(
                    entry.name,
                    {
                        "name": entry.name,
                        "id": entry.id,
                        "url": entry.url,
                        "path": path_string,
                        "breadcrumbs": list(breadcrumb),
                        "folders": [],
                        "files": [],
                    },
                )
            elif top_agent and top_agent in agents_map:
                agents_map[top_agent]["folders"].append(folder_payload)

            for child in entry.children:
                walk(child, breadcrumb)

        else:
            file_payload: Dict[str, object] = {
                **base_payload,
                "parent": parent,
                "depth": max(len(breadcrumb) - 1, 0),
            }

            team_helpers = cast(List[Dict[str, object]], team["helpers"])
            team_helpers.append(file_payload)

            extension = entry.name.rsplit(".", 1)[-1].lower() if "." in entry.name else ""
            bot_map[extension].append(file_payload)

            if top_agent and top_agent in agents_map:
                agents_map[top_agent]["files"].append(file_payload)

    walk(root, ())

    agents: List[Dict[str, object]] = []
    for agent_name in sorted(agents_map):
        agent_payload = agents_map[agent_name]
        folders = sorted(
            agent_payload["folders"], key=lambda item: item["path"]
        )
        files = sorted(agent_payload["files"], key=lambda item: item["path"])
        summary = {
            "folders": len(folders),
            "files": len(files),
            "total": len(folders) + len(files),
        }
        agents.append(
            {
                "name": agent_payload["name"],
                "id": agent_payload["id"],
                "url": agent_payload["url"],
                "path": agent_payload["path"],
                "breadcrumbs": agent_payload["breadcrumbs"],
                "summary": summary,
                "assignments": {
                    "folders": folders,
                    "files": files,
                },
            }
        )

    team["agents"] = agents

    team["crawlers"] = sorted(
        cast(List[Dict[str, object]], team["crawlers"]), key=lambda item: item["path"]
    )
    team["helpers"] = sorted(
        cast(List[Dict[str, object]], team["helpers"]), key=lambda item: item["path"]
    )
    team["scrapers"] = sorted(
        cast(List[Dict[str, object]], team["scrapers"]), key=lambda item: item["target"]
    )

    bots: List[Dict[str, object]] = []
    for extension in sorted(bot_map):
        assignments = sorted(bot_map[extension], key=lambda item: item["path"])
        bots.append(
            {
                "name": f"{extension.upper() if extension else 'MISC'} bot",
                "extension": extension or None,
                "count": len(assignments),
                "files": assignments,
            }
        )
    team["bots"] = bots

    team["index"] = dict(sorted(cast(Dict[str, str], team["index"]).items()))

    return team


def build_workflow(team: Dict[str, object]) -> List[Dict[str, object]]:
    """Describe the orchestration order for the generated team."""

    workflow: List[Dict[str, object]] = []

    def add_stage(
        owner: str,
        description: str,
        entries: List[Dict[str, object]],
        *,
        coverage_key: str,
    ) -> None:
        coverage = sorted(
            {
                entry.get(coverage_key)
                for entry in entries
                if entry.get(coverage_key)
            }
        )
        workflow.append(
            {
                "owner": owner,
                "description": description,
                "count": len(entries),
                "coverage": {
                    "total": len(coverage),
                    "sample": coverage[:10],
                },
            }
        )

    scrapers = cast(List[Dict[str, object]], team["scrapers"])
    crawlers = cast(List[Dict[str, object]], team["crawlers"])
    agents = cast(List[Dict[str, object]], team["agents"])
    helpers = cast(List[Dict[str, object]], team["helpers"])
    bots = cast(List[Dict[str, object]], team["bots"])
    index = cast(Dict[str, str], team["index"])

    add_stage(
        "scrapers",
        "Collect folder listings across the Drive hierarchy.",
        scrapers,
        coverage_key="target",
    )
    add_stage(
        "crawlers",
        "Traverse nested folders and prepare contextual payloads.",
        crawlers,
        coverage_key="path",
    )
    add_stage(
        "agents",
        "Curate topic collections and supervise downstream processing.",
        agents,
        coverage_key="path",
    )
    add_stage(
        "helpers",
        "Attach file-level metadata and prepare assets for downstream bots.",
        helpers,
        coverage_key="path",
    )

    workflow.append(
        {
            "owner": "bots",
            "description": "Automate handling by file format and extension.",
            "count": sum(bot["count"] for bot in bots),
            "formats": [
                {
                    "extension": bot["extension"],
                    "count": bot["count"],
                    "sample_paths": [
                        file["path"] for file in bot["files"][:5]
                    ],
                }
                for bot in bots
            ],
        }
    )

    workflow.append(
        {
            "owner": "index",
            "description": (
                "Provide path-to-ID lookups for orchestration and cross-team "
                "reference."
            ),
            "count": len(index),
        }
    )

    return workflow


def main() -> None:
    args = parse_args()
    folder_id = extract_folder_id(args.url)
    root_entry = scrape_folder(folder_id, timeout=args.timeout)

    team = build_team(root_entry)

    with open(args.output, "w", encoding="utf-8") as f:
        payload = {
            "title": root_entry.name,
            "tree": root_entry.to_dict(),
            "sections": build_sections(root_entry),
            "lookup": build_lookup(root_entry),
            "team": team,
            "workflow": build_workflow(team),
        }
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Scraped metadata written to {args.output}")


if __name__ == "__main__":
    main()
