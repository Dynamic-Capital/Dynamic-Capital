from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from tools.find_sha256 import find_files_by_sha256


@pytest.fixture()
def sample_tree(tmp_path: Path) -> tuple[Path, Path, str]:
    root = tmp_path / "workspace"
    root.mkdir()

    (root / "node_modules").mkdir()
    (root / "node_modules" / "ignored.txt").write_text("ignored")

    target = root / "data.txt"
    target.write_bytes(b"dynamic-capital")
    digest = hashlib.sha256(target.read_bytes()).hexdigest()

    other = root / "logs" / "notes.txt"
    other.parent.mkdir()
    other.write_text("notes")

    return root, target, digest


def test_find_files_by_sha256_returns_matching_paths(sample_tree: tuple[Path, Path, str]) -> None:
    root, target, digest = sample_tree
    matches = find_files_by_sha256(root, digest)
    assert matches == [target]


def test_find_files_by_sha256_respects_skip_directories(sample_tree: tuple[Path, Path, str]) -> None:
    root, target, digest = sample_tree
    # Place a duplicate of the target in a skipped directory to ensure it is ignored.
    skip_dir = root / "__pycache__"
    skip_dir.mkdir()
    duplicate = skip_dir / "copy.bin"
    duplicate.write_bytes(target.read_bytes())

    matches = find_files_by_sha256(root, digest)
    assert matches == [target]

    matches_without_skip = find_files_by_sha256(root, digest, skip_dirs=(".git",))
    assert sorted(matches_without_skip) == sorted([target, duplicate])


def test_find_files_by_sha256_requires_valid_digest(sample_tree: tuple[Path, Path, str]) -> None:
    root, _, _ = sample_tree
    with pytest.raises(ValueError):
        find_files_by_sha256(root, "12345")


def test_find_files_by_sha256_handles_missing_root(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        find_files_by_sha256(tmp_path / "missing", "0" * 64)
