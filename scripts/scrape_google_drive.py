"""Utilities for scraping and downloading content from a public Google Drive folder.

This module downloads the HTML representation of a Google Drive folder and
parses the inline `_DRIVE_ivd` payload that Drive exposes to its web client.
The payload contains structured metadata for each child item. We convert that
into a Python data structure, optionally recurse through nested folders, and
can stream each file locally while extracting text with OCR fallbacks.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from contextlib import nullcontext
from dataclasses import dataclass, field
from datetime import UTC, datetime
from http.cookiejar import LoadError, MozillaCookieJar
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Iterable, Iterator, List, Optional, Sequence, Tuple
from urllib.parse import parse_qs, urlparse

import requests
from requests.cookies import RequestsCookieJar


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
DRIVE_IVD_PATTERN = re.compile(r"window\['_DRIVE_ivd'\]\s*=\s*'([^']+)';")
TITLE_PATTERN = re.compile(r"<title>(.+?) - Google Drive</title>")


def _extract_folder_id(value: str) -> str:
    """Return the folder identifier from a URL or raw id string."""

    if re.fullmatch(r"[A-Za-z0-9_-]+", value):
        return value

    parsed = urlparse(value)
    path_parts = [part for part in parsed.path.split("/") if part]
    if "folders" in path_parts:
        idx = path_parts.index("folders")
        if idx + 1 < len(path_parts):
            return path_parts[idx + 1]

    query_id = parse_qs(parsed.query).get("id")
    if query_id:
        return query_id[0]

    raise ValueError(f"Unable to determine folder id from: {value}")


def _decode_drive_payload(html_text: str) -> List[List]:
    """Extract the JSON payload that lists folder children."""

    match = DRIVE_IVD_PATTERN.search(html_text)
    if not match:
        raise RuntimeError("Unable to locate _DRIVE_ivd payload in the page")

    encoded = match.group(1)
    decoded = encoded.replace("\\/", "/").encode("utf-8").decode("unicode_escape")
    data = json.loads(decoded)

    if not data or not isinstance(data[0], list):
        raise RuntimeError("Unexpected payload structure for _DRIVE_ivd")

    return [item for item in data[0] if isinstance(item, list) and item]


def _parse_title(html_text: str) -> Optional[str]:
    match = TITLE_PATTERN.search(html_text)
    if not match:
        return None
    return html.unescape(match.group(1)).strip()


def _ms_to_iso(ms: Optional[int]) -> Optional[str]:
    if not isinstance(ms, int) or ms <= 0:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=UTC).isoformat()


def _cookie_jar_from_string(cookie_string: str) -> RequestsCookieJar:
    jar = RequestsCookieJar()
    for part in cookie_string.split(";"):
        if not part.strip():
            continue
        if "=" not in part:
            continue
        name, value = part.split("=", 1)
        jar.set(name.strip(), value.strip())
    return jar


def _cookie_jar_from_file(path: Path) -> RequestsCookieJar:
    jar = RequestsCookieJar()
    moz_jar = MozillaCookieJar(str(path))
    moz_jar.load(ignore_discard=True, ignore_expires=True)
    for cookie in moz_jar:
        jar.set_cookie(cookie)
    return jar


@dataclass
class DriveItem:
    id: str
    name: str
    mime_type: str
    is_folder: bool
    parents: List[str] = field(default_factory=list)
    size_bytes: Optional[int] = None
    modified_time: Optional[str] = None
    view_url: Optional[str] = None
    file_extension: Optional[str] = None
    children: List["DriveItem"] = field(default_factory=list)

    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "name": self.name,
            "mime_type": self.mime_type,
            "is_folder": self.is_folder,
            "parents": self.parents,
            "children": [child.to_dict() for child in self.children],
        }

        if self.size_bytes is not None:
            result["size_bytes"] = self.size_bytes
        if self.modified_time is not None:
            result["modified_time"] = self.modified_time
        if self.view_url:
            result["view_url"] = self.view_url
        if self.file_extension:
            result["file_extension"] = self.file_extension
        return result


class DriveScraper:
    def __init__(self, session: Optional[requests.Session] = None) -> None:
        self._session = session or requests.Session()
        self._session.headers.setdefault("User-Agent", DEFAULT_USER_AGENT)
        self._visited: set[str] = set()

    def scrape(self, folder_id: str, *, max_depth: Optional[int] = None) -> DriveItem:
        return self._scrape(folder_id, current_depth=0, max_depth=max_depth)

    def _scrape(
        self, folder_id: str, *, current_depth: int, max_depth: Optional[int]
    ) -> DriveItem:
        url = f"https://drive.google.com/drive/folders/{folder_id}"
        response = self._session.get(url)
        response.raise_for_status()

        html_text = response.text
        if "accounts.google.com" in response.url or "accounts.google.com" in html_text:
            raise RuntimeError(
                "Received a Google sign-in page. Ensure the folder is shared publicly or provide authentication cookies via --cookies/--cookie-file."
            )
        title = _parse_title(html_text) or folder_id
        raw_items = _decode_drive_payload(html_text)

        folder_item = DriveItem(
            id=folder_id,
            name=title,
            mime_type=FOLDER_MIME_TYPE,
            is_folder=True,
            parents=[],
            view_url=url,
        )

        if folder_id in self._visited:
            return folder_item

        self._visited.add(folder_id)

        if max_depth is not None and current_depth >= max_depth:
            return folder_item

        for raw_item in raw_items:
            parsed = self._parse_drive_item(raw_item)
            if parsed.is_folder and (max_depth is None or current_depth < max_depth):
                child = self._scrape(
                    parsed.id,
                    current_depth=current_depth + 1,
                    max_depth=max_depth,
                )
                if child.children:
                    parsed.children = child.children
                if child.name and child.name != parsed.name:
                    parsed.name = child.name
                if not parsed.view_url and child.view_url:
                    parsed.view_url = child.view_url
            folder_item.children.append(parsed)

        return folder_item

    def _parse_drive_item(self, raw_item: List) -> DriveItem:
        item_id = raw_item[0]
        parents = raw_item[1] if len(raw_item) > 1 and isinstance(raw_item[1], list) else []
        name = raw_item[2] if len(raw_item) > 2 else item_id
        mime_type = raw_item[3] if len(raw_item) > 3 else "application/octet-stream"
        is_folder = mime_type == FOLDER_MIME_TYPE

        size_bytes = None
        for idx in (13, 27):
            if len(raw_item) > idx and isinstance(raw_item[idx], int) and raw_item[idx] > 0:
                size_bytes = raw_item[idx]
                break

        modified_ms = None
        for idx in (10, 9, 69):
            if len(raw_item) > idx and isinstance(raw_item[idx], int) and raw_item[idx] > 0:
                modified_ms = raw_item[idx]
                break

        view_url = None
        if len(raw_item) > 114 and isinstance(raw_item[114], str):
            view_url = raw_item[114]

        file_extension = None
        if len(raw_item) > 44 and isinstance(raw_item[44], str):
            file_extension = raw_item[44]

        return DriveItem(
            id=item_id,
            name=name,
            mime_type=mime_type,
            is_folder=is_folder,
            parents=parents,
            size_bytes=size_bytes,
            modified_time=_ms_to_iso(modified_ms),
            view_url=view_url,
            file_extension=file_extension,
        )


class DriveDownloader:
    """Download helper for Google Drive files.

    The downloader handles the additional confirmation token that Google Drive
    requires for large files. Downloads stream to disk in chunks to avoid
    holding the entire payload in memory.
    """

    _DOWNLOAD_URL = "https://drive.google.com/uc"

    def __init__(
        self,
        *,
        chunk_size: int = 1 << 20,
        session: Optional[requests.Session] = None,
    ) -> None:
        self._session = session or requests.Session()
        self._session.headers.setdefault("User-Agent", DEFAULT_USER_AGENT)
        self._chunk_size = chunk_size

    def download(
        self,
        item: DriveItem,
        destination: Path,
        *,
        skip_existing: bool,
    ) -> Path:
        if item.is_folder:
            raise ValueError("Cannot download a folder; iterate over its children instead.")

        destination.parent.mkdir(parents=True, exist_ok=True)
        if skip_existing and destination.exists():
            return destination

        response = self._resolve_request(item.id)
        response.raise_for_status()

        try:
            with destination.open("wb") as fh:
                for chunk in response.iter_content(self._chunk_size):
                    if chunk:
                        fh.write(chunk)
        finally:
            response.close()

        return destination

    def _resolve_request(self, file_id: str) -> requests.Response:
        params = {"export": "download", "id": file_id}
        initial = self._session.get(self._DOWNLOAD_URL, params=params, allow_redirects=True)
        if "content-disposition" in initial.headers:
            initial.close()
            return self._session.get(self._DOWNLOAD_URL, params=params, stream=True)

        token = self._extract_confirm_token(initial)
        if not token:
            initial.raise_for_status()
            raise RuntimeError("Unable to resolve Google Drive download confirmation token.")

        initial.close()
        confirmed_params = {**params, "confirm": token}
        return self._session.get(self._DOWNLOAD_URL, params=confirmed_params, stream=True)

    @staticmethod
    def _extract_confirm_token(response: requests.Response) -> Optional[str]:
        for key, value in response.cookies.items():
            if key.startswith("download_warning"):
                return value

        text: Optional[str]
        try:
            text = response.text
        except Exception:  # pragma: no cover - defensive fallback
            text = None

        if text:
            match = re.search(r"confirm=([0-9A-Za-z_]+)", text)
            if match:
                return match.group(1)
        return None


def _sanitize_path_component(name: str, *, fallback: str) -> str:
    cleaned = re.sub(r"[\\/:*?\"<>|]+", "_", name.strip())
    cleaned = cleaned.strip(" .")
    return cleaned or fallback


def _walk_items(
    item: DriveItem,
    *,
    prefix: Sequence[str] = (),
) -> Iterator[Tuple[Tuple[str, ...], DriveItem]]:
    current_name = _sanitize_path_component(item.name or item.id, fallback=item.id)
    current_prefix = tuple(prefix) + (current_name,)

    if item.is_folder:
        for child in item.children:
            yield from _walk_items(child, prefix=current_prefix)
    else:
        yield current_prefix, item


def _extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "pypdf is required for PDF text extraction. Install it with 'pip install pypdf'."
        ) from exc

    reader = PdfReader(str(path))
    texts: List[str] = []
    for page in reader.pages:
        content = page.extract_text() or ""
        texts.append(content)
    return "\n".join(texts)


def _ocr_image(image_source) -> str:
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "Pillow is required for OCR image processing. Install it with 'pip install Pillow'."
        ) from exc

    try:
        import pytesseract
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "pytesseract is required for OCR. Install it with 'pip install pytesseract'."
        ) from exc

    if isinstance(image_source, Image.Image):
        image = image_source
    else:
        image = Image.open(image_source)

    try:
        return pytesseract.image_to_string(image)
    finally:
        if not isinstance(image_source, Image.Image):
            image.close()


def _ocr_pdf(path: Path) -> str:
    try:
        from pdf2image import convert_from_path
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "pdf2image is required for PDF OCR. Install it with 'pip install pdf2image'."
        ) from exc

    images = convert_from_path(str(path))
    try:
        texts = [_ocr_image(image) for image in images]
    finally:
        for image in images:
            image.close()
    return "\n".join(texts)


def extract_text_from_file(path: Path, *, enable_ocr: bool) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".json", ".yaml", ".yml"}:
        return path.read_text(encoding="utf-8")

    if suffix == ".pdf":
        text = _extract_pdf_text(path)
        if text.strip() or not enable_ocr:
            return text
        return _ocr_pdf(path)

    if suffix in {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif", ".webp"}:
        if not enable_ocr:
            raise RuntimeError("OCR is disabled but required to extract text from image files.")
        return _ocr_image(path)

    raise RuntimeError(f"Unsupported file type for extraction: {path.suffix or '<unknown>'}")


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", help="Google Drive folder URL or identifier")
    parser.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="Maximum recursion depth (0 = only the target folder)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Optional path to write the scraped metadata as JSON",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level for pretty-printing",
    )
    parser.add_argument(
        "--download-dir",
        type=Path,
        default=None,
        help="If provided, download all files into this directory mirroring the Drive structure",
    )
    parser.add_argument(
        "--text-output-dir",
        type=Path,
        default=None,
        help="If provided, extract text for downloaded files into this directory",
    )
    parser.add_argument(
        "--enable-ocr",
        default=True,
        action=argparse.BooleanOptionalAction,
        help="Enable OCR fallback for scanned PDFs and images (enabled by default)",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip downloading or extracting when the destination file already exists",
    )
    parser.add_argument(
        "--cookies",
        action="append",
        default=None,
        help=(
            "Authentication cookies in 'name=value; name2=value2' format. "
            "Can be supplied multiple times to combine values."
        ),
    )
    parser.add_argument(
        "--cookie-file",
        type=Path,
        action="append",
        default=None,
        help=(
            "Path to a Netscape/Mozilla cookie file exported from a browser. "
            "Can be supplied multiple times."
        ),
    )
    return parser


def main(argv: Optional[Iterable[str]] = None) -> None:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)

    folder_id = _extract_folder_id(args.folder)
    session = requests.Session()
    session.headers.setdefault("User-Agent", DEFAULT_USER_AGENT)

    for cookie_string in args.cookies or []:
        if cookie_string:
            session.cookies.update(_cookie_jar_from_string(cookie_string))

    if args.cookie_file:
        for cookie_path in args.cookie_file:
            try:
                session.cookies.update(_cookie_jar_from_file(cookie_path))
            except FileNotFoundError as exc:
                raise RuntimeError(f"Cookie file not found: {cookie_path}") from exc
            except (OSError, LoadError) as exc:
                raise RuntimeError(f"Failed to read cookie file {cookie_path}: {exc}") from exc

    scraper = DriveScraper(session=session)
    root_item = scraper.scrape(folder_id, max_depth=args.max_depth)
    result = root_item.to_dict()

    json_output = json.dumps(result, indent=args.indent, ensure_ascii=False)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(json_output)
    else:
        print(json_output)

    download_dir: Optional[Path] = args.download_dir
    text_output_dir: Optional[Path] = args.text_output_dir

    if not download_dir and not text_output_dir:
        return

    downloader = DriveDownloader(session=session)

    temp_context = (
        TemporaryDirectory()
        if text_output_dir is not None and download_dir is None
        else nullcontext(None)
    )

    with temp_context as temp_dir_name:
        temp_dir = Path(temp_dir_name) if temp_dir_name else None
        for components, file_item in _walk_items(root_item):
            if file_item.is_folder:
                continue

            relative_path = Path(*components)
            download_path: Optional[Path] = None

            if download_dir:
                destination = download_dir / relative_path
                try:
                    download_path = downloader.download(
                        file_item,
                        destination,
                        skip_existing=args.skip_existing,
                    )
                except Exception as exc:
                    print(
                        f"Failed to download {file_item.name}: {exc}",
                        file=sys.stderr,
                    )
                    continue

            if text_output_dir:
                text_destination = (text_output_dir / relative_path).with_suffix(".txt")

                if args.skip_existing and text_destination.exists():
                    continue

                text_destination.parent.mkdir(parents=True, exist_ok=True)

                source_path = download_path
                cleanup_path: Optional[Path] = None

                if source_path is None:
                    if temp_dir is None:
                        raise RuntimeError(
                            "Temporary directory not initialised for text extraction."
                        )
                    temp_file = temp_dir / relative_path
                    temp_file.parent.mkdir(parents=True, exist_ok=True)
                    try:
                        source_path = downloader.download(
                            file_item,
                            temp_file,
                            skip_existing=False,
                        )
                        cleanup_path = source_path
                    except Exception as exc:
                        print(
                            f"Failed to download {file_item.name} for extraction: {exc}",
                            file=sys.stderr,
                        )
                        continue

                try:
                    extracted = extract_text_from_file(
                        source_path,
                        enable_ocr=args.enable_ocr,
                    )
                except Exception as exc:
                    print(
                        f"Failed to extract text from {file_item.name}: {exc}",
                        file=sys.stderr,
                    )
                    if cleanup_path and cleanup_path.exists():
                        cleanup_path.unlink(missing_ok=True)
                    continue

                text_destination.write_text(extracted, encoding="utf-8")

                if cleanup_path and cleanup_path.exists():
                    cleanup_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
