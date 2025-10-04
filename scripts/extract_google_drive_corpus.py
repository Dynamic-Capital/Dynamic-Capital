"""Utility to extract corpus documents from multiple Google Drive share links."""

from __future__ import annotations

import argparse
import json
import logging
import os
import pkgutil
import re
from pathlib import Path
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_corpus_extraction.engine import (
    CorpusExtractionSummary,
    DynamicCorpusExtractionEngine,
)
from dynamic_corpus_extraction.google_drive import (
    build_google_drive_pdf_loader,
    parse_drive_share_link,
)

LOGGER = logging.getLogger("extract_google_drive_corpus")


def _configure_logging(*, verbose: bool) -> None:
    level = logging.INFO if verbose else logging.WARNING
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract corpus documents from Google Drive share links using the dynamic "
            "corpus extraction engine."
        )
    )
    parser.add_argument(
        "--share-link",
        dest="share_links",
        action="append",
        default=None,
        help=(
            "Google Drive share link (folder or file). Provide multiple times to "
            "combine several drives into a single corpus run."
        ),
    )
    parser.add_argument(
        "--share-links-file",
        help=(
            "Optional path to a newline-delimited file of Google Drive share links. "
            "These are appended to any --share-link values provided."
        ),
    )
    parser.add_argument("--api-key", help="Google API key for Drive access.")
    parser.add_argument("--access-token", help="OAuth access token for Drive API calls.")
    parser.add_argument(
        "--enable-ocr",
        action="store_true",
        help="Enable OCR fallback when PDFs do not contain embedded text.",
    )
    parser.add_argument(
        "--ocr-language",
        dest="ocr_languages",
        action="append",
        default=None,
        help="Language hint(s) for Tesseract OCR (may be provided multiple times).",
    )
    parser.add_argument(
        "--ocr-dpi",
        type=int,
        default=300,
        help="Rasterisation DPI used when OCR is enabled (default: 300).",
    )
    parser.add_argument(
        "--include-docx",
        action="store_true",
        help="Include DOCX files alongside PDFs when traversing the share link.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Override the batch size used when paging Drive results.",
    )
    parser.add_argument(
        "--pages-per-document",
        type=int,
        default=99,
        help=(
            "Maximum number of PDF pages to include in each extracted document. "
            "Set to 0 to disable batching (default: 99)."
        ),
    )
    parser.add_argument(
        "--max-file-size",
        type=int,
        default=50_000_000,
        help="Maximum allowed file size in bytes (default: 50MB).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on the number of documents to extract across all sources.",
    )
    parser.add_argument(
        "--metadata",
        dest="metadata_pairs",
        action="append",
        default=None,
        help="Additional key=value metadata pairs to attach to the extraction run.",
    )
    parser.add_argument(
        "--documents-jsonl",
        help="Optional path to export the extracted documents as JSONL.",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="data/google_drive_corpus_summary.json",
        help="Location where the extraction summary JSON will be written.",
    )
    parser.add_argument(
        "--agent-domain",
        dest="agent_domains",
        action="append",
        default=None,
        help=(
            "Agent domain(s) to request help from prior to extraction. Defaults to "
            "all dynamic agent modules."
        ),
    )
    parser.add_argument(
        "--skip-agent-help",
        action="store_true",
        help="Skip requesting help from agent domains before extraction.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging output.",
    )
    return parser.parse_args()


def _load_links_from_file(path: str | None) -> list[str]:
    if not path:
        return []
    file_path = Path(path)
    if not file_path.exists():
        raise SystemExit(f"Share links file '{path}' does not exist")
    links: list[str] = []
    for line in file_path.read_text(encoding="utf-8").splitlines():
        candidate = line.strip()
        if candidate:
            links.append(candidate)
    return links


