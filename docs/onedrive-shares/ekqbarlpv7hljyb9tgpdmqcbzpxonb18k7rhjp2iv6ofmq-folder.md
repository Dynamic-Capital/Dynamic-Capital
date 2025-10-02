# Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ Share

This note records the metadata helpers for the newly provided OneDrive folder
that contains the reference **books** mirrored under
`knowledge_base\\books`. Mirror the information here into any runbooks or
scripts that need to access the remote resources.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ?e=PDXXJk
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VrcWJhcmxwdjdoTGp5Yjl0Z1BkTXFjQlpweG9uQjE4SzdSSGpwMklWNm9mbVE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!sb96a9b4abf694bb88f26fdb603dd32a7`

## Access notes

- A simple `curl -I` against the share returns a redirect that exposes the
  `resid` parameter shown above. Keep this handy when wiring the share into
  Microsoft Graph calls or S3 wrapper manifests. The redirect looks like:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ"
  ```

  ```text
  HTTP/1.1 302 Found
  Location: https://onedrive.live.com/redir?resid=2FF0428A2F57C7A4!sb96a9b4abf694bb88f26fdb603dd32a7&authkey=!AJAc...&cid=2FF0428A2F57C7A4
  ```

- Following the redirect anonymously currently returns "The request is blocked"
  (HTTP 403) from `onedrive.live.com`. Authenticate with a Microsoft account or
  use an app-only token to enumerate the folder contents.

## Fetching metadata

1. Export a Microsoft Graph access token that can read the shared folder:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Request the manifest entry with the repository helper:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ"
   ```

3. Persist the metadata (including child items) for downstream automation or
   auditing:

   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ" \
     docs/onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.metadata.json
   ```

   Pass `false` as the optional third argument if you do **not** need the
   `expand=children` query.

4. Alternatively, query Microsoft Graph directly:

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VrcWJhcmxwdjdoTGp5Yjl0Z1BkTXFjQlpweG9uQjE4SzdSSGpwMklWNm9mbVE/driveItem?expand=children"
   ```

The Graph response will include the item metadata and any child PDF files once
valid credentials are supplied. Snapshot the payload in
`docs/onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.metadata.json`
to keep the repository's knowledge base aligned with the external share.

## Processing the mirrored PDFs

Once the PDFs are mirrored under `data/knowledge_base/books`, extract their
contents in controlled batches so downstream trainers can ingest the text and
tables reliably. The repository ships with a maintained helper at
`tools/pdf_batch_extractor.py` that automates the workflow end to end.

### Batch extraction helper (CLI)

```bash
python tools/pdf_batch_extractor.py data/knowledge_base/books \
  --output-dir data/knowledge_base/books_extracted \
  --batch-size 20 \
  --max-workers 6 \
  --structured
```

- `--structured` enables table extraction with `pdfplumber` in addition to text.
- `--recursive` will walk subdirectories beneath the provided source folder.
- `--skip-existing` now checks for both the text and `tables.json` summary
  before a file is scheduled, keeping reruns quick and idempotent.

The script writes text files to `books_extracted/text/` and (when `--structured`
is provided) per-table CSVs plus a JSON summary under
`books_extracted/tables/<pdf-stem>/`. Each batch concludes with a success/failed
recap so operators can spot flaky documents immediately.

### Library usage (for notebooks or custom jobs)

You can also import the same helpers directly when orchestrating bespoke ETL
jobs:

```python
from pathlib import Path

from tools.pdf_batch_extractor import (
    ProcessingStats,
    extract_structured_from_pdf,
    process_pdfs,
)


# Single file example
result = extract_structured_from_pdf(Path("data/knowledge_base/books/example.pdf"))
print(result.pages, "pages", "tables:" if result.tables else "no tables")


# Batch processing with programmatic control
stats: ProcessingStats = process_pdfs(
    Path("data/knowledge_base/books"),
    output_dir=Path("data/knowledge_base/books_extracted"),
    batch_size=20,
    max_workers=6,
    structured=True,
    skip_existing=True,
)
print(stats)
```

### Dependencies

Install the helper libraries inside your preferred virtual environment before
running the scripts:

```bash
pip install PyPDF2 pdfplumber
```

> **Best practices:** start with batches of 10–20 PDFs, scale workers to match
> your CPU cores, enable OCR (for example with `pytesseract`) when a file is a
> scanned document, and persist intermediary results so the extraction jobs can
> be resumed if a batch fails.
