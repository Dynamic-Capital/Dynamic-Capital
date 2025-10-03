# Google Drive Corpus Extraction Run

## Summary

A fresh extraction run against the Google Drive share link
`https://drive.google.com/drive/folders/1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB?usp=sharing`
now succeeds without requiring authenticated API access. Using `gdown` we
retrieved 115 files (PDF, DOCX, PPTX, PNG, and JSON assets) spanning the
`books/Law`, `books/Others`, `books/Trading`, and `research` sub-folders. The full
hierarchy currently lives under `/tmp/drive_folder` on the runner.

## Steps Performed

1. Installed `gdown` (`pip install gdown`) to interact with public Drive folders.
2. Pulled the folder contents with
   ```bash
   gdown --folder "https://drive.google.com/drive/folders/1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB?usp=sharing" \
         -O /tmp/drive_folder --remaining-ok
   ```
   The `--remaining-ok` flag lets the downloader continue when a folder contains
   more than 50 files (the Drive web API otherwise aborts the batch).
3. Verified the download (`find /tmp/drive_folder -type f | wc -l`) to confirm
   that 115 files landed successfully across the exposed directories.

## Follow-up Options

- **Ingest into the corpus pipeline.** Run `python scripts/index_google_drive_pdfs.py` with
  the same share link once Google Drive API credentials (API key or OAuth access
  token) are available. The script requires credentials to invoke Drive's
  metadata API but will leverage the same folder structure already mirrored
  locally.
- **Archive for reproducibility.** If long-term storage is needed, tar/zip the
  `/tmp/drive_folder` directory and check it into an artefact bucket or other
  persistent storage location accessible to the ingestion job.
- **Enable OCR when necessary.** A small subset of PDFs may rely on scanned
  images. Before indexing, install the optional OCR toolchain
  (`pip install PyPDF2 pdf2image pytesseract Pillow`) and add `--enable-ocr` to
  the indexing command so the engine can recover text from image-based pages.
