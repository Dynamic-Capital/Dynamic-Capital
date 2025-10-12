"""Utility helpers for locating files by SHA-256 digest."""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
from typing import Iterable, Sequence

__all__ = ["find_files_by_sha256", "main"]


_DEFAULT_SKIP_DIRS: tuple[str, ...] = (
    ".git",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
)


def _normalise_digest(digest: str) -> str:
    """Validate and normalise the provided digest string."""

    text = digest.strip().lower()
    if len(text) != 64:
        raise ValueError("sha256 digest must be 64 hexadecimal characters")
    if any(ch not in "0123456789abcdef" for ch in text):
        raise ValueError("sha256 digest must only contain hexadecimal characters")
    return text


def _iter_file_bytes(path: Path, *, chunk_size: int = 1024 * 1024) -> Iterable[bytes]:
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                return
            yield chunk


def _compute_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    for chunk in _iter_file_bytes(path):
        digest.update(chunk)
    return digest.hexdigest()


def find_files_by_sha256(
    root: Path | str,
    digest: str,
    *,
    skip_dirs: Sequence[str] | None = None,
    follow_symlinks: bool = False,
) -> list[Path]:
    """Search ``root`` for files with a matching SHA-256 digest."""

    normalised = _normalise_digest(digest)
    root_path = Path(root)
    if not root_path.exists():
        raise FileNotFoundError(f"root path does not exist: {root_path}")

    excluded = set(skip_dirs or _DEFAULT_SKIP_DIRS)
    matches: list[Path] = []

    for dirpath, dirnames, filenames in os.walk(root_path, followlinks=follow_symlinks):
        dirnames[:] = [name for name in dirnames if name not in excluded]
        for filename in filenames:
            file_path = Path(dirpath, filename)
            try:
                if _compute_sha256(file_path) == normalised:
                    matches.append(file_path)
            except OSError:
                continue
    return matches


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Locate files whose SHA-256 digest matches the provided value.",
    )
    parser.add_argument("digest", help="Hex-encoded SHA-256 digest to search for.")
    parser.add_argument(
        "root",
        nargs="?",
        default=Path.cwd(),
        help="Root directory to scan (defaults to current working directory).",
    )
    parser.add_argument(
        "--skip",
        action="append",
        dest="skip",
        default=list(_DEFAULT_SKIP_DIRS),
        help="Directory name to exclude from the search (can be provided multiple times).",
    )
    parser.add_argument(
        "--follow-symlinks",
        action="store_true",
        help="Follow symbolic links while traversing the file system.",
    )

    args = parser.parse_args(argv)

    try:
        matches = find_files_by_sha256(
            args.root,
            args.digest,
            skip_dirs=args.skip,
            follow_symlinks=args.follow_symlinks,
        )
    except ValueError as error:
        parser.error(str(error))
    except FileNotFoundError as error:
        parser.error(str(error))

    if not matches:
        print("No matches found.")
        return 1

    for match in matches:
        print(match)
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI execution guard
    raise SystemExit(main())
