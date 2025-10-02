# Dynamic Trading Knowledge PDFs

This workspace tracks the mirrored PDF corpus for the dynamic trading knowledge
base and the artefacts generated after extraction. Sync the PDFs from OneDrive
(or the DynamicAI_D `Bdatasets` drop) into `raw/` and run the extractor helper
to materialise searchable text, table CSVs, and a page-level JSONL corpus.

## Directory layout

| Path | Purpose |
| --- | --- |
| `raw/` | Drop the mirrored PDFs here before running extraction. |
| `extracted/text/` | Plain-text dumps produced by the batch extractor. |
| `extracted/tables/` | Per-PDF table CSVs plus `tables.json` manifests (when tables are detected). |
| `processed/dynamic_trading_knowledge.jsonl` | Aggregated page-level corpus with text and table payloads. |
| `processed/dynamic_trading_summary.json` | Run metadata summarising counts and extractor settings. |

## Quick start

```bash
pip install PyPDF2 pdfplumber
python tools/dynamic_trading_corpus.py \
  --pdf-dir data/knowledge_base/dynamic_trading/raw \
  --output-dir data/knowledge_base/dynamic_trading/extracted \
  --jsonl-path data/knowledge_base/dynamic_trading/processed/dynamic_trading_knowledge.jsonl
```

The script wraps `tools/pdf_batch_extractor.py`, enables structured extraction
by default, and writes a JSON summary alongside the JSONL corpus. Use
`--no-structured` if you only need plain text or `--no-skip-existing` when you
want to reprocess every PDF from scratch.

## Post-processing suggestions

- Push the JSONL output into the RAG preprocessing pipeline to align chunking
  and embeddings with the rest of the knowledge base.
- Review `processed/dynamic_trading_summary.json` after each run to confirm
  table counts and identify PDFs that may need OCR.
- Version large corpora in Supabase or another object store once QA passes so
  downstream fine-tuning runs can reference stable snapshots.
