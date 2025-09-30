"""Extract the Nemotron Personas Japan dataset into JSONL format."""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Sequence
from urllib import parse, request

import pyarrow.parquet as pq
from huggingface_hub import hf_hub_download

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_corpus_extraction.engine import (
    CorpusDocument,
    CorpusExtractionContext,
    DynamicCorpusExtractionEngine,
)

DATASET_ID = "nvidia/Nemotron-Personas-Japan"
DATASET_CONFIG = "default"
PARQUET_REVISION = "refs/convert/parquet"
_PERSONA_FIELDS: Sequence[str] = (
    "professional_persona",
    "sports_persona",
    "arts_persona",
    "travel_persona",
    "culinary_persona",
    "persona",
)
_CONTEXT_FIELDS: Sequence[str] = (
    "uuid",
    "cultural_background",
    "skills_and_expertise",
    "skills_and_expertise_list",
    "hobbies_and_interests",
    "hobbies_and_interests_list",
    "career_goals_and_ambitions",
    "sex",
    "age",
    "marital_status",
    "education_level",
    "occupation",
    "region",
    "area",
    "prefecture",
    "country",
)


@dataclass(slots=True)
class NemotronExtractionOptions:
    """Options controlling Nemotron persona extraction."""

    dataset_id: str = DATASET_ID
    config: str = DATASET_CONFIG
    split: str = "train"
    token: str | None = None
    batch_size: int = 256


def _compute_record_limit(document_limit: int | None) -> int | None:
    if document_limit is None:
        return None
    return math.ceil(document_limit / len(_PERSONA_FIELDS))


def _fetch_parquet_inventory(options: NemotronExtractionOptions) -> list[dict[str, object]]:
    params = parse.urlencode(
        {
            "dataset": options.dataset_id,
            "config": options.config,
            "split": options.split,
        }
    )
    url = f"https://datasets-server.huggingface.co/parquet?{params}"
    with request.urlopen(url) as response:
        payload = json.load(response)
    files = payload.get("parquet_files", [])
    if not files:
        raise RuntimeError(
            f"No parquet shards discovered for {options.dataset_id}:{options.config}:{options.split}"
        )
    return files


def _iter_source_rows(
    options: NemotronExtractionOptions,
    record_limit: int | None,
) -> Iterator[tuple[int, dict[str, object]]]:
    inventory = _fetch_parquet_inventory(options)
    records_emitted = 0
    for shard in inventory:
        if record_limit is not None and records_emitted >= record_limit:
            break
        filename = shard["filename"]
        local_path = hf_hub_download(
            repo_id=options.dataset_id,
            repo_type="dataset",
            revision=PARQUET_REVISION,
            filename=f"{options.config}/{options.split}/{filename}",
            token=options.token,
        )
        parquet = pq.ParquetFile(local_path)
        for batch in parquet.iter_batches(batch_size=options.batch_size):
            for row in batch.to_pylist():
                yield records_emitted, row
                records_emitted += 1
                if record_limit is not None and records_emitted >= record_limit:
                    return


def _iter_personas(
    context: CorpusExtractionContext,
    options: NemotronExtractionOptions,
) -> Iterator[CorpusDocument]:
    record_limit = _compute_record_limit(context.limit)
    document_limit = context.limit
    emitted = 0
    for record_index, row in _iter_source_rows(options, record_limit):
        base_metadata = {field: row.get(field) for field in _CONTEXT_FIELDS}
        base_metadata.update(
            {
                "split": options.split,
                "row_index": record_index,
                "dataset": options.dataset_id,
            }
        )
        for persona_field in _PERSONA_FIELDS:
            text = row.get(persona_field)
            if not text:
                continue
            document = CorpusDocument(
                identifier=f"{row['uuid']}::{persona_field}",
                content=str(text),
                source=options.dataset_id,
                metadata={**base_metadata, "persona_field": persona_field},
                tags=("nemotron-personas-japan", persona_field),
            )
            emitted += 1
            yield document
            if document_limit is not None and emitted >= document_limit:
                return


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI argument parser."""

    parser = argparse.ArgumentParser(
        description="Extract the Nemotron Personas Japan dataset into JSONL format.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/knowledge_base/research/processed/nemotron_personas_japan.jsonl"),
        help="Destination JSONL file for exported persona documents.",
    )
    parser.add_argument(
        "--summary",
        type=Path,
        default=Path("data/knowledge_base/research/processed/nemotron_personas_japan_summary.json"),
        help="Optional path to write an extraction summary JSON report.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of persona documents to export (useful for sampling).",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="train",
        help="Dataset split to extract from (defaults to 'train').",
    )
    parser.add_argument(
        "--dataset-id",
        type=str,
        default=DATASET_ID,
        help="Override the Hugging Face dataset identifier.",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=DATASET_CONFIG,
        help="Dataset configuration name (defaults to 'default').",
    )
    parser.add_argument(
        "--token",
        type=str,
        default=None,
        help="Optional Hugging Face access token for gated datasets.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=256,
        help="Parquet batch size used while streaming rows.",
    )
    return parser


def run(args: argparse.Namespace) -> int:
    """Execute the extraction based on parsed arguments."""

    options = NemotronExtractionOptions(
        dataset_id=args.dataset_id,
        config=args.config,
        split=args.split,
        token=args.token,
        batch_size=args.batch_size,
    )
    engine = DynamicCorpusExtractionEngine(attach_source_metadata=False)
    engine.register_source(
        "nemotron_personas_japan",
        lambda ctx: _iter_personas(ctx, options),
        tags=("huggingface", "persona", "japanese"),
        metadata={
            "dataset": options.dataset_id,
            "config": options.config,
            "split": options.split,
        },
    )
    summary = engine.extract(
        sources=("nemotron_personas_japan",),
        limit=args.limit,
        metadata={"split": options.split},
    )
    exported = summary.export_jsonl(args.output)
    if args.summary:
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        with args.summary.open("w", encoding="utf-8") as handle:
            json.dump(summary.as_dict(), handle, ensure_ascii=False, indent=2)
    return exported


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    exported = run(args)
    print(f"Exported {exported} persona documents to {args.output}")


if __name__ == "__main__":
    main()
