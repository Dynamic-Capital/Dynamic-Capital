from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
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

    loader = build_onedrive_share_loader(
        share_link,
        access_token=access_token,
        allowed_mime_types=args.allowed_mime_types,
        allowed_mime_prefixes=args.allowed_mime_prefixes,
        allowed_extensions=args.allowed_extensions,
        max_file_size=args.max_file_size,
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
