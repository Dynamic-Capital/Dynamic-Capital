"""Consolidate Google Drive corpus exports into knowledge base datasets."""

from __future__ import annotations

import argparse
import dataclasses
import json
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Iterable, Mapping, Sequence


@dataclasses.dataclass(slots=True)
class BundleConfig:
    """Configuration for a single Google Drive corpus export."""

    label: str
    documents: Path
    share_link: str
    category: str
    tags: tuple[str, ...]
    extra_metadata: Mapping[str, object] | None = None

    @classmethod
    def from_mapping(cls, payload: Mapping[str, object]) -> "BundleConfig":
        try:
            label = str(payload["label"]).strip()
            documents = Path(str(payload["documents"]))
            share_link = str(payload["share_link"]).strip()
            category = str(payload["category"]).strip()
        except KeyError as error:  # pragma: no cover - config validation
            raise ValueError(
                "Bundle configuration is missing a required field"
            ) from error

        raw_tags = payload.get("tags")
        if isinstance(raw_tags, str):
            tags = tuple(part.strip() for part in raw_tags.split(",") if part.strip())
        elif isinstance(raw_tags, Sequence):
            tags = tuple(str(tag).strip() for tag in raw_tags if str(tag).strip())
        else:
            tags = ()

        extra_metadata: Mapping[str, object] | None
        raw_metadata = payload.get("extra_metadata")
        if isinstance(raw_metadata, Mapping):
            extra_metadata = dict(raw_metadata)
        else:
            extra_metadata = None

        if not label:
            label = documents.stem

        if not share_link:
            raise ValueError("share_link must not be empty")

        if not category:
            raise ValueError("category must not be empty")

        return cls(
            label=label,
            documents=documents,
            share_link=share_link,
            category=category,
            tags=tags,
            extra_metadata=extra_metadata,
        )


@dataclasses.dataclass(slots=True)
class DatasetConfig:
    """Top-level dataset consolidation configuration."""

    source: str
    output_path: Path
    bundles: tuple[BundleConfig, ...]
    sample_path: Path | None = None
    summary_path: Path | None = None
    sample_size: int = 3

    @classmethod
    def from_mapping(cls, payload: Mapping[str, object]) -> "DatasetConfig":
        try:
            source = str(payload["source"]).strip()
            output_path = Path(str(payload["output_path"]))
        except KeyError as error:  # pragma: no cover - config validation
            raise ValueError(
                "Dataset configuration must include 'source' and 'output_path'"
            ) from error

        raw_bundles = payload.get("bundles")
        if not isinstance(raw_bundles, Sequence):
            raise ValueError("Dataset configuration must include a 'bundles' list")

        bundles = tuple(
            BundleConfig.from_mapping(item)
            for item in raw_bundles
            if isinstance(item, Mapping)
        )
        if not bundles:
            raise ValueError("At least one bundle must be provided")

        sample_path: Path | None = None
        if payload.get("sample_path"):
            sample_path = Path(str(payload["sample_path"]))

        summary_path: Path | None = None
        if payload.get("summary_path"):
            summary_path = Path(str(payload["summary_path"]))

        sample_size = int(payload.get("sample_size", 3) or 0)
        if sample_size < 0:
            sample_size = 0

        if not source:
            raise ValueError("source must not be empty")

        return cls(
            source=source,
            output_path=output_path,
            bundles=bundles,
            sample_path=sample_path,
            summary_path=summary_path,
            sample_size=sample_size,
        )


def _detect_language(text: str) -> str:
    """Heuristic language detection for English and Arabic documents."""

    if not text.strip():
        return "und"

    arabic_count = 0
    latin_count = 0
    for char in text:
        if "\u0600" <= char <= "\u06FF" or "\u0750" <= char <= "\u077F":
            arabic_count += 1
        elif "A" <= char <= "Z" or "a" <= char <= "z":
            latin_count += 1
        else:
            try:
                name = unicodedata.name(char)
            except ValueError:
                continue
            if "ARABIC" in name:
                arabic_count += 1
            elif "LATIN" in name:
                latin_count += 1

    if arabic_count and arabic_count >= latin_count:
        return "ar"
    if latin_count:
        return "en"
    return "und"


