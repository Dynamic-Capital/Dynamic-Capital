# Dhivehi Corpus Extraction

## Overview

The `ml/dhivehi_corpus_extractor.py` utility scrapes dictionary entries from
[Radheef](https://www.radheef.info/) to expand Dynamic Capital's Dhivehi
language corpora. Entries are normalised into JSONL records compatible with our
preprocessing and tokenizer pipelines.

Each record captures the Dhivehi headword, the Radheef definition, and a minimal
context trail referencing the source URL and page number. The samples are tagged
as Dhivehi dictionary data so downstream components can weight or filter them
independently.

## Usage

```bash
python ml/dhivehi_corpus_extractor.py \
  --output data/dhivehi_radheef.jsonl \
  --start-page 1 \
  --end-page 25 \
  --delay 0.4 \
  --batch-size 200 \
  --max-batches 25
```

Arguments:

- `--output` (Path): destination JSONL file. Parent directories are created
  automatically. Defaults to `data/dhivehi_radheef.jsonl`.
- `--start-page` (int): first Radheef page (1-indexed) to request. Defaults
  to 1.
- `--end-page` (int, optional): optional last page to request. When omitted the
  script follows pagination until the last discovered page.
- `--delay` (float): polite delay between page fetches in seconds. Defaults to
  `0.4` seconds to avoid hammering the public endpoint.
- `--batch-size` (int): number of entries to buffer before writing progress
  batches. Defaults to streaming entries one by one.
- `--max-batches` (int): optional safety rail that stops the extractor after the
  specified number of write batches. Combine with `--batch-size` to crawl in
  fixed chunks (for example 25 batches at a time) and inspect progress before
  resuming.

The extractor streams entries page by page, flushing batches to disk as it
progresses, and halts if an HTTP error occurs, the optional batch cap is
reached, or no dictionary cards are detected. Adjust the delay upwards if you
encounter rate limiting. When resuming after hitting a batch cap, you can repeat
the final processed page (`--start-page <last-page>`) to ensure no entries are
skipped.

## Sample dataset

A thin slice of the Radheef corpus (first page) is stored at
`data/dhivehi_radheef_sample.jsonl`. This is a convenient fixture for unit tests
or local experimentation when the full crawl is unnecessary.

## Bakurube Qur'an translation corpus

The Bakurube Dhivehi Qur'an translation is mirrored on the Internet Archive.
Use `ml/bakurube_corpus_extractor.py` to download the published PDF volumes,
normalise the Arabic ↔ Dhivehi verse pairs, and export them into the Dynamic
Capital JSONL schema. Example invocation:

```bash
python ml/bakurube_corpus_extractor.py \
  --output data/dhivehi_bakurube_translation.jsonl \
  --summary data/dhivehi_bakurube_translation_summary.json \
  --volume 1-15 \
  --volume 16-30
```

Key details:

- The extractor focuses on verse lines that contain explicit Arabic and Dhivehi
  segments separated by "=", yielding high confidence translation pairs.
- Duplicate pairs are skipped automatically and reported in the optional summary
  JSON file.
- Each record is tagged with `religious`, `quran`, `dhivehi`, `translation`, and
  `bakurube` so downstream pipelines can filter or weight the dataset.

## Available Radheef batches

For larger scale training jobs you can stitch together the staged exports below
to cover contiguous portions of the dictionary crawl:

- `data/dhivehi_radheef_pages_026_050.jsonl`
- `data/dhivehi_radheef_pages_051_100.jsonl`
- `data/dhivehi_radheef_pages_101_200.jsonl`
- `data/dhivehi_radheef_pages_201_499.jsonl`
- `data/dhivehi_radheef_pages_500_699.jsonl`
- `data/dhivehi_radheef_pages_699_800.jsonl`
- `data/dhivehi_radheef_pages_801_999.jsonl`
- `data/dhivehi_radheef_pages_999_1000.jsonl`
- `data/dhivehi_radheef_pages_1001_1199.jsonl`
- `data/dhivehi_radheef_pages_1200_1299.jsonl`
- `data/dhivehi_radheef_pages_1300_1399.jsonl`
- `data/dhivehi_radheef_pages_1400_1499.jsonl`
- `data/dhivehi_radheef_pages_1500_1588.jsonl`

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
