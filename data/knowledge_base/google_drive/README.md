# Google Drive Knowledge Base Dataset

This directory stores JSONL corpora derived from the Google Drive PDF shares
referenced in the knowledge base manifests. The `ml/extract_google_drive_knowledge_base.py`
script materialises the dataset by streaming public Drive folders, extracting
PDF text (with optional OCR), and writing the outputs used for retrieval
training.

## Default layout

- `processed/google_drive_corpus.jsonl` – consolidated corpus created by the
  extraction script (one record per document or page batch).
- `processed/google_drive_sample.jsonl` – optional preview exported when
  `--sample` is enabled (first N documents).
- `processed/google_drive_summary.json` – run metadata including source counts,
  skip lists, and elapsed time.

Run the extractor with:

```bash
python ml/extract_google_drive_knowledge_base.py \
  --share-link "https://drive.google.com/drive/folders/<folder-id>" \
  --api-key "$GOOGLE_API_KEY" \
  --output data/knowledge_base/google_drive/processed/google_drive_corpus.jsonl
```

Adjust the share link(s), credentials, and optional OCR parameters to match the
upstream Drive workspace. The script will reuse existing JSONL exports passed to
`--continue-from` to skip already processed files.
