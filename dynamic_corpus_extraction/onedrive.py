"""OneDrive share integration for the dynamic corpus extraction engine."""

from __future__ import annotations

import json
from base64 import b64encode
from collections import deque
from pathlib import PurePosixPath
from typing import Callable, Iterable, Iterator, Mapping, MutableMapping, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from urllib.request import Request, build_opener

from .engine import CorpusDocument, CorpusExtractionContext, ExtractionLoader

__all__ = [
    "OneDriveGraphClient",
    "build_onedrive_share_loader",
    "to_share_id",
]

DEFAULT_ALLOWED_MIME_PREFIXES: tuple[str, ...] = ("text/",)
DEFAULT_ALLOWED_MIME_TYPES: tuple[str, ...] = (
    "application/json",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
)
DEFAULT_ALLOWED_EXTENSIONS: tuple[str, ...] = (
    ".md",
    ".markdown",
    ".txt",
    ".json",
    ".csv",
    ".tsv",
    ".yaml",
    ".yml",
    ".xml",
    ".html",
    ".htm",
)


class OneDriveGraphClient:
    """Minimal Microsoft Graph client focused on shared drive items."""

    def __init__(
        self,
        access_token: str,
        *,
        base_url: str = "https://graph.microsoft.com/v1.0",
        fetch_json: Callable[[str, Mapping[str, str] | None], MutableMapping[str, object]] | None = None,
        fetch_bytes: Callable[[str, Mapping[str, str] | None], bytes] | None = None,
    ) -> None:
        if not access_token:
            raise ValueError("access_token must not be empty")
        self._access_token = access_token
        self._base_url = base_url.rstrip("/")
        self._json_fetcher = fetch_json
        self._bytes_fetcher = fetch_bytes
        self._opener = build_opener()

    # ------------------------------------------------------------------ helpers
    def _build_headers(self, accept: str) -> Mapping[str, str]:
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": accept,
        }

    def _append_query(self, url: str, params: Mapping[str, str] | None) -> str:
        if not params:
            return url
        parsed = urlparse(url)
        existing = dict(parse_qsl(parsed.query, keep_blank_values=True))
        for key, value in params.items():
            if value is not None:
                existing[key] = value
        encoded = urlencode(existing, doseq=True)
        return urlunparse(parsed._replace(query=encoded))

    def _default_fetch_json(
        self,
        url: str,
        params: Mapping[str, str] | None = None,
    ) -> MutableMapping[str, object]:
        request = Request(self._append_query(url, params), headers=self._build_headers("application/json"))
        try:
            with self._opener.open(request) as response:
                payload = response.read()
        except HTTPError as error:  # pragma: no cover - network failure surface
            raise RuntimeError(
                f"Microsoft Graph request failed with {error.code} {error.reason}: {error.read().decode('utf-8', errors='ignore')}"
            ) from error
        except URLError as error:  # pragma: no cover - network failure surface
            raise RuntimeError(f"Microsoft Graph request to {url} failed: {error.reason}") from error
        try:
            return json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise RuntimeError(f"Failed to decode Microsoft Graph JSON response from {url}") from error

    def _default_fetch_bytes(
        self,
        url: str,
        params: Mapping[str, str] | None = None,
    ) -> bytes:
        request = Request(self._append_query(url, params), headers=self._build_headers("*/*"))
        try:
            with self._opener.open(request) as response:
                return response.read()
        except HTTPError as error:  # pragma: no cover - network failure surface
            raise RuntimeError(
                f"Microsoft Graph content request failed with {error.code} {error.reason}: {error.read().decode('utf-8', errors='ignore')}"
            ) from error
        except URLError as error:  # pragma: no cover - network failure surface
            raise RuntimeError(f"Microsoft Graph content request to {url} failed: {error.reason}") from error

    def _fetch_json(
        self,
        url: str,
        params: Mapping[str, str] | None = None,
    ) -> MutableMapping[str, object]:
        if self._json_fetcher is not None:
            return self._json_fetcher(url, params)
        return self._default_fetch_json(url, params)

    def _fetch_bytes(
        self,
        url: str,
        params: Mapping[str, str] | None = None,
    ) -> bytes:
        if self._bytes_fetcher is not None:
            return self._bytes_fetcher(url, params)
        return self._default_fetch_bytes(url, params)

    # ------------------------------------------------------------------- graph IO
    def get_share_root(self, share_link: str) -> MutableMapping[str, object]:
        share_id = to_share_id(share_link)
        url = f"{self._base_url}/shares/{share_id}/driveItem"
        return self._fetch_json(url, params={"$expand": "children($top=200)"})

    def iter_children(
        self,
        drive_id: str,
        item_id: str,
        *,
        page_size: int = 200,
    ) -> Iterator[MutableMapping[str, object]]:
        next_url: str | None = f"{self._base_url}/drives/{drive_id}/items/{item_id}/children"
        params: Mapping[str, str] | None = {"$top": str(page_size)}
        while next_url:
            payload = self._fetch_json(next_url, params=params)
            for entry in payload.get("value", []):
                if isinstance(entry, MutableMapping):
                    yield entry
            next_url = payload.get("@odata.nextLink")
            params = None

    def download_bytes(self, drive_id: str, item_id: str) -> bytes:
        url = f"{self._base_url}/drives/{drive_id}/items/{item_id}/content"
        return self._fetch_bytes(url)

    def download_text(self, drive_id: str, item_id: str, *, encoding: str = "utf-8") -> str:
        payload = self.download_bytes(drive_id, item_id)
        return payload.decode(encoding, errors="replace")


