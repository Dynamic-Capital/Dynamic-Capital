# Research Knowledge Base Staging

This folder documents the research-oriented corpora that were recently added to
`OneDrive\\DynamicAI_DB\\knowledge_base\\research`. Use it as the control point
for mirroring the new material into the Dynamic Capital knowledge base.

## Source information

- **OneDrive path:** `OneDrive\\DynamicAI_DB\\knowledge_base\\research`
- **Supabase mirror (planned):**
  `public.one_drive_assets/knowledge_base/research/*`
- **Status:** Assets were uploaded to OneDrive and are awaiting checksum
  verification before being copied into Supabase cold storage.

## Mirroring checklist

1. Authenticate against the DynamicAI OneDrive tenant and navigate to the
   `knowledge_base/research` folder.
2. Download the latest dataset bundle(s) and record their filenames plus SHA-256
   checksums in `manifest.json` (create the file if it does not yet exist).
3. Store the raw archives in the Supabase bucket path noted above and extract
   text-forward assets into the RAG preprocessing pipeline.
4. Update the table below with a short description of each dataset so downstream
   teams can request the appropriate slices for their experiments.

## Dataset registry

| Dataset slug                 | Description                                                                                                                                    | Notes                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `dhivehi_radheef_v1`         | Deduplicated Dhivehi Radheef dictionary slices prepared for bilingual instruction tuning.                                                      | Processed corpus at `processed/dhivehi_training_corpus.jsonl`; training telemetry in `training_runs/dhivehi_radheef_v1.json`.                  |
| `market_structure_notes_v1`  | Refined market-structure corpus with tier hierarchy, execution discipline, timeframe playbooks, and top-down workflow quick references.        | Processed corpus at `processed/trading_market_structure_corpus.jsonl`.                                                                         |
| `nemotron_personas_japan_v1` | One million Japanese-language synthetic personas aligned to census demographics, geography, and cultural context for sovereign AI prototyping. | Source maintained on Hugging Face at `nvidia/Nemotron-Personas-Japan` (CC BY 4.0). Export with `python ml/extract_nemotron_personas_japan.py`. |
| `dynamic_trading_knowledge_base_v1` | Mirrored PDF corpus for the trading knowledge base with page-level extractions and table captures. | Drop PDFs into `dynamic_trading/raw/` and run `python tools/dynamic_trading_corpus.py` to build `dynamic_trading/processed/dynamic_trading_knowledge.jsonl`. |
| `newspaper_archive_collection` | Internet Archive collection identifier `newspaperarchive` spanning digitized newspaper issues under the `newspapers` and `texts` umbrellas. | Export metadata with `python ml/extract_newspaper_archive_collection.py --output processed/newspaper_archive_inventory.jsonl` (optionally adding `--limit` for sampling) before mirroring into Supabase cold storage or local staging. |
| `holy_quran_english_v1` | Page-level export of the Maulvi Sher Ali English Holy Quran translation with metadata per PDF page. | Run `python ml/extract_holy_quran_english.py --output data/knowledge_base/research/processed/holy_quran_english.jsonl --summary data/knowledge_base/research/processed/holy_quran_english_summary.json --sample data/knowledge_base/research/processed/holy_quran_english_sample.jsonl`. |

### Extraction helpers

Install the lightweight ML dependencies and materialise the Nemotron personas
into JSONL form with:

```bash
pip install -r ml/requirements.txt
python ml/extract_nemotron_personas_japan.py \
  --limit 3600 \
  --output data/knowledge_base/research/processed/nemotron_personas_japan.jsonl \
  --summary data/knowledge_base/research/processed/nemotron_personas_japan_summary.json
```

Adjust `--limit` (or omit it) depending on whether you need a quick sample or
the full six-million persona corpus. The summary report captures metadata counts
and deduplication statistics for downstream validation.

## Latest training pass

Execute the following commands after syncing the OneDrive drop to reproduce the
current training artefacts:

```bash
python ml/preprocess_corpus.py \
  --input data/dhivehi_radheef_sample.jsonl data/dhivehi_radheef_pages_026_050.jsonl \
  --output data/knowledge_base/research/processed/dhivehi_training_corpus.jsonl \
  --languages en dv \
  --min-characters 64

python ml/research_corpus_trainer.py \
  --dataset data/knowledge_base/research/processed/dhivehi_training_corpus.jsonl \
  --output data/knowledge_base/research/training_runs/dhivehi_radheef_v1.json \
  --objective "knowledge-base-research-dhivehi"
```

The resulting readiness summary recommends promoting the candidate checkpoint
while tightening loss-focused regularisation before scaling further runs.

### Internet Archive metadata export

Generate a scoped inventory of the Newspaper Archive collection to plan
mirroring and downstream OCR with:

```bash
python ml/extract_newspaper_archive_collection.py \
  --limit 1000 \
  --output data/knowledge_base/research/processed/newspaper_archive_inventory.jsonl \
  --summary data/knowledge_base/research/processed/newspaper_archive_inventory_summary.json
```

The script streams the Internet Archive advanced search index, emitting each
issue as a JSONL document. Use `--limit` to create smaller samples (a 100-row
snapshot ships at `processed/newspaper_archive_inventory_sample.jsonl` for quick
inspection) or adjust `--query` for geography- or publisher-specific slices.

Keep this document in sync with the upstream OneDrive folder so that future
knowledge base drops reflect the new research materials.
