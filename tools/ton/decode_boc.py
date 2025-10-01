"""Utility for inspecting TON Bag of Cells payloads.

This helper focuses on lightweight inspection of a single root cell.  It
extracts the raw bytes, the canonical cell hash, and parses the leading
fields that frequently appear in jetton transfer envelopes (opcode, query ID,
and jetton amount encoded as ``VarUInteger16``).  Remaining bits are reported
as a hex string so that engineers can continue manual analysis or feed the
data into other tooling.

Example usage::

    $ python tools/ton/decode_boc.py te6ccgEBAQEAKwAA...

    Cell hash           : 08bcf517bc60d1a32e3fb9d16d91b1de88b7e9ca65baf6700eb105ad48cd6d0d
    Cell depth          : 0
    Payload bytes       : 41
    Payload bits        : 328
    Opcode              : 0x80000003
    Query ID            : 13835057543405342342
    Jetton amount bytes : 8
    Jetton amount       : 11371489928026161528
    Remaining bits      : 164
    Remaining payload   : 806881d24a11ed63bff07df3a9cbfa5a6094580a0

The script depends on ``tonsdk``.  Install it via ``pip install tonsdk``
before running if it is not already available in your environment.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from tonsdk.boc import Cell, parse_boc_header
except ImportError as exc:  # pragma: no cover - direct feedback is clearer.
    raise SystemExit(
        "tonsdk is required for this utility. Install it with `pip install tonsdk`."
    ) from exc


@dataclass(slots=True)
class BitStream:
    """Minimal bit stream reader for TON cell payloads."""

    data: bytes
    length: int
    position: int = 0

    def read_uint(self, width: int) -> int:
        """Read ``width`` bits as an unsigned integer."""

        if width < 0:
            raise ValueError("bit width must be non-negative")
        if width == 0:
            return 0
        if self.position + width > self.length:
            raise ValueError("not enough bits remaining in stream")

        value = 0
        for _ in range(width):
            byte_index, bit_index = divmod(self.position, 8)
            current_byte = self.data[byte_index]
            bit = (current_byte >> (7 - bit_index)) & 1
            value = (value << 1) | bit
            self.position += 1
        return value

    def read_varuint16(self) -> tuple[int, int]:
        """Read a ``VarUInteger16`` (length nibble + value bytes)."""

        length = self.read_uint(4)
        value = self.read_uint(length * 8) if length else 0
        return length, value

    def read_remaining_hex(self) -> str:
        """Return the remaining bits as a zero-padded hex string."""

        remaining_bits = self.length - self.position
        if remaining_bits <= 0:
            return ""
        value = self.read_uint(remaining_bits)
        hex_len = (remaining_bits + 3) // 4
        return f"{value:0{hex_len}x}"


def _normalise_input(raw: str) -> str:
    """Collapse whitespace and newlines in the supplied payload."""

    return "".join(raw.split())


def _load_payload(source: str) -> str:
    path = Path(source)
    if path.exists():
        return _normalise_input(path.read_text())
    return _normalise_input(source)


def decode_boc_payload(payload: str) -> dict[str, object]:
    """Decode a base64-encoded BOC payload and return a structured summary."""

    try:
        raw_bytes = base64.b64decode(payload, validate=True)
    except (ValueError, binascii.Error) as exc:  # pragma: no cover - sanity feedback
        raise ValueError("Input is not valid base64-encoded data") from exc

    header = parse_boc_header(raw_bytes)
    cell = Cell.one_from_boc(raw_bytes)

    cell_bits = cell.bits.get_top_upped_array()
    bit_length = cell.bits.length
    reader = BitStream(bytes(cell_bits), bit_length)

    opcode = reader.read_uint(32)
    query_id = reader.read_uint(64)
    jetton_length, jetton_amount = reader.read_varuint16()
    remaining_bits = bit_length - reader.position
    remaining_hex = reader.read_remaining_hex()

    summary = {
        "cell_hash": cell.bytes_hash().hex(),
        "cell_depth": cell.get_max_depth(),
        "payload_bytes": len(cell_bits),
        "payload_bits": bit_length,
        "opcode": f"0x{opcode:08x}",
        "query_id": query_id,
        "jetton_amount_bytes": jetton_length,
        "jetton_amount": jetton_amount,
        "remaining_bits": remaining_bits,
        "remaining_payload_hex": remaining_hex,
        "raw_hex": cell_bits.hex(),
        "boc_header": header,
    }
    return summary


def format_summary(summary: dict[str, object]) -> Iterable[str]:
    """Yield human-readable rows for the decoded summary."""

    yield f"Cell hash           : {summary['cell_hash']}"
    yield f"Cell depth          : {summary['cell_depth']}"
    yield f"Payload bytes       : {summary['payload_bytes']}"
    yield f"Payload bits        : {summary['payload_bits']}"
    yield f"Opcode              : {summary['opcode']}"
    yield f"Query ID            : {summary['query_id']}"
    yield f"Jetton amount bytes : {summary['jetton_amount_bytes']}"
    yield f"Jetton amount       : {summary['jetton_amount']}"
    yield f"Remaining bits      : {summary['remaining_bits']}"
    remaining = summary.get("remaining_payload_hex")
    yield f"Remaining payload   : {remaining}" if remaining else "Remaining payload   :"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "payload",
        help="Base64-encoded BOC string or path to a file containing it.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit the decoded summary as JSON instead of text.",
    )
    args = parser.parse_args()

    payload = _load_payload(args.payload)
    summary = decode_boc_payload(payload)

    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        for line in format_summary(summary):
            print(line)


if __name__ == "__main__":  # pragma: no cover - CLI guard
    main()
