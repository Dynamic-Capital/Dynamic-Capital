from __future__ import annotations

from hashlib import sha256
from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_ascii import (  # noqa: E402  (import after path setup)
    DEFAULT_ASCII_PALETTE,
    AsciiNFT,
    AsciiPalette,
    DynamicAsciiEngine,
)


def _sample_matrix() -> list[list[int]]:
    return [
        [0, 64, 128, 255],
        [255, 128, 64, 0],
        [30, 90, 190, 220],
        [5, 10, 15, 20],
    ]


def test_render_ascii_from_matrix() -> None:
    palette = AsciiPalette((" ", ".", "#"))
    engine = DynamicAsciiEngine(palette=palette, height_scale=1.0)
    canvas = engine.render_ascii(_sample_matrix(), width=4)

    assert canvas.width == 4
    assert canvas.height == 4
    assert canvas.rows[0] == " ..#"
    assert canvas.rows[1] == "#.. "
    assert "source_width" in canvas.metadata
    assert canvas.metadata["palette"] == " .#"


def test_create_nft_generates_consistent_fingerprint() -> None:
    engine = DynamicAsciiEngine(height_scale=1.0)
    canvas = engine.render_ascii(_sample_matrix(), width=4)
    nft = engine.create_nft(_sample_matrix(), name="Nebula", description="A test", width=4)

    assert isinstance(nft, AsciiNFT)
    assert nft.ascii_art.rows == canvas.rows
    expected_hash = sha256(canvas.as_text().encode("utf-8")).hexdigest()
    assert nft.fingerprint == expected_hash
    assert nft.attributes["palette_size"] == len(DEFAULT_ASCII_PALETTE)


def test_render_ascii_rejects_invalid_width() -> None:
    engine = DynamicAsciiEngine()
    with pytest.raises(ValueError):
        engine.render_ascii(_sample_matrix(), width=0)
