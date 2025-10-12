# Google Drive Knowledge Base Extraction

This note captures the current options for extracting PDFs from a shared Google
Drive folder and batching the pages into 99-page corpus documents.

## Prerequisites

- Access to the shared folder: the share link must allow "Anyone with the link"
  to view the files. Private folders will block automated retrieval.
- Google Drive API credentials (API key or OAuth access token) for the
  `scripts/index_google_drive_pdfs.py` pipeline **or** the
  [`gdown`](https://github.com/wkentaro/gdown) utility if you plan to download
  the files first.
- Python dependencies: `PyPDF2` for text extraction and, when OCR is desired,
  `pdf2image`, `pytesseract`, and `Pillow`.

## Multi-drive corpus extraction

Use the `scripts/extract_google_drive_corpus.py` helper when you need to combine
several shared folders or files into a single corpus run. The utility registers
one extraction source per share link, requests help from all available agent
domains for traceability, and exports both the documents and run metadata.

```bash
python scripts/extract_google_drive_corpus.py \
  --share-link "https://drive.google.com/drive/folders/<folder-a>" \
  --share-link "https://drive.google.com/drive/folders/<folder-b>" \
  --api-key "$GOOGLE_API_KEY" \
  --continue-from data/google_drive_documents.jsonl \
  --pages-per-document 99 \
  --documents-jsonl data/google_drive_documents.jsonl \
  --output data/google_drive_corpus_summary.json
```

Provide `--share-links-file` to load additional URLs from a newline delimited
file. Use `--skip-agent-help` when you do not need the agent domain trace and
`--agent-domain` to request a specific subset instead of the default "all
domains" sweep.

When re-running the extraction, supply one or more `--continue-from` paths
pointing at previous JSONL exports to skip already-processed Google Drive file
IDs. This enables incremental runs without duplicating documents in the
resulting corpus.

## End-to-end extraction with batching

Run the indexing script with the shared link, credentials, and JSONL export
enabled. The `--pages-per-document` flag controls the batching window and
defaults to 99 pages.

```bash
python scripts/index_google_drive_pdfs.py \
  --share-link "https://drive.google.com/drive/folders/<folder-id>" \
  --api-key "$GOOGLE_API_KEY" \
  --pages-per-document 99 \
  --documents-jsonl data/google_drive_documents.jsonl \
  --output data/google_drive_snapshot.json
```

The resulting JSONL file will contain one record per 99-page batch (or fewer if
the final chunk is smaller). Snapshot metadata is written to the JSON output for
bookkeeping.

## Knowledge base dataset export

To mirror the Drive corpus into the repository's knowledge base directory, use
`ml/extract_google_drive_knowledge_base.py`. The helper wraps the
`DynamicCorpusExtractionEngine`, skips previously processed file IDs, and writes
both the JSONL corpus and a run summary under
`data/knowledge_base/google_drive/`.

```bash
python ml/extract_google_drive_knowledge_base.py \
  --share-link "https://drive.google.com/drive/folders/<folder-id>" \
  --api-key "$GOOGLE_API_KEY" \
  --output data/knowledge_base/google_drive/processed/google_drive_corpus.jsonl \
  --summary data/knowledge_base/google_drive/processed/google_drive_summary.json \
  --sample data/knowledge_base/google_drive/processed/google_drive_sample.jsonl
```

Supply `--continue-from` with one or more existing JSONL exports to avoid
reprocessing the same Drive files. Enable `--enable-ocr` when the share contains
scanned PDFs and configure OCR languages via repeated `--ocr-language` flags.

## Handling restricted folders

If the share link is not world-readable, API calls or utilities such as `gdown`
will fail with a permissions error. For example, attempting to pull the folder
used during verification produced:

```
Cannot retrieve the folder information from the link. You may need to change the permission to 'Anyone with the link'.
```

Ensure the folder permissions are updated or request an access token from the
owner before rerunning the extraction.
