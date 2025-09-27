"""Asset manifest helpers for CDN uploads."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import mimetypes
import os
import re
_HASH_PATTERN = re.compile(r"\.[0-9a-f]{8,}\.", re.IGNORECASE)


@dataclass(slots=True, frozen=True)
class CDNAsset:
    """Represents a single file prepared for CDN upload."""

    key: str
    path: Path
    content_type: str
    cache_control: str
    size: int


def _detect_content_type(key: str) -> str:
    guessed, _ = mimetypes.guess_type(key)
    return guessed or "application/octet-stream"


def _is_immutable_asset(key: str) -> bool:
    return bool(_HASH_PATTERN.search(key))


def _resolve_cache_control(key: str, content_type: str) -> str:
    if content_type.startswith("text/html"):
        return "public, max-age=0, must-revalidate"
    if _is_immutable_asset(key):
        return "public, max-age=31536000, immutable"
    return "public, max-age=0, must-revalidate"


def _normalise_prefix(prefix: str) -> str:
    cleaned = prefix.strip().strip("/")
    return cleaned


def build_asset_manifest(
    root: os.PathLike[str] | str,
    *,
    prefix: str | None = None,
    include_hidden: bool = False,
) -> tuple[CDNAsset, ...]:
    """Generate a deterministic manifest of CDN assets under ``root``.

    Parameters
    ----------
    root:
        Root directory containing the prepared static assets.
    prefix:
        Optional key prefix to prepend to every asset key in the manifest.
    include_hidden:
        Whether to include dot-prefixed files and directories. Defaults to
        ``False`` to avoid leaking build artefacts.
    """

    base = Path(root).resolve()
    if not base.exists():
        raise FileNotFoundError(f"Asset root {base} does not exist")
    if not base.is_dir():
        raise NotADirectoryError(f"Asset root {base} is not a directory")

    key_prefix = _normalise_prefix(prefix or "")
    assets: list[CDNAsset] = []

    for file_path in sorted(
        (
            candidate
            for candidate in base.rglob("*")
            if candidate.is_file()
        ),
        key=lambda path: path.relative_to(base).as_posix(),
    ):
        relative = file_path.relative_to(base)
        if not include_hidden and any(part.startswith(".") for part in relative.parts):
            continue
        relative_key = relative.as_posix()
        key = f"{key_prefix}/{relative_key}" if key_prefix else relative_key
        content_type = _detect_content_type(key)
        cache_control = _resolve_cache_control(key, content_type)
        size = file_path.stat().st_size
        assets.append(
            CDNAsset(
                key=key,
                path=file_path,
                content_type=content_type,
                cache_control=cache_control,
                size=size,
            )
        )

    return tuple(assets)
