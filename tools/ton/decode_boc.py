#!/usr/bin/env python3
"""Utility to inspect and summarize TON Bag-of-Cells (BOC) payloads."""

from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence

try:
    from tonsdk.boc import Cell  # type: ignore
except ImportError as exc:  # pragma: no cover - CLI dependency check
    raise SystemExit(
        "The tonsdk package is required. Install it with `pip install tonsdk`."
    ) from exc


def _detect_encoding(value: str) -> str:
    """Best-effort detection of the encoding for ``value``."""
    if os.path.exists(value):
        return "raw"

    stripped = value.strip()
    # Heuristic: if string only uses hex characters and even length, prefer hex.
    if all(ch in "0123456789abcdefABCDEF" for ch in stripped) and len(stripped) % 2 == 0:
        return "hex"

    return "base64"


def _load_boc(source: str, encoding: str) -> bytes:
    """Load BOC bytes from ``source`` using ``encoding`` semantics."""
    if encoding == "auto":
        encoding = _detect_encoding(source)

    if encoding == "raw":
        if not os.path.exists(source):
            raise FileNotFoundError(f"No such file: {source}")
        return open(source, "rb").read()

    if encoding == "base64":
        try:
            return base64.b64decode(source, validate=True)
        except binascii.Error as exc:
            raise ValueError("Invalid base64-encoded BOC payload") from exc

    if encoding == "hex":
        try:
            return binascii.unhexlify(source.strip())
        except binascii.Error as exc:
            raise ValueError("Invalid hex-encoded BOC payload") from exc

    raise ValueError(f"Unsupported encoding: {encoding}")


def _ascii_segments(data: bytes, min_len: int = 4) -> List[str]:
    segments: List[str] = []
    chunk = bytearray()
    for byte in data:
        if 32 <= byte < 127:
            chunk.append(byte)
        else:
            if len(chunk) >= min_len:
                segments.append(chunk.decode("ascii"))
            chunk.clear()
    if len(chunk) >= min_len:
        segments.append(chunk.decode("ascii"))
    return segments


@dataclass
class CellInfo:
    index: int
    hash_hex: str
    bits: int
    partial_bits: int
    data_hex: str
    ascii_segments: List[str]
    refs: List[int]


def _enumerate_cells(root: Cell) -> Dict[int, CellInfo]:
    stack: List[Cell] = [root]
    index_map: Dict[int, int] = {}
    ordered: List[Cell] = []

    while stack:
        current = stack.pop()
        key = id(current)
        if key in index_map:
            continue
        index_map[key] = len(ordered)
        ordered.append(current)
        stack.extend(reversed(current.refs))

    cells: Dict[int, CellInfo] = {}
    for cell in ordered:
        idx = index_map[id(cell)]
        bits_used = cell.bits.get_used_bits()
        total_bytes = (bits_used + 7) // 8
        raw_bytes = cell.bits.get_top_upped_array()
        payload = bytes(raw_bytes[:total_bytes])
        data_hex = payload.hex()
        ascii_segments = _ascii_segments(payload)
        refs = [index_map[id(ref)] for ref in cell.refs]
        cells[idx] = CellInfo(
            index=idx,
            hash_hex=cell.bytes_hash().hex(),
            bits=bits_used,
            partial_bits=bits_used % 8,
            data_hex=data_hex,
            ascii_segments=ascii_segments,
            refs=refs,
        )

    return cells


def _render_tree(
    cells: Dict[int, CellInfo],
    node: int,
    visited: Optional[set[int]] = None,
    indent: str = "",
) -> Iterable[str]:
    if visited is None:
        visited = set()

    info = cells[node]
    repeat = node in visited
    if repeat:
        yield f"{indent}cell#{node} (see above)"
        return

    visited.add(node)
    data_preview = info.data_hex or "<empty>"
    if len(data_preview) > 64:
        data_preview = data_preview[:64] + "…"

    yield (
        f"{indent}cell#{node}: bits={info.bits} (partial={info.partial_bits}) "
        f"refs={len(info.refs)} hash={info.hash_hex}"
    )
    yield f"{indent}  data: {data_preview}"
    if info.ascii_segments:
        ascii_repr = ", ".join(repr(seg) for seg in info.ascii_segments)
        yield f"{indent}  ascii: {ascii_repr}"

    for ref_index, child in enumerate(info.refs):
        prefix = f"{indent}  ref[{ref_index}] -> "
        yield prefix + f"cell#{child}"
        yield from _render_tree(cells, child, visited, indent + "    ")


