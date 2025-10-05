"""Google Drive helpers for distributing share packages."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_corpus_extraction.google_drive import (
    GoogleDriveClient,
    parse_drive_share_link,
)

from . import SharePackage

__all__ = [
    "GoogleDriveShareRepository",
]


class GoogleDriveShareRepository:
    """Utility wrapper for persisting share packages to Google Drive folders."""

    def __init__(
        self,
        *,
        client: GoogleDriveClient,
        folder_id: str | None = None,
        share_link: str | None = None,
        default_prefix: str = "share-package",
    ) -> None:
        if share_link:
            target_type, identifier = parse_drive_share_link(share_link)
            if target_type != "folder":
                raise ValueError("Google Drive share link must reference a folder")
            if folder_id and folder_id.strip() and folder_id.strip() != identifier:
                raise ValueError("Conflicting folder identifiers provided")
            folder_id = identifier
        resolved = (folder_id or "").strip()
        if not resolved:
            raise ValueError("A folder_id or share_link pointing at a folder is required")
        self._client = client
        self._folder_id = resolved
        self._default_prefix = default_prefix.strip() or "share-package"

    @property
    def folder_id(self) -> str:
        return self._folder_id

    def _default_file_name(self, package: SharePackage) -> str:
        timestamp = package.generated_at.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        return f"{self._default_prefix}-{package.table}-{timestamp}.json"

    def upload_package(
        self,
        package: SharePackage,
        *,
        file_name: str | None = None,
        drive_metadata: Mapping[str, object] | None = None,
    ) -> MutableMapping[str, object]:
        """Upload ``package`` to the configured Google Drive folder."""

        name = (file_name or self._default_file_name(package)).strip()
        if not name:
            raise ValueError("file_name must not be empty")
        if "." not in name:
            name = f"{name}.json"
        payload = json.dumps(package.to_dict(), ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8")
        metadata = {"name": name, "parents": [self._folder_id], "mimeType": "application/json"}
        if drive_metadata:
            metadata.update(drive_metadata)
        response = self._client.upload_file(
            metadata=metadata,
            media=payload,
            media_mime_type="application/json",
        )
        return response

    def list_package_metadata(
        self,
        *,
        mime_types: Sequence[str] | None = None,
        page_size: int = 200,
    ) -> list[MutableMapping[str, object]]:
        """Return metadata for share package files within the folder."""

        allowed_mime_types = tuple(mime_types or ("application/json", "application/x-ndjson"))
        return list(
            self._client.iter_files(
                folder_id=self._folder_id,
                mime_types=allowed_mime_types,
                page_size=page_size,
            )
        )

    def download_package_payload(self, file_id: str) -> MutableMapping[str, object]:
        """Download a share package JSON payload from Google Drive."""

        raw = self._client.download_file(file_id)
        try:
            decoded = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as error:  # pragma: no cover - defensive guard
            raise RuntimeError(f"Failed to decode share package {file_id}") from error
        if not isinstance(decoded, MutableMapping):
            raise RuntimeError(f"Share package {file_id} payload must be a JSON object")
        return decoded

    def download_package(self, file_id: str) -> SharePackage:
        """Return a :class:`SharePackage` parsed from Drive."""

        payload = self.download_package_payload(file_id)
        return SharePackage.from_dict(payload)

    def iter_packages(
        self,
        *,
        mime_types: Sequence[str] | None = None,
        page_size: int = 200,
    ) -> Iterable[tuple[MutableMapping[str, object], SharePackage]]:
        """Yield ``(metadata, SharePackage)`` tuples for each Drive file."""

        for metadata in self.list_package_metadata(mime_types=mime_types, page_size=page_size):
            file_id = str(metadata.get("id", "")).strip()
            if not file_id:
                continue
            try:
                package = self.download_package(file_id)
            except Exception as error:  # pragma: no cover - corrupted file safety net
                raise RuntimeError(f"Failed to load share package {file_id}") from error
            yield metadata, package

    def build_package_file_name(self, *, table: str, generated_at: datetime | None = None) -> str:
        """Return a deterministic file name for ``table`` snapshots."""

        reference = generated_at or datetime.now(timezone.utc)
        timestamp = reference.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        return f"{self._default_prefix}-{table}-{timestamp}.json"
