import builtins
import json
import sys
import types
from pathlib import Path
from typing import Iterable, Iterator, MutableMapping

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_corpus_extraction import (  # noqa: E402
    CorpusDocument,
    CorpusExtractionContext,
)
from dynamic_corpus_extraction.google_drive import (  # noqa: E402
    build_google_drive_pdf_loader,
    parse_drive_share_link,
    parse_drive_share_link_details,
)
from dynamic_keepers.bookkeeping import GoogleDriveBookkeeper  # noqa: E402
from dynamic_database.database import DynamicDatabase  # noqa: E402
from scripts.index_google_drive_pdfs import (  # noqa: E402
    _serialise_snapshot,
    _write_knowledge_base_drop,
    _build_local_drive_client,
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
        self.iter_calls: list[tuple[str, tuple[str, ...], int, str | None]] = []
        self.download_calls: list[tuple[str, str | None]] = []
        self.metadata_calls: list[tuple[str, str | None, str | None]] = []

    def iter_files(
        self,
        *,
        folder_id: str,
        mime_types: Iterable[str] | None = None,
        page_size: int,
        fields: str | None = None,
        resource_key: str | None = None,
    ) -> Iterator[MutableMapping[str, object]]:
        self.iter_calls.append((folder_id, tuple(mime_types or ()), page_size, resource_key))
        for entry in self.folder_entries:
            yield dict(entry)

    def download_file(self, file_id: str, *, resource_key: str | None = None) -> bytes:
        self.download_calls.append((file_id, resource_key))
        return self.file_payloads.get(file_id, b"pdf")

    def get_file_metadata(
        self,
        file_id: str,
        *,
        fields: str | None = None,
        resource_key: str | None = None,
    ) -> MutableMapping[str, object]:
        self.metadata_calls.append((file_id, fields, resource_key))
        if file_id not in self.file_metadata:
            raise KeyError(file_id)
        return dict(self.file_metadata[file_id])


def test_parse_drive_share_link_variants():
    folder_type, folder_id = parse_drive_share_link(
        "https://drive.google.com/drive/folders/abc123?usp=sharing"
    )
    assert folder_type == "folder"
    assert folder_id == "abc123"
    folder_details = parse_drive_share_link_details(
        "https://drive.google.com/drive/folders/abc123?usp=sharing"
    )
    assert folder_details.target_type == "folder"
    assert folder_details.identifier == "abc123"
    assert folder_details.resource_key is None

    file_type, file_id = parse_drive_share_link(
        "https://drive.google.com/file/d/xyz789/view?usp=sharing"
    )
    assert file_type == "file"
    assert file_id == "xyz789"
    file_details = parse_drive_share_link_details(
        "https://drive.google.com/file/d/xyz789/view?usp=sharing&resourcekey=secret"
    )
    assert file_details.target_type == "file"
    assert file_details.identifier == "xyz789"
    assert file_details.resource_key == "secret"

    file_type, file_id = parse_drive_share_link(
        "https://drive.google.com/open?id=qwerty"
    )
    assert file_type == "file"
    assert file_id == "qwerty"
    open_details = parse_drive_share_link_details(
        "https://drive.google.com/open?id=qwerty"
    )
    assert open_details.target_type == "file"
    assert open_details.identifier == "qwerty"
    assert open_details.resource_key is None

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
    assert "resource_key" not in document["metadata"]


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
    assert client.download_calls == [("ok", None)]


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
    assert client.metadata_calls == [
        (
            "file-1",
            "id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink, resourceKey",
            None,
        )
    ]
    assert client.download_calls == [("file-1", None)]


def test_loader_handles_resource_key_share_link():
    client = FakeDriveClient(
        folder_entries=[],
        file_metadata={
            "secure": {
                "id": "secure",
                "name": "Secure.pdf",
                "mimeType": "application/pdf",
                "resourceKey": "secret-key",
            }
        },
        file_payloads={"secure": b"secure-bytes"},
    )

    loader = build_google_drive_pdf_loader(
        share_link="https://drive.google.com/file/d/secure/view?usp=drive_link&resourcekey=secret-key",
        client_factory=lambda: client,
        pdf_text_extractor=lambda payload, metadata: "secure-text",
    )

    context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
    documents = list(loader(context))

    assert [doc["identifier"] for doc in documents] == ["google-drive-secure"]
    assert client.metadata_calls == [
        (
            "secure",
            "id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink, resourceKey",
            "secret-key",
        )
    ]
    assert client.download_calls == [("secure", "secret-key")]
    assert documents[0]["metadata"]["resource_key"] == "secret-key"


def test_loader_attaches_page_metadata(monkeypatch):
    client = FakeDriveClient(
        folder_entries=[
            {
                "id": "page-doc",
                "name": "Paged.pdf",
                "mimeType": "application/pdf",
            }
        ],
        file_payloads={"page-doc": b"pdf-bytes"},
    )

    page_calls: list[bytes] = []

    def fake_extract_pdf_pages(payload: bytes, *, auto_install: bool = False) -> list[str]:
        page_calls.append(payload)
        return ["Page 1 text", "Page 2 text"]

    monkeypatch.setattr(
        "dynamic_corpus_extraction.google_drive._extract_pdf_pages",
        fake_extract_pdf_pages,
    )

    loader = build_google_drive_pdf_loader(
        folder_id="folder",
        client_factory=lambda: client,
        include_page_data=True,
    )

    context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
    documents = list(loader(context))

    assert len(documents) == 1
    document = documents[0]
    assert document["content"] == "Page 1 text\nPage 2 text"
    metadata = document["metadata"]
    assert metadata["page_count"] == 2
    assert metadata["pages"] == [
        {"page_number": 1, "content": "Page 1 text"},
        {"page_number": 2, "content": "Page 2 text"},
    ]
    assert len(page_calls) == 1


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
    assert client.download_calls == [("ocr", None)]


def test_write_knowledge_base_drop(tmp_path):
    database = DynamicDatabase()
    keeper = GoogleDriveBookkeeper(table="drive_docs", database=database)
    corpus_document = CorpusDocument(
        identifier="google-drive-doc-1",
        content="Document body",
        source="google_drive",
        metadata={
            "web_view_link": "https://drive.google.com/file/d/doc-1/view",
            "md5_checksum": "hash",
        },
        tags=("google_drive", "pdf"),
    )

    records = keeper.index_documents([corpus_document])
    snapshot = _serialise_snapshot(keeper)
    summary_payload = {
        "documents": 1,
        "duplicate_count": 0,
        "source_statistics": {"google_drive": 1},
        "elapsed_seconds": 0.0,
        "ocr_enabled": False,
    }

    drop_path = _write_knowledge_base_drop(
        drop_id="2025-12-01",
        title="Google Drive Knowledge Drop",
        root_dir=tmp_path,
        summary=summary_payload,
        documents=(corpus_document,),
        snapshot=snapshot,
        records=records,
        share_link="https://drive.google.com/drive/folders/example?resourcekey=secret",
        folder_id="example",
        file_ids=("doc-1",),
    )

    payload = json.loads(drop_path.read_text(encoding="utf-8"))
    assert payload["dropId"] == "2025-12-01"
    assert payload["title"] == "Google Drive Knowledge Drop"
    assert payload["summary"]["documents"] == 1
    assert payload["snapshot"]["record_count"] == 1
    assert payload["documents"][0]["identifier"] == "google-drive-doc-1"
    assert payload["records"][0]["key"] == "google-drive-doc-1"
    assert payload["source"]["share_link"].startswith("https://drive.google.com/drive/")
    assert payload["source"]["folder_id"] == "example"
    assert payload["source"]["file_ids"] == ["doc-1"]


def test_loader_installs_pypdf2_when_requested(monkeypatch):
    client = FakeDriveClient(
        folder_entries=[
            {
                "id": "auto-install",
                "name": "Auto.pdf",
                "mimeType": "application/pdf",
            }
        ],
        file_payloads={"auto-install": b"binary"},
    )

    original_module = sys.modules.pop("PyPDF2", None)
    install_calls: list[list[str]] = []

    try:
        def fake_install() -> None:
            install_calls.append(["PyPDF2"])
            fake_module = types.ModuleType("PyPDF2")

            class _FakePage:
                def extract_text(self) -> str:
                    return "auto-installed-text"

            class _FakeReader:
                def __init__(self, stream: object) -> None:
                    self.pages = [_FakePage()]

            fake_module.PdfReader = _FakeReader  # type: ignore[attr-defined]
            sys.modules["PyPDF2"] = fake_module

        monkeypatch.setattr(
            "dynamic_corpus_extraction.google_drive._install_pypdf2",
            fake_install,
        )

        import_attempts = {"count": 0}
        original_import = builtins.__import__

        def fake_import(name, *args, **kwargs):
            if name == "PyPDF2" and import_attempts["count"] == 0:
                import_attempts["count"] += 1
                raise ModuleNotFoundError("No module named 'PyPDF2'")
            return original_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", fake_import)

        loader = build_google_drive_pdf_loader(
            folder_id="folder",
            client_factory=lambda: client,
            max_file_size=10_000,
            install_missing_pypdf2=True,
        )

        context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
        documents = list(loader(context))

        assert documents[0]["content"] == "auto-installed-text"
        assert install_calls == [["PyPDF2"]]
    finally:
        if original_module is not None:
            sys.modules["PyPDF2"] = original_module
        else:
            sys.modules.pop("PyPDF2", None)


def test_local_drive_fixture_loader(tmp_path):
    pdf_dir = tmp_path / "pdfs"
    pdf_dir.mkdir()
    sample_pdf = pdf_dir / "example.pdf"
    sample_pdf.write_bytes(b"dummy pdf bytes")

    client_factory = _build_local_drive_client(pdf_dir, folder_id="local-fixture")

    loader = build_google_drive_pdf_loader(
        folder_id="local-fixture",
        client_factory=client_factory,
        pdf_text_extractor=lambda payload, metadata: f"fixture:{metadata['id']}",
    )

    context = CorpusExtractionContext(source="google_drive", limit=None, metadata={})
    documents = list(loader(context))

    assert len(documents) == 1
    document = documents[0]
    assert document["identifier"].startswith("google-drive-local-")
    assert document["content"] == f"fixture:{document['metadata']['file_id']}"
    assert document["metadata"]["file_name"] == "example.pdf"
    assert document["metadata"]["web_view_link"].startswith("file://")
    assert document["metadata"]["local_path"].endswith("example.pdf")
