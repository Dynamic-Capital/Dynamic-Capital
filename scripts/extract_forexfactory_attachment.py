#!/usr/bin/env python3
"""Export the ForexFactory BTMM attachment into the local corpus."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dynamic_corpus_extraction import (  # noqa: E402  (import after sys.path manipulation)
    DynamicCorpusExtractionEngine,
    build_forexfactory_attachment_loader,
)

ATTACHMENT_URL = "https://www.forexfactory.com/attachment/file/3855498?d=1612496935"
OUTPUT_PATH = (
    ROOT
    / "data"
    / "knowledge_base"
    / "research"
    / "processed"
    / "forexfactory_btmm_patterns.jsonl"
)
SOURCE_NAME = "forexfactory-btmm-patterns"
SOURCE_TAGS = ("forexfactory", "attachment", "btmm")


def main() -> None:
    engine = DynamicCorpusExtractionEngine()
    loader = build_forexfactory_attachment_loader([ATTACHMENT_URL], tags=SOURCE_TAGS)
    engine.register_source(
        SOURCE_NAME,
        loader,
        tags=SOURCE_TAGS,
        metadata={"attachment_urls": [ATTACHMENT_URL]},
    )

    summary = engine.extract(sources=[SOURCE_NAME])
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    exported = summary.export_jsonl(OUTPUT_PATH)
    print(f"Exported {exported} document(s) to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
