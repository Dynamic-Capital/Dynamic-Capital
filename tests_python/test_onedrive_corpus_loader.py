"""Tests for the OneDrive corpus extraction helpers."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_corpus_extraction import (  # noqa: E402
    CorpusExtractionContext,
    DynamicCorpusExtractionEngine,
)
from dynamic_corpus_extraction.onedrive import (  # noqa: E402
    build_onedrive_share_loader,
    to_share_id,
)


class FakeClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[object, ...]]] = []

    def get_share_root(self, share_link: str):
        self.calls.append(("get_share_root", (share_link,)))
        return {
            "id": "root",
            "name": "Root",
            "parentReference": {"driveId": "drive"},
        }

    def iter_children(self, drive_id: str, item_id: str):
        self.calls.append(("iter_children", (drive_id, item_id)))
        if item_id == "root":
            yield {
                "id": "folder",
                "name": "Notes",
                "folder": {},
                "parentReference": {"driveId": drive_id},
            }
            yield {
                "id": "readme",
                "name": "README.md",
                "size": 120,
                "file": {"mimeType": "text/markdown"},
                "parentReference": {"driveId": drive_id},
                "webUrl": "https://example/README.md",
                "lastModifiedDateTime": "2025-10-01T12:00:00Z",
            }
        elif item_id == "folder":
            yield {
                "id": "notes",
                "name": "notes.txt",
                "size": 42,
                "file": {"mimeType": "text/plain"},
                "parentReference": {"driveId": drive_id},
            }

    def download_text(self, drive_id: str, item_id: str) -> str:
        self.calls.append(("download_text", (drive_id, item_id)))
        payloads = {
            "readme": "Root readme",
            "notes": "Nested notes",
        }
        return payloads[item_id]


class LargeFileClient(FakeClient):
    def iter_children(self, drive_id: str, item_id: str):
        self.calls.append(("iter_children", (drive_id, item_id)))
        if item_id == "root":
            yield {
                "id": "large",
                "name": "large.txt",
                "size": 9_000_000,
                "file": {"mimeType": "text/plain"},
                "parentReference": {"driveId": drive_id},
            }
            yield {
                "id": "ok",
                "name": "ok.txt",
                "size": 120,
                "file": {"mimeType": "text/plain"},
                "parentReference": {"driveId": drive_id},
            }
        elif item_id == "folder":
            return

    def download_text(self, drive_id: str, item_id: str) -> str:
        self.calls.append(("download_text", (drive_id, item_id)))
        return f"content-{item_id}"


class NoMimeClient(FakeClient):
    def iter_children(self, drive_id: str, item_id: str):
        self.calls.append(("iter_children", (drive_id, item_id)))
        if item_id == "root":
            yield {
                "id": "log",
                "name": "events.log",
                "size": 10,
                "file": {},
                "parentReference": {"driveId": drive_id},
            }

    def download_text(self, drive_id: str, item_id: str) -> str:
        self.calls.append(("download_text", (drive_id, item_id)))
        return "log-line"


class CustomMimeClient(FakeClient):
    def iter_children(self, drive_id: str, item_id: str):
        self.calls.append(("iter_children", (drive_id, item_id)))
        if item_id == "root":
            yield {
                "id": "custom",
                "name": "report.bin",
                "size": 10,
                "file": {"mimeType": "application/custom"},
                "parentReference": {"driveId": drive_id},
            }
            yield {
                "id": "prefixed",
                "name": "summary.dat",
                "size": 20,
                "file": {"mimeType": "application/vnd.custom.report"},
                "parentReference": {"driveId": drive_id},
            }

    def download_text(self, drive_id: str, item_id: str) -> str:
        self.calls.append(("download_text", (drive_id, item_id)))
        payloads = {
            "custom": "custom-doc",
            "prefixed": "prefixed-doc",
        }
        return payloads[item_id]


def test_loader_yields_documents():
    fake_client = FakeClient()
    loader = build_onedrive_share_loader(
        "https://example/share",
        client_factory=lambda: fake_client,
    )
    context = CorpusExtractionContext(source="share", limit=None, metadata={})
    documents = list(loader(context))

    assert [document.identifier for document in documents] == [
        "README.md",
        "Notes/notes.txt",
    ]
    assert documents[0].content == "Root readme"
    assert documents[0].metadata["share_link"] == "https://example/share"
    assert documents[0].metadata["share_id"] == to_share_id("https://example/share")
    assert documents[0].metadata["drive_item_id"] == "readme"
    assert documents[0].tags == ("onedrive", "share")


def test_loader_respects_limit():
    fake_client = FakeClient()
    loader = build_onedrive_share_loader(
        "https://example/share",
        client_factory=lambda: fake_client,
    )
    context = CorpusExtractionContext(source="share", limit=1, metadata={})
    documents = list(loader(context))

    assert len(documents) == 1
    assert documents[0].identifier == "README.md"


def test_loader_skips_large_files():
    fake_client = LargeFileClient()
    loader = build_onedrive_share_loader(
        "https://example/share",
        client_factory=lambda: fake_client,
        max_file_size=1_000,
    )
    context = CorpusExtractionContext(source="share", limit=None, metadata={})
    documents = list(loader(context))

    assert [document.identifier for document in documents] == ["ok.txt"]


def test_loader_supports_custom_extensions():
    fake_client = NoMimeClient()
    loader = build_onedrive_share_loader(
        "https://example/share",
        client_factory=lambda: fake_client,
        allowed_extensions=(".log",),
    )
    context = CorpusExtractionContext(source="share", limit=None, metadata={})
    documents = list(loader(context))

    assert [document.identifier for document in documents] == ["events.log"]


def test_loader_normalises_allowed_mime_configuration():
    fake_client = CustomMimeClient()
    loader = build_onedrive_share_loader(
        "https://example/share",
        client_factory=lambda: fake_client,
        allowed_mime_types=("APPLICATION/CUSTOM", " application/custom "),
        allowed_mime_prefixes=("APPLICATION/VND.CUSTOM",),
    )
    context = CorpusExtractionContext(source="share", limit=None, metadata={})
    documents = list(loader(context))

    assert [document.identifier for document in documents] == [
        "report.bin",
        "summary.dat",
    ]


def test_loader_requires_access_token_when_no_factory():
    with pytest.raises(ValueError):
        build_onedrive_share_loader("https://example/share")


def test_loader_with_engine_integration():
    fake_client = FakeClient()
    loader = build_onedrive_share_loader(
        "https://example/share",
        client_factory=lambda: fake_client,
    )
    engine = DynamicCorpusExtractionEngine()
    engine.register_source("share", loader)
    summary = engine.extract()

    assert len(summary.documents) == 2
    assert summary.source_statistics == {"share": 2}
