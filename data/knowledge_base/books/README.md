# Knowledge Base Books Corpus

This workspace mirrors the `knowledge_base/books` section from the shared
OneDrive drive. Drop mirrored PDFs under `raw/` using the same directory tree as
OneDrive (for example, `raw/Trading/Wyckoff_Method_Volume_9_1.pdf`). The
extraction helpers materialise cleaned text, table CSVs, and JSONL corpora that
feed the retrieval layer.

## Directory layout

| Path | Purpose |
| --- | --- |
| `raw/` | Staging area for mirrored book PDFs. Preserve the OneDrive subfolders. |
| `extracted/text/` | Plain-text exports from the batch extractor. |
| `extracted/tables/` | Table CSVs and per-book manifests. |
| `processed/` | Aggregated JSONL corpora and run summaries for downstream pipelines. |

## Extraction helper

Use `tools/books_corpus.py` to extract page-level text and tables from the
mirrored PDFs. The helper wraps the shared `pdf_batch_extractor` module so it
inherits batch processing, deduplication guards, and structured extraction
support.

```bash
python tools/books_corpus.py \
  --pdf-dir data/knowledge_base/books/raw \
  --output-dir data/knowledge_base/books/extracted \
  --jsonl-path data/knowledge_base/books/processed/books_corpus.jsonl
```

Set `--structured` to `false` if table extraction is unnecessary or
`--no-skip-existing` to force a full reprocess.

## Wyckoff Method Volume 9.1 status

The shared link (`DynamicAI_DB/knowledge_base/books/Trading/Wyckoff_Method_Volume_9_1.pdf`)
currently returns an anonymous access block from OneDrive. To ingest the book:

1. Authenticate against Microsoft Graph and export an access token with
   `Files.Read.All` for the share.
2. Download the PDF into `raw/Trading/` and rerun `tools/books_corpus.py` with
   the JSONL path set to
   `data/knowledge_base/books/processed/wyckoff_method_volume_9_1.jsonl`.
3. Commit the extracted artifacts plus an updated manifest entry once the run
   succeeds.

Track download attempts in `raw/Trading/README.md` to keep provenance clear.
