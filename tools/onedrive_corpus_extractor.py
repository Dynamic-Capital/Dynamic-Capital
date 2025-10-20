from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from collections.abc import Mapping
from typing import Sequence

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from dynamic_corpus_extraction import (  # noqa: E402
    DynamicCorpusExtractionEngine,
)
from dynamic_corpus_extraction.onedrive import (  # noqa: E402
    build_onedrive_share_loader,
)


def _parse_metadata(pairs: Sequence[str]) -> dict[str, str]:
    metadata: dict[str, str] = {}
    for pair in pairs:
        key, sep, value = pair.partition("=")
        if not sep:
            raise argparse.ArgumentTypeError(
                f"metadata entry '{pair}' must use KEY=VALUE format",
            )
        key = key.strip()
        if not key:
            raise argparse.ArgumentTypeError("metadata keys must not be empty")
        metadata[key] = value.strip()
    return metadata


def _deduplicate_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    ordered: list[str] = []
    if values:
        for value in values:
            candidate = value.strip()
            if candidate and candidate not in ordered:
                ordered.append(candidate)
    return tuple(ordered)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract text documents from a OneDrive share into a JSONL corpus.",
    )
    parser.add_argument("share_link", help="Public OneDrive share link to extract")
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Path to the JSONL file that will receive the extracted documents.",
    )
    parser.add_argument(
        "--summary",
        type=Path,
        help="Optional path to write a JSON summary of the extraction run.",
    )
    parser.add_argument(
        "--source",
        default="onedrive-share",
        help="Source identifier to register with the corpus engine (default: onedrive-share).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Maximum number of documents to extract from the share.",
    )
    parser.add_argument(
        "--max-file-size",
        type=int,
        default=2_000_000,
        help="Skip files larger than this many bytes (default: 2MB).",
    )
    parser.add_argument(
        "--continue-from",
        action="append",
        dest="continue_from",
        default=[],
        type=Path,
        metavar="JSONL",
        help="Path to a JSONL export whose documents should be skipped (repeatable).",
    )
    parser.add_argument(
        "--skip-drive-item-id",
        action="append",
        dest="skip_drive_item_ids",
        default=[],
        help="Drive item identifier to skip during extraction (repeatable).",
    )
    parser.add_argument(
        "--skip-identifier",
        action="append",
        dest="skip_identifiers",
        default=[],
        help="Document identifier/path to skip during extraction (repeatable).",
    )
    parser.add_argument(
        "--ensure-ascii",
        action="store_true",
        help="Force ASCII output when writing the JSONL file.",
    )
    parser.add_argument(
        "--tag",
        action="append",
        dest="extra_tags",
        default=[],
        help="Additional tags to attach to each document (repeatable).",
    )
    parser.add_argument(
        "--allowed-mime",
        action="append",
        dest="allowed_mime_types",
        help="Extra MIME types that should be treated as text (repeatable).",
    )
    parser.add_argument(
        "--allowed-prefix",
        action="append",
        dest="allowed_mime_prefixes",
        help="Extra MIME prefixes (e.g. application/vnd.ms-) to allow as text.",
    )
    parser.add_argument(
        "--allowed-extension",
        action="append",
        dest="allowed_extensions",
        help="File extensions (e.g. .log) to treat as text content.",
    )
    parser.add_argument(
        "--metadata",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Additional metadata pairs to record in the extraction summary (repeatable).",
    )
    return parser


def _normalise_string_set(values: Sequence[str]) -> set[str]:
    cleaned: set[str] = set()
    for value in values:
        candidate = (value or "").strip()
        if candidate:
            cleaned.add(candidate)
    return cleaned


def _load_skip_catalog(paths: Sequence[Path]) -> tuple[set[str], set[str]]:
    drive_item_ids: set[str] = set()
    identifiers: set[str] = set()
    for raw_path in paths:
        path = raw_path.expanduser()
        if not path.exists():
            print(f"Warning: skip file '{path}' does not exist; ignoring", file=sys.stderr)
            continue
        try:
            for line in path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    print(f"Warning: skipping malformed JSON in '{path}'", file=sys.stderr)
                    continue
                if not isinstance(payload, Mapping):
                    continue
                identifier = payload.get("identifier")
                if isinstance(identifier, str) and identifier.strip():
                    identifiers.add(identifier.strip())
                metadata = payload.get("metadata")
                if isinstance(metadata, Mapping):
                    drive_item_id = metadata.get("drive_item_id")
                    if isinstance(drive_item_id, str) and drive_item_id.strip():
                        drive_item_ids.add(drive_item_id.strip())
                    metadata_identifier = metadata.get("identifier") or metadata.get("path")
                    if isinstance(metadata_identifier, str) and metadata_identifier.strip():
                        identifiers.add(metadata_identifier.strip())
        except OSError as error:
            print(f"Warning: failed to read skip file '{path}': {error}", file=sys.stderr)
    return drive_item_ids, identifiers


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    share_link = args.share_link.strip()
    if not share_link:
        parser.error("share_link must not be empty")

    access_token = os.getenv("ONEDRIVE_ACCESS_TOKEN")
    if not access_token:
        parser.error("Set the ONEDRIVE_ACCESS_TOKEN environment variable with a valid Microsoft Graph access token.")

    metadata = _parse_metadata(args.metadata)
    metadata.setdefault("share_link", share_link)

    output_path = args.output.expanduser()
    if args.summary is not None:
        summary_path = args.summary.expanduser()
    else:
        summary_path = None

    skip_drive_item_ids = _normalise_string_set(args.skip_drive_item_ids)
    skip_identifiers = _normalise_string_set(args.skip_identifiers)
    extra_drive_ids, extra_identifiers = _load_skip_catalog(args.continue_from)
    skip_drive_item_ids.update(extra_drive_ids)
    skip_identifiers.update(extra_identifiers)

    if skip_drive_item_ids and "skip_drive_item_ids" not in metadata:
        metadata["skip_drive_item_ids"] = sorted(skip_drive_item_ids)
    if skip_identifiers and "skip_identifiers" not in metadata:
        metadata["skip_identifiers"] = sorted(skip_identifiers)

    loader = build_onedrive_share_loader(
        share_link,
        access_token=access_token,
        allowed_mime_types=args.allowed_mime_types,
        allowed_mime_prefixes=args.allowed_mime_prefixes,
        allowed_extensions=args.allowed_extensions,
        max_file_size=args.max_file_size,
        skip_drive_item_ids=tuple(skip_drive_item_ids),
        skip_identifiers=tuple(skip_identifiers),
    )

    engine = DynamicCorpusExtractionEngine()
    tags = ["onedrive", "share", *args.extra_tags]
    engine.register_source(args.source, loader, tags=_deduplicate_tags(tags))

    summary = engine.extract(limit=args.limit, metadata=metadata)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = summary.export_jsonl(output_path, ensure_ascii=args.ensure_ascii)

    print(f"Wrote {count} documents to {output_path}")
    print(f"Sources: {json.dumps(summary.source_statistics, indent=2)}")
    print(f"Duplicates skipped: {summary.duplicate_count}")

    if summary_path is not None:
        summary_payload = json.dumps(summary.as_dict(), indent=2, ensure_ascii=False)
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary_path.write_text(summary_payload, encoding="utf-8")
        print(f"Summary written to {summary_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
