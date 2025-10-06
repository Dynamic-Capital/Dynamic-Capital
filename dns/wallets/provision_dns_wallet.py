"""Provision the toncli wallet project for dynamiccapital.ton DNS updates."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from tonsdk.contract.wallet import WalletVersionEnum, Wallets
from tonsdk.crypto import _mnemonic

SCRIPT_DIR = Path(__file__).resolve().parent
DNS_ROOT = SCRIPT_DIR.parent
DEFAULT_PROJECT = SCRIPT_DIR / "dns-updater"
DEFAULT_EXPECTED_ADDRESS = DNS_ROOT / "dynamiccapital.ton.json"
ENV_FALLBACK = "DCT_TON_DNS_WALLET_B64"

VERSION_ALIASES = {
    "v2r1": WalletVersionEnum.v2r1,
    "v2r2": WalletVersionEnum.v2r2,
    "v3r1": WalletVersionEnum.v3r1,
    "v3r2": WalletVersionEnum.v3r2,
    "v4r1": WalletVersionEnum.v4r1,
    "v4r2": WalletVersionEnum.v4r2,
    "hv2": WalletVersionEnum.hv2,
}


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Populate the dns-updater toncli wallet project with signing keys",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=DEFAULT_PROJECT,
        help="Path to the toncli wallet project (defaults to dns/wallets/dns-updater)",
    )
    parser.add_argument(
        "--mnemonic-b64",
        help="Base64-encoded mnemonic phrase to import (overrides env and file inputs)",
    )
    parser.add_argument(
        "--mnemonic-file",
        type=Path,
        help="Path to a UTF-8 file containing the space-delimited mnemonic words",
    )
    parser.add_argument(
        "--mnemonic-env",
        default=ENV_FALLBACK,
        help=(
            "Environment variable that stores the base64-encoded mnemonic. "
            "Defaults to DCT_TON_DNS_WALLET_B64."
        ),
    )
    parser.add_argument(
        "--version",
        default="v4r2",
        choices=sorted(VERSION_ALIASES),
        help="Wallet contract version to instantiate (defaults to v4r2)",
    )
    parser.add_argument(
        "--workchain",
        type=int,
        default=0,
        help="Workchain id for the wallet (defaults to 0)",
    )
    parser.add_argument(
        "--expected-address",
        type=str,
        help=(
            "Expected non-bounceable wallet address. If omitted, the script reads "
            "dns/dynamiccapital.ton.json → nft.ownerAddress."
        ),
    )
    parser.add_argument(
        "--allow-mismatch",
        action="store_true",
        help="Skip validation when the derived address differs from the expected value.",
    )
    parser.add_argument(
        "--write-mnemonic",
        action="store_true",
        help="Persist the decoded mnemonic to keys/mnemonic.txt for air-gapped backups.",
    )
    parser.add_argument(
        "--meta-path",
        type=Path,
        help="Override the metadata output path (defaults to <project-root>/wallet.meta.json)",
    )
    return parser.parse_args(argv)


def load_expected_address(path_hint: str | None) -> str:
    if path_hint:
        return path_hint.strip()
    json_path = DEFAULT_EXPECTED_ADDRESS
    data = json.loads(json_path.read_text(encoding="utf-8"))
    expected = data.get("nft", {}).get("ownerAddress")
    if not expected:
        raise RuntimeError(
            "Unable to determine expected owner address from dns/dynamiccapital.ton.json"
        )
    return str(expected).strip()


def decode_mnemonic(args: argparse.Namespace) -> list[str]:
    if args.mnemonic_b64:
        payload = args.mnemonic_b64.strip()
    else:
        env_value = os.environ.get(args.mnemonic_env)
        if env_value:
            payload = env_value.strip()
        elif args.mnemonic_file:
            payload = args.mnemonic_file.read_text(encoding="utf-8").strip()
        else:
            raise RuntimeError(
                "Provide --mnemonic-b64, set the environment variable, or supply --mnemonic-file."
            )
    try:
        decoded = base64.b64decode(payload, validate=True).decode("utf-8")
    except Exception as exc:  # noqa: BLE001 - surface decoding errors directly
        raise RuntimeError("Failed to decode base64 mnemonic payload") from exc
    words = [word for word in decoded.replace("\n", " ").split(" ") if word]
    if not words:
        raise RuntimeError("Decoded mnemonic is empty")
    if not _mnemonic.mnemonic_is_valid(words):
        raise RuntimeError("Mnemonic phrase failed TON checksum validation")
    return words


def ensure_project(project_root: Path) -> None:
    required_paths = [
        project_root,
        project_root / "build",
        project_root / "fift" / "data.fif",
        project_root / "project.yaml",
    ]
    missing = [str(path) for path in required_paths if not path.exists()]
    if missing:
        raise RuntimeError(
            "The wallet project scaffolding is incomplete. Missing: " + ", ".join(missing)
        )


def write_private_key(private_key: bytes, project_root: Path) -> Path:
    build_dir = project_root / "build"
    build_dir.mkdir(parents=True, exist_ok=True)
    pk_path = build_dir / "contract.pk"
    pk_path.write_bytes(private_key)
    return pk_path


def write_address_files(raw: str, bounceable: str, non_bounceable: str, project_root: Path) -> tuple[Path, Path]:
    build_dir = project_root / "build"
    addr_text_path = build_dir / "contract_address"
    addr_text_path.write_text(f"{raw} {bounceable} {non_bounceable}\n", encoding="utf-8")
    addr_binary_path = build_dir / "contract.addr"
    # contract.addr stores the workchain + address in 36-byte format used by TonUtil.fif.
    from tonsdk.utils import Address  # local import to avoid circulars when packaging

    addr_binary_path.write_bytes(Address(non_bounceable).to_buffer())
    return addr_text_path, addr_binary_path


def write_metadata(
    *,
    project_root: Path,
    mnemonic_source: str,
    wallet_version: WalletVersionEnum,
    workchain: int,
    wallet_id: int,
    public_key: bytes,
    addresses: dict[str, str],
    meta_path: Path | None = None,
) -> Path:
    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "mnemonic_source": mnemonic_source,
        "wallet_version": wallet_version.name,
        "workchain": workchain,
        "wallet_id": wallet_id,
        "public_key_hex": public_key.hex(),
        "addresses": addresses,
    }
    target = meta_path or (project_root / "wallet.meta.json")
    target.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return target


def maybe_write_mnemonic(words: list[str], project_root: Path, enabled: bool) -> Path | None:
    if not enabled:
        return None
    keys_dir = project_root / "keys"
    keys_dir.mkdir(parents=True, exist_ok=True)
    mnemonic_path = keys_dir / "mnemonic.txt"
    mnemonic_path.write_text(" ".join(words) + "\n", encoding="utf-8")
    return mnemonic_path


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    ensure_project(args.project_root)

    words = decode_mnemonic(args)
    wallet_version = VERSION_ALIASES[args.version]
    _, public_key, private_key, wallet_contract = Wallets.from_mnemonics(
        words, version=wallet_version, workchain=args.workchain
    )

    private_key_bytes = private_key[:32]
    expected_address = load_expected_address(args.expected_address)

    bounceable = wallet_contract.address.to_string(True, True, True)
    non_bounceable = wallet_contract.address.to_string(True, True, False)
    raw = wallet_contract.address.to_string(False, False, False)

    if non_bounceable != expected_address and not args.allow_mismatch:
        raise RuntimeError(
            "Derived non-bounceable address does not match expected value:"
            f" {non_bounceable} != {expected_address}."
        )

    pk_path = write_private_key(private_key_bytes, args.project_root)
    addr_text_path, addr_binary_path = write_address_files(
        raw, bounceable, non_bounceable, args.project_root
    )
    meta_path = write_metadata(
        project_root=args.project_root,
        mnemonic_source=(
            "arg:mnemonic-b64"
            if args.mnemonic_b64
            else (f"env:{args.mnemonic_env}" if os.environ.get(args.mnemonic_env) else "file")
        ),
        wallet_version=wallet_version,
        workchain=args.workchain,
        wallet_id=wallet_contract.options["wallet_id"],
        public_key=public_key,
        addresses={
            "raw": raw,
            "bounceable": bounceable,
            "non_bounceable": non_bounceable,
        },
        meta_path=args.meta_path,
    )
    mnemonic_path = maybe_write_mnemonic(words, args.project_root, args.write_mnemonic)

    print("Wallet project hydrated successfully:")
    print(f"  • contract.pk → {pk_path}")
    print(f"  • contract_address → {addr_text_path}")
    print(f"  • contract.addr → {addr_binary_path}")
    print(f"  • wallet.meta.json → {meta_path}")
    if mnemonic_path:
        print(f"  • mnemonic backup → {mnemonic_path}")
    print(f"  • wallet_id = {wallet_contract.options['wallet_id']}")
    print(f"  • bounceable address = {bounceable}")
    print(f"  • non-bounceable address = {non_bounceable}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