def _normalise_share_links(links: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for link in links:
        candidate = (link or "").strip()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        cleaned.append(candidate)
    return cleaned


def _normalise_credential(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _resolve_credentials(args: argparse.Namespace) -> tuple[str | None, str | None]:
    api_key = _normalise_credential(args.api_key)
    access_token = _normalise_credential(args.access_token)
    if api_key is None:
        api_key = _normalise_credential(os.getenv("GOOGLE_API_KEY"))
    if access_token is None:
        access_token = _normalise_credential(os.getenv("GOOGLE_ACCESS_TOKEN"))
    if api_key is None and access_token is None:
        raise SystemExit(
            "Google Drive credentials are required. Provide --api-key/--access-token "
            "arguments or set GOOGLE_API_KEY/GOOGLE_ACCESS_TOKEN environment variables."
        )
    return api_key, access_token


def _parse_metadata(pairs: Sequence[str] | None) -> MutableMapping[str, object]:
    metadata: dict[str, object] = {}
    for entry in pairs or ():
        if "=" not in entry:
            raise SystemExit(f"Metadata entry '{entry}' must be in key=value format")
        key, value = entry.split("=", 1)
        key = key.strip()
        if not key:
            raise SystemExit("Metadata keys must not be empty")
        metadata[key] = value.strip()
    return metadata


def discover_agent_domains() -> tuple[str, ...]:
    import dynamic_agents

    domains: list[str] = []
    for module in pkgutil.iter_modules(dynamic_agents.__path__):
        name = module.name
        if not name or name.startswith("_"):
            continue
        label = re.sub(r"[_\s]+", " ", name).strip().title()
        if label:
            domains.append(label)
    return tuple(sorted(set(domains)))


def call_help_for_agents(domains: Sequence[str]) -> None:
    for domain in domains:
        label = domain.strip()
        if not label:
            continue
        LOGGER.info("Requesting help from %s agent domain", label)


def _make_source_name(index: int, target_type: str, identifier: str) -> str:
    base = f"google_drive_{target_type}_{identifier}".lower()
    slug = re.sub(r"[^a-z0-9]+", "_", base).strip("_")
    if not slug:
        slug = f"google_drive_source_{index}"
    return slug


def _register_drive_source(
    engine: DynamicCorpusExtractionEngine,
    *,
    share_link: str,
    api_key: str | None,
    access_token: str | None,
    enable_ocr: bool,
    ocr_languages: Sequence[str] | None,
    ocr_dpi: int,
    include_docx: bool,
    batch_size: int | None,
    pages_per_document: int,
    max_file_size: int | None,
) -> Mapping[str, object]:
    target_type, identifier = parse_drive_share_link(share_link)
    source_name = _make_source_name(len(engine.list_sources()) + 1, target_type, identifier)
    tags = ("google_drive", target_type)
    loader = build_google_drive_pdf_loader(
        share_link=share_link,
        api_key=api_key,
        access_token=access_token,
        enable_ocr=enable_ocr,
        ocr_languages=ocr_languages,
        ocr_dpi=ocr_dpi,
        include_docx=include_docx,
        batch_size=batch_size,
        page_batch_size=pages_per_document,
        max_file_size=max_file_size,
    )
    metadata = {
        "share_link": share_link,
        "target_type": target_type,
        "identifier": identifier,
    }
    engine.register_source(source_name, loader, tags=tags, metadata=metadata)
    return metadata


def _run_extraction(args: argparse.Namespace) -> None:
    links_from_args = args.share_links or []
    links_from_file = _load_links_from_file(args.share_links_file)
    share_links = _normalise_share_links([*links_from_args, *links_from_file])
    if not share_links:
        raise SystemExit("At least one Google Drive share link must be provided")

    api_key, access_token = _resolve_credentials(args)

    engine = DynamicCorpusExtractionEngine()
    for link in share_links:
        metadata = _register_drive_source(
            engine,
            share_link=link,
            api_key=api_key,
            access_token=access_token,
            enable_ocr=args.enable_ocr,
            ocr_languages=args.ocr_languages,
            ocr_dpi=args.ocr_dpi,
            include_docx=args.include_docx,
            batch_size=args.batch_size,
            pages_per_document=args.pages_per_document,
            max_file_size=args.max_file_size,
        )
        LOGGER.info("Registered Google Drive source %s", metadata["identifier"])

    run_metadata = _parse_metadata(args.metadata_pairs)
    run_metadata.setdefault("share_links", tuple(share_links))
    run_metadata.setdefault("share_link_count", len(share_links))

    summary = engine.extract(limit=args.limit, metadata=run_metadata)
    _display_summary(summary)

    if args.documents_jsonl:
        output_path = Path(args.documents_jsonl)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        document_count = summary.export_jsonl(output_path)
        LOGGER.info("Exported %s documents to %s", document_count, output_path)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(summary.as_dict(), indent=2), encoding="utf-8")
        LOGGER.info("Wrote extraction summary to %s", output_path)


def _display_summary(summary: CorpusExtractionSummary) -> None:
    print("Extraction complete")
    print(f"Documents extracted: {len(summary.documents)}")
    print("Source breakdown:")
    for source, count in sorted(summary.source_statistics.items()):
        print(f"  - {source}: {count}")
    print(f"Duplicates skipped: {summary.duplicate_count}")
    print(f"Elapsed seconds: {summary.elapsed_seconds:.2f}")


def main() -> None:
    args = _parse_args()
    _configure_logging(verbose=args.verbose)

    if not args.skip_agent_help:
        domains = args.agent_domains or discover_agent_domains()
        call_help_for_agents(domains)

    _run_extraction(args)


if __name__ == "__main__":
    main()
