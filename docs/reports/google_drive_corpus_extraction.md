# Google Drive Corpus Extraction Run

## Summary

A fresh extraction run against the Google Drive share link
`https://drive.google.com/drive/folders/1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB?usp=sharing`
now succeeds without requiring authenticated API access. By invoking the `gdown`
library from Python (and temporarily raising its hard-coded per-folder limit) we
retrieved 115 files (PDF, DOCX, PPTX, PNG, and JSON assets) spanning the
`books/Law`, `books/Others`, `books/Trading`, and `research` sub-folders. The
full hierarchy currently lives under `/tmp/drive_folder_python` on the runner.

## Steps Performed

1. Installed `gdown` (`pip install gdown`) to interact with public Drive
   folders.
2. Launched a small Python snippet to import `gdown.download_folder`, bump the
   `MAX_NUMBER_FILES` constant from 50 to 1000, and call the library API:
   ```bash
   python - <<'PY'
   import importlib
   module = importlib.import_module('gdown.download_folder')
   module.MAX_NUMBER_FILES = 1000
   module.download_folder(
       url="https://drive.google.com/drive/folders/1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB?usp=sharing",
       output="/tmp/drive_folder_python",
       quiet=False,
   )
   PY
   ```
   Without the temporary patch `gdown` aborts after 50 files; the one-line
   override unlocks the remaining documents.
3. Verified the download (`find /tmp/drive_folder_python -type f | wc -l`) to
   confirm that 115 files landed successfully across the exposed directories.

## Follow-up Options

- **Ingest into the corpus pipeline.** Run
  `python scripts/index_google_drive_pdfs.py` with the same share link once
  Google Drive API credentials (API key or OAuth access token) are available.
  The script requires credentials to invoke Drive's metadata API but will
  leverage the same folder structure already mirrored locally.
- **Archive for reproducibility.** If long-term storage is needed, tar/zip the
  `/tmp/drive_folder_python` directory and check it into an artefact bucket or
  other persistent storage location accessible to the ingestion job.
- **Enable OCR when necessary.** A small subset of PDFs may rely on scanned
  images. Before indexing, install the optional OCR toolchain
  (`pip install PyPDF2 pdf2image pytesseract Pillow`) and add `--enable-ocr` to
  the indexing command so the engine can recover text from image-based pages.
