"""Google Drive PDF integration for the dynamic corpus extraction engine."""

from __future__ import annotations

import importlib
import importlib.util
import io
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Callable, Iterable, Iterator, Mapping, MutableMapping, Sequence, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from urllib.request import Request, build_opener

from .engine import CorpusExtractionContext, ExtractionLoader

__all__ = [
    "GoogleDriveClient",
    "build_google_drive_pdf_loader",
    "DriveShareTarget",
    "parse_drive_share_link",
    "parse_drive_share_link_details",
]

_PDF_MIME_TYPE = "application/pdf"
_DEFAULT_FIELDS = (
    "nextPageToken, files(id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink, parents, resourceKey)"
)


def _append_query(url: str, params: Mapping[str, str] | None) -> str:
    if not params:
        return url
    parsed = urlparse(url)
    current = dict(parse_qsl(parsed.query, keep_blank_values=True))
    for key, value in params.items():
        if value is not None:
            current[key] = value
    encoded = urlencode(current, doseq=True)
    return urlunparse(parsed._replace(query=encoded))


def _install_pypdf2() -> None:
    """Install the PyPDF2 package using the current Python interpreter."""

    python = sys.executable or "python3"
    command = [python, "-m", "pip", "install", "PyPDF2"]
    process = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        stderr = process.stderr.strip()
        stdout = process.stdout.strip()
        details = stderr or stdout or "unknown error"
        raise RuntimeError(f"Failed to install PyPDF2 (exit code {process.returncode}): {details}")


def _load_pypdf(*, auto_install: bool = False) -> "PyPDF2":  # type: ignore[name-defined]
    try:
        import PyPDF2  # type: ignore[import]
    except ModuleNotFoundError as exc:  # pragma: no cover - import guard
        if not auto_install:
            raise RuntimeError(
                "PyPDF2 is required for PDF text extraction. Install it with `pip install PyPDF2`."
            ) from exc
        _install_pypdf2()
        try:
            import PyPDF2  # type: ignore[import]
        except ModuleNotFoundError as second_exc:  # pragma: no cover - defensive
            raise RuntimeError(
                "PyPDF2 could not be imported even after attempting installation."
            ) from second_exc
    return PyPDF2


def _extract_pdf_pages(
    payload: bytes,
    *,
    auto_install: bool = False,
) -> list[str]:
    """Return the extracted text for each page in ``payload``."""

    PyPDF2 = _load_pypdf(auto_install=auto_install)
    reader = PyPDF2.PdfReader(io.BytesIO(payload))
    pages: list[str] = []
    for page in reader.pages:
        extracted = page.extract_text() or ""
        pages.append(extracted.strip())
    return pages


def _default_pdf_text_extractor(
    payload: bytes,
    *,
    file_name: str,
    auto_install: bool = False,
) -> str:
    page_segments = _extract_pdf_pages(payload, auto_install=auto_install)
    text = "\n".join(part for part in page_segments if part)
    if not text:
        raise RuntimeError(f"No extractable text found in PDF '{file_name}'")
    return text


def _normalise_ocr_languages(languages: Sequence[str] | str | None) -> str | None:
    if languages is None:
        return None
    if isinstance(languages, str):
        cleaned = languages.strip()
        return cleaned or None
    cleaned_sequence: list[str] = []
    for candidate in languages:
        text = str(candidate).strip()
        if text:
            cleaned_sequence.append(text)
    unique = []
    seen: set[str] = set()
    for entry in cleaned_sequence:
        if entry and entry not in seen:
            seen.add(entry)
            unique.append(entry)
    if not unique:
        return None
    return "+".join(unique)


def _load_pdf_ocr_toolchain() -> tuple[object, object]:
    dependency_map = (
        ("pdf2image", "pdf2image"),
        ("pytesseract", "pytesseract"),
        ("PIL.Image", "Pillow"),
    )
    for module_name, package_name in dependency_map:
        if importlib.util.find_spec(module_name) is None:
            raise RuntimeError(
                "PDF OCR support requires the "
                f"'{package_name}' package. Install it with `pip install {package_name}`."
            )

    pdf2image = importlib.import_module("pdf2image")
    pytesseract = importlib.import_module("pytesseract")
    importlib.import_module("PIL.Image")
    return pdf2image, pytesseract


