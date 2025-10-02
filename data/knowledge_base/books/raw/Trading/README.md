# Trading Books Staging

Mirror PDFs from `OneDrive/DynamicAI_DB/knowledge_base/books/Trading/` here
before running the batch extractor. Keep a short provenance log for each title.

## Wyckoff Method Volume 9.1

- **Source link:** https://1drv.ms/b/c/2ff0428a2f57c7a4/Ebx8axJbhvxDt352l366lh8BaMoCXOLcCgV2lw9_xBRf4Q?e=Mn56dx
- **Status:** Download blocked by OneDrive (`Microsoft.Vroom.Exceptions.UnauthenticatedVroomException`).
- **Next steps:** Acquire Microsoft Graph authentication, fetch the PDF, and
  rerun `python tools/books_corpus.py --pdf-dir data/knowledge_base/books/raw \
  --jsonl-path data/knowledge_base/books/processed/wyckoff_method_volume_9_1.jsonl`.
