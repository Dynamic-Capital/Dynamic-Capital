# Saheeh International Quran Translation

This directory documents how to obtain the *The Qur'an (Saheeh International)* translation from [Al Rashid Mosque](https://alrashidmosque.ca/wp-content/uploads/2019/05/The-Quran-Saheeh-International.pdf). The repository omits the binary PDF to keep the codebase lightweight.

## Download instructions

Fetch the PDF into this folder before running the extractor:

```bash
curl -L \
  https://alrashidmosque.ca/wp-content/uploads/2019/05/The-Quran-Saheeh-International.pdf \
  -o data/knowledge_base/books/raw/islam/the_quran_saheeh_international.pdf
```

After downloading, you can optionally verify the SHA-256 checksum:

```bash
shasum -a 256 data/knowledge_base/books/raw/islam/the_quran_saheeh_international.pdf
```

Expected SHA-256: `cf4d9d0fa907206eec282aa59d95c0f8b300957e26f4c0fb9897476027f7ac9d`.

## Refreshing the mirror

Re-download the PDF if the upstream file changes, then re-run `python tools/books_corpus.py` with the Saheeh configuration documented in `data/knowledge_base/books/README.md`.
