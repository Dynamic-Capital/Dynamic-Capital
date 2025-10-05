from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

import pytest

from dynamic_data_sharing import (
    DynamicDataSharingEngine,
    GoogleDriveShareRepository,
    SharePackage,
    SharePolicy,
)
from dynamic_database import DatabaseRecord


def _record(
    key: str,
    *,
    confidence: float,
    relevance: float,
    tags: tuple[str, ...],
    payload: dict[str, object],
    timestamp: datetime | None = None,
) -> DatabaseRecord:
    return DatabaseRecord(
        key=key,
        payload=payload,
        confidence=confidence,
        relevance=relevance,
        freshness=0.8,
        weight=1.0,
        timestamp=timestamp or datetime.now(timezone.utc),
        tags=tags,
        sources=("internal-docs",),
    )


def test_prepare_share_applies_policy_and_redactions() -> None:
    engine = DynamicDataSharingEngine()
    engine.register_table("knowledge", description="Knowledge base", tags=("public",))

    engine.ingest(
        "knowledge",
        _record(
            "alpha",
            confidence=0.92,
            relevance=0.81,
            tags=("public", "kb"),
            payload={
                "title": "Alpha Brief",
                "summary": "High-level overview",
                "pii": "secret",
            },
        ),
    )

    engine.ingest(
        "knowledge",
        _record(
            "beta",
            confidence=0.55,
            relevance=0.42,
            tags=("internal",),
            payload={"title": "Internal memo"},
        ),
    )

    policy = SharePolicy(
        min_confidence=0.8,
        min_relevance=0.7,
        allowed_tags=("public",),
        redact_keys=("pii",),
        include_sources=False,
    )

    package = engine.prepare_share(
        "knowledge", policy=policy, note="External partner sync"
    )

    assert isinstance(package, SharePackage)
    assert package.record_count == 1
    assert package.metadata["note"] == "External partner sync"
    assert package.metadata["filters"]["allowed_tags"] == ["public"]

    record = package.records[0]
    assert record.key.startswith("share-")  # anonymised
    assert record.payload == {"title": "Alpha Brief", "summary": "High-level overview"}
    assert not record.sources

    payload = package.to_dict()
    assert payload["checksum"].startswith("sha256:")
    assert payload["record_count"] == 1


def test_share_policy_normalises_inputs() -> None:
    policy = SharePolicy(
        max_records=5,
        min_confidence=1.2,
        min_relevance=-0.4,
        allowed_tags=(" Public ", "public", "ops"),
        redact_keys=(" secret ", "secret", "token"),
        anonymise_keys=False,
        include_sources=True,
    )

    assert policy.max_records == 5
    assert policy.min_confidence == 1.0
    assert policy.min_relevance == 0.0
    assert policy.allowed_tags == ("public", "ops")
    assert policy.redact_keys == ("secret", "token")
    assert not policy.anonymise_keys
    assert policy.include_sources


def test_prepare_share_can_include_sources_and_keep_keys() -> None:
    engine = DynamicDataSharingEngine()
    engine.register_table("signals", description="Signals", tags=("alpha",))

    timestamp = datetime(2025, 1, 1, tzinfo=timezone.utc)
    engine.ingest(
        "signals",
        _record(
            "gamma",
            confidence=0.9,
            relevance=0.9,
            tags=("alpha",),
            payload={"score": 0.78},
            timestamp=timestamp,
        ),
    )

    policy = SharePolicy(
        max_records=1,
        min_confidence=0.5,
        min_relevance=0.5,
        allowed_tags=(),
        redact_keys=(),
        anonymise_keys=False,
        include_sources=True,
    )

    package = engine.prepare_share("signals", policy=policy)

    assert package.record_count == 1
    record = package.records[0]
    assert record.key == "gamma"
    assert record.sources == ("internal-docs",)
    assert record.timestamp == timestamp


def test_share_policy_requires_positive_max_records() -> None:
    with pytest.raises(ValueError):
        SharePolicy(max_records=0)


def test_share_package_round_trip_from_dict() -> None:
    engine = DynamicDataSharingEngine()
    engine.register_table("knowledge", description="Knowledge base", tags=("public",))
    engine.ingest(
        "knowledge",
        _record(
            "alpha",
            confidence=0.95,
            relevance=0.8,
            tags=("public",),
            payload={"title": "Alpha"},
        ),
    )
    policy = SharePolicy(min_confidence=0.8, min_relevance=0.7, allowed_tags=("public",))
    package = engine.prepare_share("knowledge", policy=policy)
    payload = package.to_dict()

    reconstructed = SharePackage.from_dict(payload)

    assert reconstructed.to_dict() == payload


class _DummyDriveClient:
    def __init__(self) -> None:
        self.upload_calls: list[tuple[MutableMapping[str, object], bytes, str]] = []
        self._files: list[MutableMapping[str, object]] = []
        self._media: dict[str, bytes] = {}

    def upload_file(
        self,
        *,
        metadata: Mapping[str, object],
        media: bytes,
        media_mime_type: str,
    ) -> MutableMapping[str, object]:
        entry = dict(metadata)
        file_id = entry.get("id") or f"id{len(self._files) + 1}"
        entry["id"] = file_id
        self.upload_calls.append((entry, bytes(media), media_mime_type))
        self._files.append(entry)
        self._media[file_id] = bytes(media)
        return entry

    def iter_files(
        self,
        *,
        folder_id: str,
        mime_types: Sequence[str] | None = None,
        page_size: int = 200,
        fields: str = "",
    ) -> Iterable[MutableMapping[str, object]]:
        yield from (dict(entry) for entry in self._files)

    def download_file(self, file_id: str) -> bytes:
        return self._media[file_id]


def test_google_drive_share_repository_upload_and_iterate() -> None:
    client = _DummyDriveClient()
    repo = GoogleDriveShareRepository(client=client, folder_id="folder123")

    engine = DynamicDataSharingEngine()
    engine.register_table("signals", description="Signals", tags=("alpha",))
    engine.ingest(
        "signals",
        _record(
            "gamma",
            confidence=0.9,
            relevance=0.9,
            tags=("alpha",),
            payload={"score": 0.78},
        ),
    )
    policy = SharePolicy(min_confidence=0.8, min_relevance=0.8, allowed_tags=("alpha",))
    package = engine.prepare_share("signals", policy=policy)

    metadata = repo.upload_package(package, file_name="snapshot.json")

    assert metadata["name"] == "snapshot.json"
    assert client.upload_calls

    uploaded_metadata, uploaded_media, uploaded_type = client.upload_calls[0]
    assert uploaded_metadata["parents"] == ["folder123"]
    assert uploaded_type == "application/json"

    stored_payload = json.loads(uploaded_media.decode("utf-8"))
    assert stored_payload["table"] == "signals"

    packages = list(repo.iter_packages())
    assert len(packages) == 1
    iter_metadata, iter_package = packages[0]
    assert iter_metadata["id"] == metadata["id"]
    assert iter_package.to_dict() == SharePackage.from_dict(stored_payload).to_dict()


def test_google_drive_share_repository_accepts_share_link() -> None:
    client = _DummyDriveClient()
    repo = GoogleDriveShareRepository(
        client=client,
        share_link="https://drive.google.com/drive/folders/abc123",
    )

    assert repo.folder_id == "abc123"

