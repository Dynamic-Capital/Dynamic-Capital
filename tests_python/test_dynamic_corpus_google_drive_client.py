import json
from typing import Any

import pytest

from dynamic_corpus_extraction.google_drive import GoogleDriveClient


class _FakeResponse:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return self._payload

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


class _FakeOpener:
    def __init__(self, response_payload: bytes) -> None:
        self.response_payload = response_payload
        self.last_request: Any | None = None

    def open(self, request):
        self.last_request = request
        return _FakeResponse(self.response_payload)


def test_upload_file_issues_multipart_request() -> None:
    opener = _FakeOpener(b"{\"id\": \"abc123\"}")
    client = GoogleDriveClient(api_key="test", opener_factory=lambda: opener)

    response = client.upload_file(
        metadata={"name": "share.json", "parents": "folder123"},
        media=json.dumps({"hello": "world"}).encode("utf-8"),
        media_mime_type="application/json",
    )

    assert response["id"] == "abc123"
    assert opener.last_request is not None

    request = opener.last_request
    assert request.get_method() == "POST"
    assert "uploadType=multipart" in request.full_url
    assert "supportsAllDrives=true" in request.full_url
    assert request.get_header("Accept") == "application/json"
    content_type = request.get_header("Content-type")
    assert content_type is not None
    assert content_type.startswith("multipart/related; boundary=")

    boundary = content_type.split("boundary=")[1]
    assert request.data.startswith(f"--{boundary}".encode())
    assert b"share.json" in request.data
    assert b"hello" in request.data


def test_upload_file_requires_parent() -> None:
    client = GoogleDriveClient(api_key="test", opener_factory=lambda: _FakeOpener(b"{}"))

    with pytest.raises(ValueError):
        client.upload_file(
            metadata={"name": "share.json"},
            media=b"{}",
            media_mime_type="application/json",
        )
