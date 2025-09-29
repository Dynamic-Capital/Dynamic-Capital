# Dhivehi Corpus Extraction

## Overview

The `ml/dhivehi_corpus_extractor.py` utility scrapes dictionary entries from
[Radheef](https://www.radheef.info/) to expand Dynamic Capital's Dhivehi
language corpora. Entries are normalised into JSONL records compatible with
our preprocessing and tokenizer pipelines.

Each record captures the Dhivehi headword, the Radheef definition, and a
minimal context trail referencing the source URL and page number. The samples
are tagged as Dhivehi dictionary data so downstream components can weight or
filter them independently.

## Usage

```bash
python ml/dhivehi_corpus_extractor.py \
  --output data/dhivehi_radheef.jsonl \
  --start-page 1 \
  --end-page 25 \
  --delay 0.4 \
  --batch-size 200
```

Arguments:

- `--output` (Path): destination JSONL file. Parent directories are created
  automatically. Defaults to `data/dhivehi_radheef.jsonl`.
- `--start-page` (int): first Radheef page (1-indexed) to request. Defaults to 1.
- `--end-page` (int, optional): optional last page to request. When omitted the
  script follows pagination until the last discovered page.
- `--delay` (float): polite delay between page fetches in seconds. Defaults to
  `0.4` seconds to avoid hammering the public endpoint.
- `--batch-size` (int): number of entries to buffer before writing progress
  batches. Defaults to streaming entries one by one.

The extractor streams entries page by page, flushing batches to disk as it
progresses, and halts if an HTTP error occurs or no dictionary cards are
detected. Adjust the delay upwards if you encounter rate limiting.

## Sample dataset

A thin slice of the Radheef corpus (first page) is stored at
`data/dhivehi_radheef_sample.jsonl`. This is a convenient fixture for unit tests
or local experimentation when the full crawl is unnecessary.

## Downstream processing

Use the existing preprocessing pipeline to fold the extracted corpus into the
training mix:

```bash
python ml/preprocess_corpus.py \
  --input data/dhivehi_radheef_sample.jsonl \
  --output data/dhivehi_corpus_prepared.jsonl \
  --languages dv en
```

The resulting JSONL file is compatible with `ml/tokenizer_builder.py` and any
fine-tuning scripts that expect the standard `prompt`/`response`/`context`
layout.
