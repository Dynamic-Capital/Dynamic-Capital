"""Extract metadata for the Internet Archive Newspaper Archive collection."""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Mapping, MutableMapping
from urllib import parse, request

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_corpus_extraction.engine import (
    CorpusDocument,
    CorpusExtractionContext,
    DynamicCorpusExtractionEngine,
)

DEFAULT_FIELDS: tuple[str, ...] = (
    "identifier",
    "title",
    "coverage",
    "language",
    "mediatype",
    "date",
    "publicdate",
    "downloads",
    "imagecount",
    "year",
    "month",
)


@dataclass(slots=True)
class NewspaperArchiveOptions:
    """Options that control metadata extraction."""

    collection: str = "newspaperarchive"
    query: str | None = None
    rows_per_page: int = 500
    fields: tuple[str, ...] = DEFAULT_FIELDS


def _build_query(options: NewspaperArchiveOptions) -> str:
    if options.query:
        return options.query
    return f"collection:{options.collection}"


def _fetch_advancedsearch_page(
    *,
    query: str,
    fields: tuple[str, ...],
    rows: int,
    page: int,
) -> Mapping[str, object]:
    params = parse.urlencode(
        {
            "q": query,
            "output": "json",
            "rows": rows,
            "page": page,
            "fl": ",".join(fields),
        }
    )
    url = f"https://archive.org/advancedsearch.php?{params}"
    with request.urlopen(url) as response:
        return json.load(response)


def _compose_content(document: Mapping[str, object]) -> str:
    title = document.get("title")
    coverage = document.get("coverage")
    date = document.get("date") or document.get("publicdate")
    segments = [segment for segment in (title, coverage, date) if segment]
    if not segments:
        return document.get("identifier", "")
    return " | ".join(str(segment) for segment in segments)


def _iter_collection_documents(
    context: CorpusExtractionContext,
    options: NewspaperArchiveOptions,
) -> Iterator[CorpusDocument]:
    query = _build_query(options)
    rows = max(1, min(1000, options.rows_per_page))
    page = 1
    emitted = 0
    limit = context.limit
    total_pages = math.inf

    while page <= total_pages:
        payload = _fetch_advancedsearch_page(
            query=query,
            fields=options.fields,
            rows=rows,
            page=page,
        )
        response = payload.get("response")
        if not isinstance(response, Mapping):
            break
        num_found = response.get("numFound")
        if isinstance(num_found, int) and num_found > 0:
            total_pages = math.ceil(num_found / rows)
        docs = response.get("docs", [])
        if not isinstance(docs, list) or not docs:
            break
        for raw_doc in docs:
            if not isinstance(raw_doc, Mapping):
                continue
            metadata: MutableMapping[str, object] = {
                field: raw_doc.get(field) for field in options.fields if field in raw_doc
            }
            metadata["collection"] = options.collection
            metadata["query"] = query
            document = CorpusDocument(
                identifier=str(raw_doc.get("identifier", "")),
                content=_compose_content(raw_doc),
                source=options.collection,
                metadata=metadata,
                tags=("internet-archive", options.collection),
            )
            emitted += 1
            yield document
            if limit is not None and emitted >= limit:
                return
        page += 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract metadata for the Internet Archive Newspaper Archive collection.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to the JSONL file that will contain the extracted metadata.",
    )
    parser.add_argument(
        "--summary",
        help="Optional path to write a JSON summary of the extraction run.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Maximum number of documents to export. Defaults to the full collection.",
    )
    parser.add_argument(
        "--collection",
        default="newspaperarchive",
        help="Internet Archive collection identifier. Defaults to 'newspaperarchive'.",
    )
    parser.add_argument(
        "--rows-per-page",
        type=int,
        default=500,
        help="Number of results to request per Advanced Search page (max 1000).",
    )
    parser.add_argument(
        "--query",
        help="Override the Advanced Search query. Useful for slicing subsets.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    options = NewspaperArchiveOptions(
        collection=args.collection,
        query=args.query,
        rows_per_page=args.rows_per_page,
    )

    engine = DynamicCorpusExtractionEngine()
    engine.register_source(
        options.collection,
        lambda context: _iter_collection_documents(context, options),
        tags=("internet-archive", options.collection),
        metadata={"collection": options.collection},
    )

    summary = engine.extract(limit=args.limit)
    output_path = Path(args.output)
    exported_count = summary.export_jsonl(output_path)

    if args.summary:
        summary_payload = {
            "collection": options.collection,
            "documents_exported": exported_count,
            "source_statistics": summary.source_statistics,
            "duplicate_count": summary.duplicate_count,
            "elapsed_seconds": summary.elapsed_seconds,
            "limit": args.limit,
            "query": args.query or _build_query(options),
        }
        Path(args.summary).write_text(json.dumps(summary_payload, indent=2), encoding="utf-8")

    return 0


if __name__ == "__main__":
    sys.exit(main())