def _state_init_summary(boc_base64: str) -> List[str]:
    try:
        from tonpy.autogen.block import StateInit  # type: ignore
        from tonpy.types.cellslice import CellSlice  # type: ignore
    except ImportError:
        return ["tonpy is not installed; skipping StateInit decoding."]

    record = StateInit().unpack(CellSlice(boc_base64), rec_unpack=True)
    if record is None:
        return ["BOC does not decode as a StateInit cell."]

    lines = ["StateInit fields:"]
    for field_name in ("split_depth", "special", "code", "data", "library"):
        field = getattr(record, field_name)
        label = field.__class__.__name__
        if hasattr(field, "value"):
            value = field.value
            description = label
            if hasattr(value, "to_boc"):
                try:
                    boc_value = value.to_boc()
                    description += f" (cell base64={boc_value})"
                except Exception:  # pragma: no cover - defensive
                    description += " (value present)"
            else:
                description += " (value present)"
            lines.append(f"  {field_name}: {description}")
        else:
            lines.append(f"  {field_name}: {label}")

    return lines


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        help=(
            "Base64 or hex encoded BOC payload, or a file path when used with "
            "--encoding raw/auto."
        ),
    )
    parser.add_argument(
        "--encoding",
        choices=("auto", "base64", "hex", "raw"),
        default="auto",
        help="Input encoding. 'auto' guesses between file path, base64, and hex.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit cell metadata as JSON instead of a formatted tree.",
    )
    parser.add_argument(
        "--state-init",
        action="store_true",
        help="Attempt to decode the payload as a TON StateInit cell (requires tonpy).",
    )

    args = parser.parse_args(argv)

    raw = _load_boc(args.source, args.encoding)
    if not raw:
        raise SystemExit("Decoded BOC payload is empty")

    try:
        root = Cell.one_from_boc(raw)
    except Exception as exc:  # pragma: no cover - tonsdk error surface
        raise SystemExit(f"Failed to parse BOC: {exc}") from exc

    base64_payload = base64.b64encode(raw).decode("ascii")
    hex_payload = raw.hex()
    sha256_hex = hashlib.sha256(raw).hexdigest()
    cells = _enumerate_cells(root)

    if args.json:
        tree = {
            "summary": {
                "bytes": len(raw),
                "cells": len(cells),
                "sha256": sha256_hex,
                "root_hash": root.bytes_hash().hex(),
                "base64": base64_payload,
                "hex": hex_payload,
            },
            "cells": [
                {
                    "index": info.index,
                    "hash": info.hash_hex,
                    "bits": info.bits,
                    "partial_bits": info.partial_bits,
                    "data_hex": info.data_hex,
                    "ascii_segments": info.ascii_segments,
                    "refs": info.refs,
                }
                for info in cells.values()
            ],
        }
        print(json.dumps(tree, indent=2))
    else:
        print("BOC summary:")
        print(f"  bytes: {len(raw)}")
        print(f"  cells: {len(cells)}")
        print(f"  sha256: {sha256_hex}")
        print(f"  root cell hash: {root.bytes_hash().hex()}")
        print(f"  base64: {base64_payload}")
        print(f"  hex: {hex_payload}")
        print()
        print("Cell tree:")
        for line in _render_tree(cells, 0):
            print(line)

    if args.state_init:
        print()
        for line in _state_init_summary(base64_payload):
            print(line)

    return 0


if __name__ == "__main__":
    sys.exit(main())