def _ocr_pdf_text_extractor(
    payload: bytes,
    *,
    file_name: str,
    languages: str | None,
    dpi: int,
) -> str:
    pdf2image, pytesseract = _load_pdf_ocr_toolchain()
    try:
        images = pdf2image.convert_from_bytes(payload, dpi=dpi)
    except Exception as error:  # pragma: no cover - conversion failure
        raise RuntimeError(f"Failed to rasterise PDF '{file_name}' for OCR") from error

    text_parts: list[str] = []
    try:
        for image in images:
            try:
                if languages:
                    extracted = pytesseract.image_to_string(image, lang=languages)
                else:
                    extracted = pytesseract.image_to_string(image)
            finally:
                try:
                    image.close()
                except Exception:  # pragma: no cover - defensive cleanup
                    pass
            cleaned = extracted.strip()
            if cleaned:
                text_parts.append(cleaned)
    finally:
        for image in images:
            try:
                image.close()
            except Exception:  # pragma: no cover - defensive cleanup
                pass

    text = "\n".join(text_parts)
    if not text.strip():
        raise RuntimeError(f"OCR extraction produced no text for PDF '{file_name}'")
    return text


class GoogleDriveClient:
    """Minimal Google Drive client focused on folder traversal and downloads."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        access_token: str | None = None,
        base_url: str = "https://www.googleapis.com/drive/v3",
        opener_factory: Callable[[], object] | None = None,
    ) -> None:
        api_key = api_key.strip() if api_key else None
        access_token = access_token.strip() if access_token else None
        if not api_key and not access_token:
            raise ValueError("Either api_key or access_token must be provided")
        self._api_key = api_key
        self._access_token = access_token
        self._base_url = base_url.rstrip("/")
        opener = opener_factory() if opener_factory is not None else build_opener()
        self._opener = opener

    # ----------------------------------------------------------------- utilities
    def _build_headers(self, accept: str) -> Mapping[str, str]:
        headers = {"Accept": accept}
        if self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"
        return headers

    def _prepare_params(self, params: Mapping[str, str] | None) -> Mapping[str, str]:
        combined = dict(params or {})
        if self._api_key:
            combined.setdefault("key", self._api_key)
        return combined

    def _request_bytes(
        self,
        path: str,
        *,
        params: Mapping[str, str] | None = None,
        accept: str = "application/json",
    ) -> bytes:
        url = f"{self._base_url}/{path.lstrip('/') }"
        request = Request(_append_query(url, self._prepare_params(params)), headers=self._build_headers(accept))
        try:
            with self._opener.open(request) as response:
                return response.read()
        except HTTPError as error:  # pragma: no cover - network failure surface
            raise RuntimeError(
                f"Google Drive request failed with {error.code} {error.reason}: {error.read().decode('utf-8', errors='ignore')}"
            ) from error
        except URLError as error:  # pragma: no cover - network failure surface
            raise RuntimeError(f"Google Drive request to {url} failed: {error.reason}") from error

    def _request_json(
        self,
        path: str,
        *,
        params: Mapping[str, str] | None = None,
    ) -> MutableMapping[str, object]:
        payload = self._request_bytes(path, params=params, accept="application/json")
        try:
            return json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise RuntimeError(f"Failed to decode Google Drive JSON response from {path}") from error

    # ----------------------------------------------------------------- operations
    def iter_files(
        self,
        *,
        folder_id: str,
        mime_types: Sequence[str] | None = None,
        page_size: int = 200,
        resource_key: str | None = None,
        fields: str = _DEFAULT_FIELDS,
    ) -> Iterator[MutableMapping[str, object]]:
        query_parts = [f"'{folder_id}' in parents", "trashed = false"]
        if mime_types:
            mime_checks = [f"mimeType = '{mime}'" for mime in mime_types]
            query_parts.append("(" + " or ".join(mime_checks) + ")")
        params: dict[str, str] = {
            "q": " and ".join(query_parts),
            "pageSize": str(page_size),
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
            "fields": fields,
        }
        if resource_key:
            params["resourceKey"] = resource_key
        next_token: str | None = None
        while True:
            effective_params = dict(params)
            if next_token:
                effective_params["pageToken"] = next_token
            response = self._request_json("files", params=effective_params)
            for entry in response.get("files", []):
                if isinstance(entry, MutableMapping):
                    yield entry
            next_token = response.get("nextPageToken")
            if not next_token:
                break

    def get_file_metadata(
        self,
        file_id: str,
        *,
        fields: str | None = None,
        resource_key: str | None = None,
    ) -> MutableMapping[str, object]:
        params = {"supportsAllDrives": "true"}
        if fields:
            params["fields"] = fields
        if resource_key:
            params["resourceKey"] = resource_key
        return self._request_json(f"files/{file_id}", params=params)

    def download_file(self, file_id: str, *, resource_key: str | None = None) -> bytes:
        params: dict[str, str] = {"alt": "media", "supportsAllDrives": "true"}
        if resource_key:
            params["resourceKey"] = resource_key
        return self._request_bytes(
            f"files/{file_id}",
            params=params,
            accept="application/pdf, */*;q=0.8",
        )


_FOLDER_PATTERN = re.compile(r"/folders/([A-Za-z0-9_-]+)")
_FILE_PATTERN = re.compile(r"/file/d/([A-Za-z0-9_-]+)")


@dataclass(frozen=True)
class DriveShareTarget:
    target_type: Literal["file", "folder"]
    identifier: str
    resource_key: str | None = None


def parse_drive_share_link_details(link: str) -> DriveShareTarget:
    """Return the Drive target descriptor extracted from a share link."""

    candidate = (link or "").strip()
    if not candidate:
        raise ValueError("share link must not be empty")

    parsed = urlparse(candidate)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("share link must include scheme and host")

    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    resource_key = params.get("resourcekey") or params.get("resourceKey")
    if resource_key:
        resource_key = resource_key.strip() or None

    folder_match = _FOLDER_PATTERN.search(parsed.path)
    if folder_match:
        return DriveShareTarget("folder", folder_match.group(1), resource_key)

    file_match = _FILE_PATTERN.search(parsed.path)
    if file_match:
        return DriveShareTarget("file", file_match.group(1), resource_key)

    if params:
        identifier = params.get("id")
        if identifier:
            return DriveShareTarget("file", identifier, resource_key)

    raise ValueError("Unable to extract Google Drive identifier from share link")


def parse_drive_share_link(link: str) -> tuple[str, str]:
    """Return (target_type, identifier) from a Google Drive share link."""

    target = parse_drive_share_link_details(link)
    return target.target_type, target.identifier


def _coerce_size(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):  # pragma: no cover - defensive path
        return None


def _coerce_positive_int(value: object) -> int | None:
    candidate = _coerce_size(value)
    if candidate is None or candidate <= 0:
        return None
    return candidate


def build_google_drive_pdf_loader(
    *,
    share_link: str | None = None,
    folder_id: str | None = None,
    file_ids: Sequence[str] | None = None,
    api_key: str | None = None,
    access_token: str | None = None,
    tags: Sequence[str] | None = ("google_drive", "pdf"),
    client_factory: Callable[[], GoogleDriveClient] | None = None,
    pdf_text_extractor: Callable[[bytes, Mapping[str, object]], str] | None = None,
    max_file_size: int | None = 50_000_000,
    batch_size: int | None = None,
    enable_ocr: bool = False,
    ocr_languages: Sequence[str] | str | None = ("eng",),
    ocr_dpi: int = 300,
    install_missing_pypdf2: bool = False,
    include_page_data: bool = False,
) -> ExtractionLoader:
    """Create a loader that streams Google Drive PDFs as corpus documents.

    When ``enable_ocr`` is ``True`` the loader falls back to rasterising PDF
    pages and running them through Tesseract OCR whenever text extraction
    yields empty results.  This allows the pipeline to capture scanned
    documents while still preferring the faster embedded text path when
    available.
    """

    resolved_folder: str | None = folder_id.strip() if folder_id else None
    resolved_files: list[str] = [file_id.strip() for file_id in file_ids or [] if file_id and file_id.strip()]
    folder_resource_key: str | None = None
    file_resource_keys: dict[str, str] = {}

    if share_link:
        target = parse_drive_share_link_details(share_link)
        identifier = target.identifier
        if target.target_type == "folder":
            if resolved_folder and resolved_folder != identifier:
                raise ValueError("Conflicting folder identifiers provided")
            resolved_folder = identifier
            if target.resource_key:
                if folder_resource_key and folder_resource_key != target.resource_key:
                    raise ValueError("Conflicting folder resource keys provided")
                folder_resource_key = target.resource_key
        else:
            if identifier not in resolved_files:
                resolved_files.append(identifier)
            if target.resource_key:
                existing_key = file_resource_keys.get(identifier)
                if existing_key and existing_key != target.resource_key:
                    raise ValueError("Conflicting resource keys provided for file share link")
                file_resource_keys[identifier] = target.resource_key

    if not resolved_folder and not resolved_files:
        raise ValueError("At least one folder_id, share_link, or file_id must be provided")

    if client_factory is None:
        def factory() -> GoogleDriveClient:
            return GoogleDriveClient(api_key=api_key, access_token=access_token)
    else:
        factory = client_factory

    page_cache: dict[str, list[str]] = {}

    if pdf_text_extractor is None:

        def extractor(payload: bytes, metadata: Mapping[str, object]) -> str:
            pages = _extract_pdf_pages(payload, auto_install=install_missing_pypdf2)
            file_key = str(metadata.get("id") or "")
            if include_page_data and file_key:
                page_cache[file_key] = pages
            text = "\n".join(part for part in pages if part)
            if not text:
                raise RuntimeError(
                    f"No extractable text found in PDF '{metadata.get('name', 'unknown')}'"
                )
            return text

    else:
        extractor = pdf_text_extractor
    if enable_ocr:
        languages = _normalise_ocr_languages(ocr_languages)
        dpi = max(int(ocr_dpi or 0), 72)

        def _ocr_enabled_extractor(payload: bytes, metadata: Mapping[str, object]) -> str:
            base_error: Exception | None = None
            try:
                text = extractor(payload, metadata)
                if text.strip():
                    return text
            except Exception as error:  # pragma: no cover - defensive fallback
                base_error = error
            try:
                return _ocr_pdf_text_extractor(
                    payload,
                    file_name=str(metadata.get("name", "unknown")),
                    languages=languages,
                    dpi=dpi,
                )
            except Exception as ocr_error:  # pragma: no cover - fallback path
                if base_error is not None:
                    raise RuntimeError(
                        "Both direct text extraction and OCR failed for PDF "
                        f"'{metadata.get('name', 'unknown')}'"
                    ) from ocr_error
                raise

        extractor = _ocr_enabled_extractor

    default_tags = tuple(tags or ())
    if enable_ocr and "ocr" not in default_tags:
        default_tags = default_tags + ("ocr",)
    configured_batch_size = _coerce_positive_int(batch_size) or 10

    def loader(context: CorpusExtractionContext) -> Iterable[Mapping[str, object]]:
        remaining = context.limit
        client = factory()
        seen_ids: set[str] = set()
        try:
            metadata_batch_size: object | None = context.metadata.get("batch_size")
        except AttributeError:  # pragma: no cover - custom mappings without get
            metadata_batch_size = None
        effective_batch_size = (
            _coerce_positive_int(metadata_batch_size)
            or configured_batch_size
        )
        if effective_batch_size > 1000:
            effective_batch_size = 1000

        def _batched(iterator: Iterable[MutableMapping[str, object]]) -> Iterator[list[MutableMapping[str, object]]]:
            batch: list[MutableMapping[str, object]] = []
            for item in iterator:
                batch.append(item)
                if len(batch) >= effective_batch_size:
                    yield batch
                    batch = []
            if batch:
                yield batch

        def _should_stop() -> bool:
            return remaining is not None and remaining <= 0

        def _yield_document(metadata: MutableMapping[str, object]) -> Iterator[Mapping[str, object]]:
            nonlocal remaining
            if _should_stop():
                return
            file_id = str(metadata.get("id") or "").strip()
            if not file_id or file_id in seen_ids:
                return
            seen_ids.add(file_id)
            mime_type = str(metadata.get("mimeType") or "")
            if mime_type and mime_type != _PDF_MIME_TYPE:
                return
            size_value = _coerce_size(metadata.get("size"))
            if max_file_size is not None and size_value is not None and size_value > max_file_size:
                return
            resource_key_value = str(metadata.get("resourceKey") or "").strip() or None
            payload = client.download_file(file_id, resource_key=resource_key_value)
            if max_file_size is not None and len(payload) > max_file_size:
                return
            text = extractor(payload, metadata)
            page_segments: list[str] | None = None
            if include_page_data:
                cached = None
                if file_id:
                    cached = page_cache.pop(file_id, None)
                if cached is None:
                    cached = _extract_pdf_pages(payload, auto_install=install_missing_pypdf2)
                page_segments = cached
            document_metadata: dict[str, object] = {
                "file_id": file_id,
                "file_name": metadata.get("name"),
                "mime_type": mime_type or _PDF_MIME_TYPE,
            }
            if resource_key_value:
                document_metadata["resource_key"] = resource_key_value
            if "modifiedTime" in metadata:
                document_metadata["modified_time"] = metadata["modifiedTime"]
            if "md5Checksum" in metadata:
                document_metadata["md5_checksum"] = metadata["md5Checksum"]
            if "webViewLink" in metadata:
                document_metadata["web_view_link"] = metadata["webViewLink"]
            if size_value is not None:
                document_metadata["size"] = size_value
            if "localPath" in metadata:
                document_metadata["local_path"] = metadata["localPath"]
            if include_page_data and page_segments is not None:
                document_metadata["page_count"] = len(page_segments)
                page_entries = [
                    {
                        "page_number": index + 1,
                        "content": segment,
                    }
                    for index, segment in enumerate(page_segments)
                    if segment
                ]
                if page_entries:
                    document_metadata["pages"] = page_entries

            yield {
                "identifier": f"google-drive-{file_id}",
                "content": text,
                "metadata": document_metadata,
                "tags": default_tags,
            }
            if remaining is not None:
                remaining -= 1

        if resolved_folder:
            for batch in _batched(
                client.iter_files(
                    folder_id=resolved_folder,
                    mime_types=(_PDF_MIME_TYPE,),
                    page_size=effective_batch_size,
                    resource_key=folder_resource_key,
                )
            ):
                if _should_stop():
                    break
                for entry in batch:
                    if _should_stop():
                        break
                    yield from _yield_document(entry)

        if not _should_stop() and resolved_files:
            metadata_batch: list[MutableMapping[str, object]] = []
            for file_id in resolved_files:
                if _should_stop():
                    break
                metadata = client.get_file_metadata(
                    file_id,
                    fields="id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink, resourceKey",
                    resource_key=file_resource_keys.get(file_id),
                )
                if not isinstance(metadata, MutableMapping):
                    continue
                if file_id in file_resource_keys and "resourceKey" not in metadata:
                    metadata["resourceKey"] = file_resource_keys[file_id]
                metadata_batch.append(metadata)
                if len(metadata_batch) >= effective_batch_size:
                    for entry in metadata_batch:
                        if _should_stop():
                            break
                        yield from _yield_document(entry)
                    metadata_batch.clear()
            if metadata_batch and not _should_stop():
                for entry in metadata_batch:
                    if _should_stop():
                        break
                    yield from _yield_document(entry)

    return loader

