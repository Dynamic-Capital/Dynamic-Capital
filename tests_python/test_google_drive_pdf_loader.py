import sys
from pathlib import Path
from typing import Iterable, Iterator, MutableMapping

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_corpus_extraction import CorpusExtractionContext  # noqa: E402
from dynamic_corpus_extraction.google_drive import (  # noqa: E402
    build_google_drive_pdf_loader,
    parse_drive_share_link,
)


class FakeDriveClient:
    def __init__(
        self,
        *,
        folder_entries: Iterable[MutableMapping[str, object]] | None = None,
        file_payloads: dict[str, bytes] | None = None,
        file_metadata: dict[str, MutableMapping[str, object]] | None = None,
    ) -> None:
        self.folder_entries = [dict(entry) for entry in folder_entries or []]
        self.file_payloads = dict(file_payloads or {})
        self.file_metadata = {
            key: dict(value) for key, value in (file_metadata or {}).items()
        }
        self.iter_calls: list[tuple[str, tuple[str, ...], int]] = []
        self.download_calls: list[str] = []
        self.metadata_calls: list[tuple[str, str | None]] = []

    def iter_files(
        self,
        *,
        folder_id: str,
        mime_types: Iterable[str] | None = None,
        page_size: int,
        fields: str | None = None,
    ) -> Iterator[MutableMapping[str, object]]:
        self.iter_calls.append((folder_id, tuple(mime_types or ()), page_size))
        for entry in self.folder_entries:
            yield dict(entry)

    def download_file(self, file_id: str) -> bytes:
        self.download_calls.append(file_id)
        return self.file_payloads.get(file_id, b"pdf")

    def get_file_metadata(self, file_id: str, *, fields: str | None = None) -> MutableMapping[str, object]:
        self.metadata_calls.append((file_id, fields))
        if file_id not in self.file_metadata:
            raise KeyError(file_id)
        return dict(self.file_metadata[file_id])


def test_parse_drive_share_link_variants():
    folder_type, folder_id = parse_drive_share_link(
        "https://drive.google.com/drive/folders/abc123?usp=sharing"
    )
    assert folder_type == "folder"
    assert folder_id == "abc123"

    file_type, file_id = parse_drive_share_link(
        "https://drive.google.com/file/d/xyz789/view?usp=sharing"
    )
    assert file_type == "file"
    assert file_id == "xyz789"

    file_type, file_id = parse_drive_share_link(
        "https://drive.google.com/open?id=qwerty"
    )
    assert file_type == "file"
    assert file_id == "qwerty"

    with pytest.raises(ValueError):
        parse_drive_share_link("https://drive.google.com/drive/my-drive")


def test_loader_streams_folder_documents():
    client = FakeDriveClient(
        folder_entries=[
            {
                "id": "doc-1",
                "name": "Report.pdf",
                "mimeType": "application/pdf",
                "size": "1200",
                "modifiedTime": "2024-01-01T00:00:00Z",
                "md5Checksum": "hash-1",
                "webViewLink": "https://drive.google.com/file/d/doc-1/view",
            },
            {
                "id": "skip-text",
                "name": "notes.txt",
                "mimeType": "text/plain",
            },
        ]
    )

    def fake_extractor(payload: bytes, metadata: MutableMapping[str, object]) -> str:
        return f"text:{metadata['id']}"

    loader = build_google_drive_pdf_loader(
        folder_id="folder",
        client_factory=lambda: client,
        pdf_text_extractor=fake_extractor,
    )

    context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
    documents = list(loader(context))

    assert [doc["identifier"] for doc in documents] == ["google-drive-doc-1"]
    document = documents[0]
    assert document["content"] == "text:doc-1"
    assert document["tags"] == ("google_drive", "pdf")
    assert document["metadata"]["file_id"] == "doc-1"
    assert document["metadata"]["md5_checksum"] == "hash-1"
    assert document["metadata"]["web_view_link"].startswith("https://drive.google.com")


def test_loader_respects_limits_and_size_filters():
    client = FakeDriveClient(
        folder_entries=[
            {
                "id": "too-large",
                "name": "Large.pdf",
                "mimeType": "application/pdf",
                "size": "60000000",
            },
            {
                "id": "ok",
                "name": "Ok.pdf",
                "mimeType": "application/pdf",
                "size": 500,
            },
        ],
        file_payloads={"ok": b"payload"},
    )

    loader = build_google_drive_pdf_loader(
        folder_id="folder",
        client_factory=lambda: client,
        pdf_text_extractor=lambda payload, metadata: "ok-text",
        max_file_size=1000,
    )

    context = CorpusExtractionContext(source="google_drive", limit=1, metadata={})
    documents = list(loader(context))

    assert len(documents) == 1
    assert documents[0]["identifier"] == "google-drive-ok"
    assert client.download_calls == ["ok"]


def test_loader_fetches_explicit_files():
    client = FakeDriveClient(
        folder_entries=[],
        file_metadata={
            "file-1": {
                "id": "file-1",
                "name": "Explicit.pdf",
                "mimeType": "application/pdf",
            }
        },
        file_payloads={"file-1": b"binary"},
    )

    loader = build_google_drive_pdf_loader(
        file_ids=["file-1"],
        client_factory=lambda: client,
        pdf_text_extractor=lambda payload, metadata: "explicit-text",
    )

    context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
    documents = list(loader(context))

    assert [doc["identifier"] for doc in documents] == ["google-drive-file-1"]
    assert client.metadata_calls == [("file-1", "id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink")]
    assert client.download_calls == ["file-1"]


def test_loader_uses_ocr_fallback(monkeypatch):
    client = FakeDriveClient(
        folder_entries=[
            {
                "id": "ocr",
                "name": "Scanned.pdf",
                "mimeType": "application/pdf",
            }
        ],
        file_payloads={"ocr": b"pdf-bytes"},
    )

    def failing_extractor(payload: bytes, metadata: MutableMapping[str, object]) -> str:
        return ""

    def fake_ocr(payload: bytes, *, file_name: str, languages: str | None, dpi: int) -> str:
        assert file_name == "Scanned.pdf"
        assert dpi == 200
        assert languages == "eng"
        return "ocr-text"

    monkeypatch.setattr(
        "dynamic_corpus_extraction.google_drive._ocr_pdf_text_extractor",
        fake_ocr,
    )

    loader = build_google_drive_pdf_loader(
        folder_id="folder",
        client_factory=lambda: client,
        pdf_text_extractor=failing_extractor,
        enable_ocr=True,
        ocr_languages=("eng",),
        ocr_dpi=200,
    )

    context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
    documents = list(loader(context))

    assert documents[0]["content"] == "ocr-text"
    assert client.download_calls == ["ocr"]
