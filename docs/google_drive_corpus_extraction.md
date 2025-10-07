# Google Drive Corpus Extraction

This repository now includes `scripts/extract_google_drive_corpus.py`, a utility
that downloads publicly shared Google Drive folders and exports PDF content as
JSONL corpus documents.

## Requirements

The script expects the following Python packages to be available:

- `gdown`
- `PyPDF2`
- `beautifulsoup4`
- `requests`

Install them with `pip install gdown PyPDF2 beautifulsoup4 requests` if
necessary.

## Usage

```
PYTHONPATH=. python scripts/extract_google_drive_corpus.py <share-link> <output.jsonl> \
  [--limit PAGE_COUNT] [--skip FILE_COUNT] [--tags TAG ...]
```

- **share-link** – Google Drive folder URL (the script resolves nested
  sub-folders automatically).
- **output.jsonl** – Path where the extracted corpus entries will be written.
- `--limit` – Optional cap on the number of page-level documents to export.
  Leave unset to process the entire folder.
- `--skip` – Number of files to skip before processing begins. Useful when
  resuming a large extraction.
- `--tags` – Additional tags appended to each exported document.

Each exported JSON line contains the identifier, extracted page text, original
folder ID, and source metadata (`file_id`, `file_name`, `modified_label`,
`page`). Empty pages and files that cannot be parsed are skipped.

## Example

```
PYTHONPATH=. python scripts/extract_google_drive_corpus.py \
  https://drive.google.com/drive/folders/1IX6IU758PHpK09cDeXiAe-CQo6mnN-T2?usp=sharing \
  data/google_drive_drive1.jsonl
```

The command downloads every PDF inside the shared folder (including nested
sub-folders), extracts each page's text, and writes the result to
`data/google_drive_drive1.jsonl`.

To process multiple folders, run the command for each share link and merge the
resulting JSONL files if required.
