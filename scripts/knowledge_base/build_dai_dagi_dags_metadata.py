#!/usr/bin/env python3
"""Generate metadata datasets for the DAI/DAGI/DAGS knowledge base corpus."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable, Mapping

DOMAIN_TAGS: Mapping[str, tuple[str, ...]] = {
    "DAI": ("trading-knowledge", "dai"),
    "DAGI": ("agi-research", "dagi"),
    "DAGS": ("governance", "compliance", "dags"),
}


@dataclass(slots=True)
class MetadataRecord:
    identifier: str
    content: str
    source: str
    metadata: Mapping[str, object]
    tags: tuple[str, ...]

    def to_json(self) -> str:
        return json.dumps(
            {
                "identifier": self.identifier,
                "content": self.content,
                "source": self.source,
                "metadata": self.metadata,
                "tags": list(self.tags),
            },
            ensure_ascii=False,
        )


def _map_domain(relative_path: Path) -> str:
    parts = relative_path.parts
    if not parts:
        return "DAGI"
    if parts[0] == "books" and len(parts) > 1:
        if parts[1].lower() == "law":
            return "DAGS"
        if parts[1].lower() == "trading":
            return "DAI"
    if parts[0] == "research":
        return "DAI"
    return "DAGI"


def _iter_files(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if path.is_file():
            yield path


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _build_record(path: Path, *, source_url: str, root: Path) -> MetadataRecord:
    relative_path = path.relative_to(root)
    domain = _map_domain(relative_path)
    size = path.stat().st_size
    checksum = _hash_file(path)
    extension = path.suffix.lower().lstrip(".") or "none"
    identifier = f"{domain.lower()}-{relative_path.as_posix().replace('/', '-')}"
    content = (
        f"Metadata stub for {path.name} ({extension.upper()}) located in "
        f"{relative_path.parent.as_posix()} sized {size} bytes from the Google Drive corpus share."
    )
    metadata = {
        "source_path": relative_path.as_posix(),
        "file_extension": extension,
        "file_size_bytes": size,
        "checksum_sha256": checksum,
        "domain": domain,
        "source_url": source_url,
    }
    tags = DOMAIN_TAGS.get(domain, (domain.lower(),))
    return MetadataRecord(
        identifier=identifier,
        content=content,
        source="google-drive-dai-dagi-dags",
        metadata=metadata,
        tags=tags,
    )


def _write_jsonl(path: Path, records: Iterable[MetadataRecord]) -> int:
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(record.to_json())
            handle.write("\n")
            count += 1
    return count


def build_metadata(input_root: Path, output_root: Path, *, share_id: str) -> None:
    if not input_root.exists():
        raise FileNotFoundError(f"input directory '{input_root}' does not exist")
    source_url = f"https://drive.google.com/drive/folders/{share_id}"
    all_records: list[MetadataRecord] = []
    summary: dict[str, dict[str, object]] = {}
    domain_records: dict[str, list[MetadataRecord]] = {}

    for file_path in _iter_files(input_root):
        record = _build_record(file_path, source_url=source_url, root=input_root)
        all_records.append(record)
        domain = record.metadata["domain"]  # type: ignore[index]
        bucket_records = domain_records.setdefault(domain, [])
        bucket_records.append(record)
        bucket = summary.setdefault(
            domain,
            {"files": 0, "total_bytes": 0, "extensions": {}},
        )
        bucket["files"] = int(bucket["files"]) + 1
        bucket["total_bytes"] = int(bucket["total_bytes"]) + int(record.metadata["file_size_bytes"])  # type: ignore[index]
        extensions: dict[str, int] = bucket.setdefault("extensions", {})  # type: ignore[assignment]
        extension = record.metadata["file_extension"]  # type: ignore[index]
        extensions[extension] = extensions.get(extension, 0) + 1

    output_root.mkdir(parents=True, exist_ok=True)
    processed_root = output_root / "processed"
    processed_root.mkdir(parents=True, exist_ok=True)

    record_counts: dict[str, int] = {}
    for domain in ("DAI", "DAGI", "DAGS"):
        records = domain_records.get(domain, [])
        output_path = processed_root / f"{domain.lower()}_metadata.jsonl"
        record_counts[domain] = _write_jsonl(output_path, records)

    summary_payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "source_url": source_url,
        "domains": {
            domain: {
                "files": bucket["files"],
                "records": record_counts.get(domain, 0),
                "dataset_path": f"processed/{domain.lower()}_metadata.jsonl",
                "total_bytes": bucket["total_bytes"],
                "extensions": dict(sorted(bucket["extensions"].items())),  # type: ignore[arg-type]
                "tags": list(DOMAIN_TAGS.get(domain, (domain.lower(),))),
            }
            for domain, bucket in sorted(summary.items())
        },
        "total_files": len(all_records),
        "total_records": sum(record_counts.values()),
        "total_bytes": sum(int(bucket["total_bytes"]) for bucket in summary.values()),
    }

    summary_path = output_root / "metadata_summary.json"
    summary_path.write_text(json.dumps(summary_payload, indent=2) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Path to the downloaded Google Drive corpus root.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/knowledge_base/dai_dagi_dags"),
        help="Destination directory for the metadata outputs.",
    )
    parser.add_argument(
        "--share-id",
        default="1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB",
        help="Google Drive folder identifier for provenance metadata.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build_metadata(args.input, args.output, share_id=args.share_id)


if __name__ == "__main__":
    main()
