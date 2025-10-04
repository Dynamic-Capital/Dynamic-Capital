# Google Drive Public Corpus Snapshot

This directory contains sample corpus exports produced from the public Google
Drive shares supplied in the task brief. Each JSONL file holds the extracted
documents while the accompanying summary captures run metadata such as the
number of processed files and elapsed time.

## Contents

- `drive1_documents.jsonl` – Extracted text for five PDFs from the first
  Google Drive share.
- `drive1_summary.json` – Summary statistics for the drive 1 extraction run.
- `drive2_documents.jsonl` – Extracted text for five PDFs from the second
  Google Drive share.
- `drive2_summary.json` – Summary statistics for the drive 2 extraction run.

## Reproducing the Extraction

Use the `scripts/extract_public_google_drive_pdfs.py` utility to re-run the
pipeline. Remove the `--limit` flag to crawl an entire share or adjust the
value to control how many PDFs are processed.

```bash
python scripts/extract_public_google_drive_pdfs.py \
  "https://drive.google.com/drive/folders/1IX6IU758PHpK09cDeXiAe-CQo6mnN-T2?usp=sharing" \
  --output data/corpus/google_drive_public/drive1_documents.jsonl \
  --summary data/corpus/google_drive_public/drive1_summary.json \
  --limit 5
```

The tool supports multiple share links in a single invocation when a combined
snapshot is preferred.

## Knowledge Base Integration

Use the dataset configuration in `dataset_config.json` with the consolidation helper to mirror the exports into the Dynamic knowledge base.

```bash
python scripts/knowledge_base/build_public_google_drive_dataset.py \
  data/corpus/google_drive_public/dataset_config.json
```

The command produces the processed corpus, sample slice, and summary JSON under `data/knowledge_base/research/processed/`.