def build_onedrive_share_loader(
    share_link: str,
    *,
    access_token: str | None = None,
    allowed_mime_types: Sequence[str] | None = None,
    allowed_mime_prefixes: Sequence[str] | None = None,
    allowed_extensions: Sequence[str] | None = None,
    max_file_size: int | None = 5_000_000,
    default_tags: Sequence[str] | None = ("onedrive", "share"),
    client_factory: Callable[[], OneDriveGraphClient] | None = None,
) -> ExtractionLoader:
    """Create an extraction loader that streams documents from a OneDrive share."""

    share_link = share_link.strip()
    if not share_link:
        raise ValueError("share_link must not be empty")

    if client_factory is None:
        if not access_token:
            raise ValueError("access_token must be provided when client_factory is not supplied")

        def factory() -> OneDriveGraphClient:
            return OneDriveGraphClient(access_token=access_token)
    else:
        factory = client_factory

    allowed_mime_types = (
        _normalise_mime_values(allowed_mime_types)
        if allowed_mime_types is not None
        else DEFAULT_ALLOWED_MIME_TYPES
    )
    allowed_mime_prefixes = (
        _normalise_mime_values(allowed_mime_prefixes)
        if allowed_mime_prefixes is not None
        else DEFAULT_ALLOWED_MIME_PREFIXES
    )
    allowed_extensions = (
        tuple(_normalise_extension(value) for value in allowed_extensions)
        if allowed_extensions is not None
        else DEFAULT_ALLOWED_EXTENSIONS
    )
    default_tags = tuple(default_tags or ())
    share_id = to_share_id(share_link)

    def loader(context: CorpusExtractionContext) -> Iterable[CorpusDocument]:
        client = factory()
        root = client.get_share_root(share_link)
        drive_id, root_item_id = _resolve_drive_reference(root)
        queue: deque[tuple[MutableMapping[str, object], tuple[str, ...]]] = deque()
        for child in client.iter_children(drive_id, root_item_id):
            path = _extend_path((), child)
            queue.append((child, path))
        produced = 0
        limit = context.limit

        while queue:
            if limit is not None and produced >= limit:
                break
            item, path = queue.popleft()
            try:
                item_drive_id, item_id = _resolve_drive_reference(item, default_drive_id=drive_id)
            except KeyError:
                continue

            if _is_folder(item):
                for child in client.iter_children(item_drive_id, item_id):
                    child_path = _extend_path(path, child)
                    queue.append((child, child_path))
                continue

            if not _is_file(item):
                continue

            if limit is not None and produced >= limit:
                break

            size = _coerce_int(item.get("size"))
            if max_file_size is not None and size is not None and size > max_file_size:
                continue

            mime_type = _extract_mime_type(item)
            name = _extract_name(item)
            if not _is_supported_document(
                name,
                mime_type,
                allowed_mime_types,
                allowed_mime_prefixes,
                allowed_extensions,
            ):
                continue

            try:
                text = client.download_text(item_drive_id, item_id)
            except Exception as error:  # pragma: no cover - runtime safety
                raise RuntimeError(
                    f"failed to download '{name}' from OneDrive share"
                ) from error

            identifier = _build_identifier(path)
            metadata = _build_metadata(
                item,
                identifier=identifier,
                share_link=share_link,
                share_id=share_id,
                drive_id=item_drive_id,
                drive_item_id=item_id,
                mime_type=mime_type,
                size=size,
            )
            yield CorpusDocument(
                identifier=identifier,
                content=text,
                source=context.source,
                metadata=metadata,
                tags=default_tags,
            )
            produced += 1

    return loader


# --------------------------------------------------------------------------- util
def to_share_id(share_link: str) -> str:
    encoded = b64encode(share_link.encode("utf-8")).decode("ascii")
    encoded = encoded.rstrip("=").replace("+", "-").replace("/", "_")
    return f"u!{encoded}"


