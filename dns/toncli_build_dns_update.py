#!/usr/bin/env python3
"""Generate TON DNS update message bodies for toncli."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Dict, Iterable

from tonsdk.boc import Builder
from tonsdk.utils import Address

CHANGE_DNS_RECORD_OP = 0x4EB1F0F9

CATEGORY_LABELS: Dict[str, str] = {
    "site": "site",
    "wallet": "wallet",
    "storage": "storage",
    "next_resolver": "dns_next_resolver",
}

RECORD_CONSTRUCTORS: Dict[str, int] = {
    "site": 0xAD01,
    "wallet": 0x9FD3,
    "storage": 0x7473,
    "next_resolver": 0xBA93,
}


def category_hash(label: str) -> int:
    """Return the 256-bit category key for a DNS record label."""
    digest = hashlib.sha256(label.encode("utf-8")).digest()
    return int.from_bytes(digest, "big")


def parse_adnl(adnl: str) -> bytes:
    """Normalise an ADNL address string into 32 raw bytes."""
    parts = adnl.lower().strip()
    if parts.startswith("0x"):
        parts = parts[2:]
    if ":" in parts:
        # Accept forms like `0:abcdef` or `-1:abcdef`.
        _, parts = parts.split(":", 1)
    raw = bytes.fromhex(parts)
    if len(raw) != 32:
        raise ValueError(f"Expected 32 bytes for ADNL address, got {len(raw)}")
    return raw


def parse_bag_id(bag_id: str) -> bytes:
    """Convert a TON Storage bag ID into 32 bytes."""
    value = bag_id.strip()
    if value.startswith("0x"):
        value = value[2:]
    try:
        raw = bytes.fromhex(value)
    except ValueError as exc:
        raise ValueError(
            "Bag IDs must be supplied as 64 hex characters (optionally prefixed with 0x)."
        ) from exc
    if len(raw) != 32:
        raise ValueError(
            f"Expected 32 bytes for TON Storage bag ID, received {len(raw)}"
        )
    return raw


def build_site_record(adnl_hex: str) -> Builder:
    builder = Builder()
    builder.store_uint(RECORD_CONSTRUCTORS["site"], 16)
    builder.store_bytes(parse_adnl(adnl_hex))
    builder.store_uint(0, 8)
    return builder


def build_wallet_record(address: str) -> Builder:
    builder = Builder()
    builder.store_uint(RECORD_CONSTRUCTORS["wallet"], 16)
    builder.store_address(Address(address))
    builder.store_uint(0, 8)
    return builder


def build_storage_record(bag_id: str) -> Builder:
    builder = Builder()
    builder.store_uint(RECORD_CONSTRUCTORS["storage"], 16)
    builder.store_bytes(parse_bag_id(bag_id))
    return builder


def build_next_resolver_record(address: str) -> Builder:
    builder = Builder()
    builder.store_uint(RECORD_CONSTRUCTORS["next_resolver"], 16)
    builder.store_address(Address(address))
    return builder


RECORD_BUILDERS = {
    "site": build_site_record,
    "wallet": build_wallet_record,
    "storage": build_storage_record,
    "next_resolver": build_next_resolver_record,
}


def build_body_cell(category: str, payload: Builder, query_id: int) -> bytes:
    body = Builder()
    body.store_uint(CHANGE_DNS_RECORD_OP, 32)
    body.store_uint(query_id, 64)
    body.store_uint(category_hash(CATEGORY_LABELS[category]), 256)
    body.store_ref(payload.end_cell())
    return body.end_cell().to_boc(False)


def infer_payload(category: str, config: Dict[str, object], overrides: argparse.Namespace) -> Builder:
    if category == "site":
        adnl = overrides.site_adnl or config.get("ton_site", {}).get("adnl_address")
        if not adnl:
            raise ValueError("Missing `ton_site.adnl_address` in the JSON payload.")
        return build_site_record(str(adnl))
    if category == "wallet":
        wallet_address = overrides.wallet_address or config.get("nft", {}).get("ownerAddress")
        if not wallet_address:
            raise ValueError("Provide --wallet-address or populate nft.ownerAddress in the JSON file.")
        return build_wallet_record(str(wallet_address))
    if category == "storage":
        bag_id = overrides.storage_bag or config.get("ton_site", {}).get("bag_id")
        if not bag_id:
            raise ValueError("Provide --storage-bag or add ton_site.bag_id to the JSON file.")
        return build_storage_record(str(bag_id))
    if category == "next_resolver":
        resolver = overrides.next_resolver or config.get("resolver_contract")
        if not resolver:
            raise ValueError("Provide --next-resolver or set resolver_contract in the JSON file.")
        return build_next_resolver_record(str(resolver))
    raise KeyError(f"Unsupported category: {category}")


def generate_updates(
    domain_json: Path,
    output_dir: Path,
    categories: Iterable[str],
    query_id: int,
    overrides: argparse.Namespace,
) -> Dict[str, Path]:
    config = json.loads(domain_json.read_text())
    output_dir.mkdir(parents=True, exist_ok=True)

    generated: Dict[str, Path] = {}
    for category in categories:
        payload = infer_payload(category, config, overrides)
        boc = build_body_cell(category, payload, query_id)
        filename = output_dir / f"{category}-change-dns-record.boc"
        filename.write_bytes(boc)
        generated[category] = filename
    return generated


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate toncli-ready TON DNS update bodies.")
    parser.add_argument(
        "domain_json",
        type=Path,
        help="Path to the domain metadata JSON (for example dns/dynamiccapital.ton.json).",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        choices=sorted(RECORD_BUILDERS.keys()),
        default=["site"],
        help="DNS record categories to build (defaults to the site ADNL record).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dns/toncli-out"),
        help="Directory where the .boc payloads will be written.",
    )
    parser.add_argument(
        "--query-id",
        type=int,
        default=0,
        help="Query ID passed to change_dns_record (0 is acceptable for ad-hoc updates).",
    )
    parser.add_argument(
        "--site-adnl",
        dest="site_adnl",
        help="Override the ADNL address for the site record.",
    )
    parser.add_argument(
        "--wallet-address",
        dest="wallet_address",
        help="Override the wallet address used for the wallet record.",
    )
    parser.add_argument(
        "--storage-bag",
        dest="storage_bag",
        help="Override the TON Storage bag ID used for the storage record.",
    )
    parser.add_argument(
        "--next-resolver",
        dest="next_resolver",
        help="Override the address used for the dns_next_resolver record.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generated = generate_updates(
        domain_json=args.domain_json,
        output_dir=args.output,
        categories=args.categories,
        query_id=args.query_id,
        overrides=args,
    )

    for category, path in generated.items():
        print(f"Generated {category} payload → {path}")


if __name__ == "__main__":
    main()
