# Knowledge Base Books & Learning Material Ingestion Guide

This playbook standardises how the books, research papers, notes, and articles
stored in the OneDrive `DynamicAI_DB/knowledge_base/` directory are mirrored
into the Dynamic Capital training environment. Follow the steps below whenever
new long-form learning resources land in the share so they can reinforce the
retrieval and reasoning layers that support trading intelligence.

## Directory layout

Mirror the OneDrive hierarchy locally under `data/knowledge_base/` so downstream
tooling can assume a consistent structure.

```text
OneDrive/DynamicAI_DB/
├── datasets/
│   ├── market_data/
│   ├── account_history/
│   └── processed/
├── dynamic/
│   └── models/
├── logs/
├── reports/
└── knowledge_base/
    ├── books/
    │   ├── Trading_in_the_Zone.pdf
    │   ├── Market_Wizards.epub
    │   └── Technical_Analysis_of_Financial_Markets.pdf
    ├── research/
    │   ├── Order_Flow_Analysis.pdf
    │   └── Machine_Learning_in_Forex.pdf
    ├── notes/
    │   ├── Elliott_Wave.md
    │   ├── Wyckoff_Method.docx
    │   └── ADR_Strategy.txt
    └── articles/
        ├── Fibonacci_Retracements.md
        └── Market_Psychology.md
```

- Preserve file extensions so downstream converters can route PDFs, EPUBs, DOCX,
  and Markdown through the correct parser.
- Version controlled derivatives (cleaned text, embeddings, metadata) should
  live beside the originals in `processed/` subfolders under each category.

## Pre-processing workflow

1. **Inventory & staging**
   - Run the OneDrive listing helper to snapshot new files and commit the
     metadata diff under `docs/onedrive-shares/`.
   - Copy the new artefacts into the local mirror
     (`data/knowledge_base/<category>/raw/`).
2. **Text extraction**
   - Use `pdfplumber` or `PyPDF2` for PDFs, `python -m tika` for mixed formats,
     and `pandoc` for DOCX/EPUB conversions.
   - Run `python tools/books_corpus.py --pdf-dir data/knowledge_base/books/raw`
     to batch extract mirrored books into `extracted/` and emit a page-granular
     JSONL corpus under `processed/`.
   - Normalise whitespace, remove boilerplate (copyright pages, tables of
     contents), and preserve headings with Markdown markers.
3. **Chunking**
   - Split content into 500–1000 token blocks using the shared text utils
     (`npm run chunk:text <file>`). Store results as `.jsonl` with fields
     `{ "chunk_id", "source_path", "content" }`.
   - Flag glossary-style sections separately for targeted retrieval prompts.
4. **Quality review**
   - Spot check a random sample of chunks for extraction noise, diagrams that
     need manual transcription, and citation references.
   - Update the provenance log in `data/knowledge_base/README.md` with
     conversion notes and outstanding fixes.

## Embedding & retrieval integration

- Generate embeddings with the standard pipeline
  (`npm run embeddings:build knowledge_base/books`). Store vectors in pgvector
  when online or FAISS/Chroma locally.
- Add metadata attributes: `category`, `author`, `publication_year`, and
  `strategy_tags` so retrieval filters can align textual insights with market
  regimes.
- Refresh the knowledge index once all categories are processed. Capture the
  resulting manifest (number of chunks, embedding dimensionality, checksum)
  under `reports/knowledge_base/`.
- Wire the retrieval service to prioritise:
  1. Strategy primers (notes, articles) for quick contextual grounding.
  2. Deep dives from books/research when longer context windows are available.

## Reinforcement & evaluation loop

Blend textual knowledge with numeric training to reward theory-aligned
execution.

- Define the reward function as `R = α·Performance + β·Knowledge_Alignment`,
  where the second term measures citation-backed strategy usage (e.g., Dow
  Theory adherence, Wyckoff accumulation markers).
- Instrument backtests to log which knowledge chunks were consulted before
  trades. Use the logs to compute the knowledge alignment score.
- Schedule periodic reviews that compare trading telemetry with referenced
  materials. Feed summaries back into `knowledge_base/notes/` as living
  documents.

## Operational checklist

- [ ] Metadata snapshot refreshed in `docs/onedrive-shares/` for the latest
      upload.
- [ ] Raw files mirrored under `data/knowledge_base/` with category parity.
- [ ] Clean text chunks stored in `processed/` directories and documented.
- [ ] Embedding index rebuilt and registered in the retrieval service.
- [ ] Reward shaping dashboards updated with the latest knowledge alignment
      metrics.
