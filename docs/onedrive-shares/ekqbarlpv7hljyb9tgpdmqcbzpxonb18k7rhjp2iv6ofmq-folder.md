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
contents in controlled batches so that downstream trainers can ingest the text
and tables reliably. The following Python workflow has been vetted for the
share:

### Batch text extraction

```python
import concurrent.futures
import os
from pathlib import Path
from typing import Dict, List

import PyPDF2


def extract_text_from_pdf(pdf_path: str) -> Dict[str, str]:
    """Extract text from a single PDF file."""
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()

            return {
                "filename": os.path.basename(pdf_path),
                "text": text,
                "status": "success",
                "pages": len(reader.pages),
            }
    except Exception as exc:  # pragma: no cover - best-effort logging path
        return {
            "filename": os.path.basename(pdf_path),
            "text": None,
            "status": "error",
            "error": str(exc),
        }


def save_extracted_text(result: Dict, output_dir: str = "extracted_text"):
    """Persist extracted text alongside the mirrored PDFs."""
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(
        output_dir, result["filename"].replace(".pdf", ".txt")
    )

    with open(output_file, "w", encoding="utf-8") as file:
        file.write(result["text"])


def process_pdfs_in_batches(
    pdf_directory: str, batch_size: int = 10, max_workers: int = 4
):
    """Process PDFs in batches with parallel workers."""
    pdf_files: List[Path] = list(Path(pdf_directory).glob("*.pdf"))
    total_files = len(pdf_files)
    print(f"Found {total_files} PDF files")

    for index in range(0, total_files, batch_size):
        batch = pdf_files[index : index + batch_size]
        batch_num = index // batch_size + 1
        print(f"\nProcessing batch {batch_num} ({len(batch)} files)...")

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=max_workers
        ) as executor:
            results = list(
                executor.map(extract_text_from_pdf, (str(path) for path in batch))
            )

        for result in results:
            if result["status"] == "success":
                print(f"✓ {result['filename']}: {result['pages']} pages extracted")
                save_extracted_text(result)
            else:
                print(f"✗ {result['filename']}: {result['error']}")

        print(f"Batch {batch_num} complete")


if __name__ == "__main__":
    process_pdfs_in_batches("data/knowledge_base/books")
```

### Table-aware extraction with `pdfplumber`

When the PDFs contain structured tables that PyPDF2 cannot faithfully recover,
switch to `pdfplumber` and hydrate pandas data frames for downstream export.

```python
from typing import Dict

import pdfplumber
import pandas as pd


def extract_structured_data(pdf_path: str) -> Dict:
    """Extract both free text and tables from a PDF."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text_content = []
            tables = []

            for page_num, page in enumerate(pdf.pages):
                text_content.append(page.extract_text())
                for table in page.extract_tables() or []:
                    dataframe = pd.DataFrame(table[1:], columns=table[0])
                    tables.append({"page": page_num + 1, "data": dataframe})

            return {
                "filename": os.path.basename(pdf_path),
                "text": "\n\n".join(text_content),
                "tables": tables,
                "status": "success",
            }
    except Exception as exc:  # pragma: no cover - observational logging path
        return {
            "filename": os.path.basename(pdf_path),
            "status": "error",
            "error": str(exc),
        }
```

### Memory hygiene for large batches

For very large drops, release memory between batches and persist results
immediately to avoid piling up strings in RAM. This helper reuses the imports
and functions defined in the batch extraction snippet above:

```python
import gc


def process_large_batches(pdf_directory: str, batch_size: int = 10):
    pdf_files = list(Path(pdf_directory).glob("*.pdf"))

    for index in range(0, len(pdf_files), batch_size):
        batch = pdf_files[index : index + batch_size]
        results = []

        for pdf_file in batch:
            result = extract_text_from_pdf(str(pdf_file))
            results.append(result)
            if result["status"] == "success":
                save_extracted_text(result)

        del results
        gc.collect()
        print(f"Completed batch {index // batch_size + 1}")
```

### Dependencies

Install the helper libraries inside your preferred virtual environment before
running the scripts:

```bash
pip install PyPDF2 pdfplumber pandas concurrent-futures
```

> **Best practices:** start with batches of 10–20 PDFs, scale workers to match
> your CPU cores, enable OCR (for example with `pytesseract`) when a file is a
> scanned document, and persist intermediary results so the extraction jobs can
> be resumed if a batch fails.