def _normalise_tags(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return normalised


def _load_documents(path: Path) -> list[Mapping[str, object]]:
    records: list[Mapping[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as error:  # pragma: no cover - config guard
                raise ValueError(
                    f"Failed to decode JSON document on line {line_number} of {path}"
                ) from error
            if not isinstance(payload, Mapping):
                raise ValueError(
                    f"Document on line {line_number} of {path} is not a mapping"
                )
            records.append(payload)
    return records


def _prepare_entry(
    *,
    raw: Mapping[str, object],
    bundle: BundleConfig,
    source: str,
) -> Mapping[str, object]:
    identifier = str(raw.get("identifier") or "").strip()
    if not identifier:
        raise ValueError("Document is missing an identifier")

    content = str(raw.get("content") or "").strip()
    if not content:
        raise ValueError(f"Document '{identifier}' is missing content")

    metadata = dict(raw.get("metadata") or {})
    metadata.setdefault("share_link", bundle.share_link)
    if "share_links" in metadata:
        share_links = list(metadata.get("share_links") or [])
        if bundle.share_link not in share_links:
            share_links.append(bundle.share_link)
        metadata["share_links"] = share_links
    else:
        metadata["share_links"] = [bundle.share_link]
    metadata["category"] = bundle.category
    metadata["bundle"] = bundle.label
    metadata["word_count"] = len(content.split())
    metadata["character_count"] = len(content)
    metadata["detected_language"] = _detect_language(content)
    if bundle.extra_metadata:
        for key, value in bundle.extra_metadata.items():
            metadata.setdefault(key, value)

    raw_tags = raw.get("tags")
    base_tags: Iterable[str]
    if isinstance(raw_tags, Sequence):
        base_tags = [str(tag) for tag in raw_tags]
    else:
        base_tags = []

    tags = _normalise_tags(
        list(base_tags)
        + list(bundle.tags)
        + ["google_drive", "google_drive_public", "pdf", bundle.category]
    )

    entry = {
        "identifier": identifier,
        "content": content,
        "source": source,
        "metadata": metadata,
        "tags": tags,
    }
    return entry


def consolidate(config: DatasetConfig) -> tuple[list[Mapping[str, object]], dict[str, object]]:
    entries: list[Mapping[str, object]] = []
    language_counts: Counter[str] = Counter()
    tag_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    share_counts: Counter[str] = Counter()
    bundle_breakdown: dict[str, int] = {}

    for bundle in config.bundles:
        documents = _load_documents(bundle.documents)
        bundle_breakdown[bundle.label] = len(documents)
        for raw in documents:
            entry = _prepare_entry(raw=raw, bundle=bundle, source=config.source)
            entries.append(entry)
            metadata = entry["metadata"]
            language = metadata.get("detected_language", "und")
            if isinstance(language, str):
                language_counts[language] += 1
            category_counts[metadata.get("category", "uncategorised")] += 1
            for share in metadata.get("share_links", []):
                share_counts[str(share)] += 1
            for tag in entry["tags"]:
                tag_counts[tag] += 1

    entries.sort(key=lambda item: (
        str(item["metadata"].get("bundle", "")),
        str(item["metadata"].get("relative_path", "")),
        item["identifier"],
    ))

    summary = {
        "source": config.source,
        "document_count": len(entries),
        "languages": dict(language_counts),
        "categories": dict(category_counts),
        "tags": dict(tag_counts),
        "share_links": dict(share_counts),
        "bundles": [
            {
                "label": bundle.label,
                "documents_path": str(bundle.documents),
                "share_link": bundle.share_link,
                "category": bundle.category,
                "tags": list(bundle.tags),
                "document_count": bundle_breakdown.get(bundle.label, 0),
            }
            for bundle in config.bundles
        ],
    }

    return entries, summary


def _write_jsonl(path: Path, records: Sequence[Mapping[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            json.dump(record, handle, ensure_ascii=False)
            handle.write("\n")


def _write_summary(path: Path, payload: Mapping[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run(config_path: Path) -> None:
    raw = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(raw, Mapping):
        raise ValueError("Configuration file must contain a JSON object")
    config = DatasetConfig.from_mapping(raw)
    entries, summary = consolidate(config)
    _write_jsonl(config.output_path, entries)

    if config.sample_path and config.sample_size:
        sample = entries[: config.sample_size]
        _write_jsonl(config.sample_path, sample)
        summary["sample_path"] = str(config.sample_path)
        summary["sample_size"] = len(sample)

    summary["output_path"] = str(config.output_path)
    if config.summary_path:
        _write_summary(config.summary_path, summary)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Consolidate Google Drive corpus exports into knowledge base datasets.",
    )
    parser.add_argument(
        "config",
        type=Path,
        help="Path to the dataset consolidation configuration JSON file.",
    )
    return parser.parse_args()


def main() -> None:  # pragma: no cover - CLI entry point
    args = _parse_args()
    run(args.config)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