def _resolve_drive_reference(
    item: Mapping[str, object],
    *,
    default_drive_id: str | None = None,
) -> tuple[str, str]:
    parent = item.get("parentReference")
    drive_id: str | None = None
    if isinstance(parent, Mapping):
        drive_candidate = parent.get("driveId")
        if isinstance(drive_candidate, str) and drive_candidate:
            drive_id = drive_candidate
    item_id = item.get("id")
    if not isinstance(item_id, str) or not item_id:
        remote_item = item.get("remoteItem")
        if isinstance(remote_item, Mapping):
            remote_id = remote_item.get("id")
            if isinstance(remote_id, str) and remote_id:
                item_id = remote_id
            remote_parent = remote_item.get("parentReference")
            if isinstance(remote_parent, Mapping) and not drive_id:
                remote_drive = remote_parent.get("driveId")
                if isinstance(remote_drive, str) and remote_drive:
                    drive_id = remote_drive
    if drive_id is None:
        drive_id = default_drive_id
    if not isinstance(item_id, str) or not item_id:
        raise KeyError("drive item identifier missing")
    if not isinstance(drive_id, str) or not drive_id:
        raise KeyError("drive identifier missing")
    return drive_id, item_id


def _extend_path(prefix: tuple[str, ...], item: Mapping[str, object]) -> tuple[str, ...]:
    name = _extract_name(item)
    if not name:
        fallback = item.get("id")
        if isinstance(fallback, str) and fallback:
            name = fallback
        else:
            name = str(len(prefix))
    return prefix + (name,)


def _extract_name(item: Mapping[str, object]) -> str:
    name = item.get("name")
    if isinstance(name, str) and name:
        return name
    return ""


def _is_folder(item: Mapping[str, object]) -> bool:
    folder = item.get("folder")
    return isinstance(folder, Mapping)


def _is_file(item: Mapping[str, object]) -> bool:
    file_info = item.get("file")
    return isinstance(file_info, Mapping)


def _coerce_int(value: object) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str) and value:
        try:
            return int(value)
        except ValueError:
            return None
    return None


def _extract_mime_type(item: Mapping[str, object]) -> str | None:
    file_info = item.get("file")
    if isinstance(file_info, Mapping):
        mime_type = file_info.get("mimeType")
        if isinstance(mime_type, str) and mime_type:
            return mime_type.lower()
    return None


def _normalise_extension(value: str) -> str:
    if not value:
        return ""
    candidate = value.strip().lower()
    if candidate.startswith(".") and len(candidate) > 1 and "." not in candidate[1:]:
        return candidate
    suffix = PurePosixPath(candidate).suffix.lower()
    if suffix:
        return suffix
    if "." in candidate:
        return f".{candidate.split('.')[-1]}"
    return ""


def _is_supported_document(
    name: str,
    mime_type: str | None,
    allowed_mime_types: Sequence[str],
    allowed_mime_prefixes: Sequence[str],
    allowed_extensions: Sequence[str],
) -> bool:
    if mime_type:
        if mime_type in allowed_mime_types:
            return True
        for prefix in allowed_mime_prefixes:
            if mime_type.startswith(prefix):
                return True
    extension = _normalise_extension(name)
    return extension in allowed_extensions


def _build_identifier(path: tuple[str, ...]) -> str:
    joined = str(PurePosixPath(*path))
    return joined or "root"


def _normalise_mime_values(values: Sequence[str]) -> tuple[str, ...]:
    ordered: list[str] = []
    for value in values:
        candidate = (value or "").strip().lower()
        if candidate and candidate not in ordered:
            ordered.append(candidate)
    return tuple(ordered)


def _build_metadata(
    item: Mapping[str, object],
    *,
    identifier: str,
    share_link: str,
    share_id: str,
    drive_id: str,
    drive_item_id: str,
    mime_type: str | None,
    size: int | None,
) -> MutableMapping[str, object]:
    metadata: MutableMapping[str, object] = {
        "identifier": identifier,
        "path": identifier,
        "share_link": share_link,
        "share_id": share_id,
        "drive_id": drive_id,
        "drive_item_id": drive_item_id,
    }
    if mime_type:
        metadata["mime_type"] = mime_type
    if size is not None:
        metadata["size"] = size
    last_modified = item.get("lastModifiedDateTime")
    if isinstance(last_modified, str) and last_modified:
        metadata["last_modified"] = last_modified
    web_url = item.get("webUrl")
    if isinstance(web_url, str) and web_url:
        metadata["web_url"] = web_url
    return metadata
