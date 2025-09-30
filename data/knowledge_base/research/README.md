# Research Knowledge Base Staging

This folder documents the research-oriented corpora that were recently added to
`OneDrive\\DynamicAI_DB\\knowledge_base\\research`. Use it as the control point
for mirroring the new material into the Dynamic Capital knowledge base.

## Source information

- **OneDrive path:** `OneDrive\\DynamicAI_DB\\knowledge_base\\research`
- **Supabase mirror (planned):** `public.one_drive_assets/knowledge_base/research/*`
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

| Dataset slug | Description | Notes |
| ------------ | ----------- | ----- |
| `dhivehi_radheef_v1` | Deduplicated Dhivehi Radheef dictionary slices prepared for bilingual instruction tuning. | Processed corpus at `processed/dhivehi_training_corpus.jsonl`; training telemetry in `training_runs/dhivehi_radheef_v1.json`. |
| `market_structure_notes_v1` | Refined market-structure corpus with tier hierarchy, execution discipline, timeframe playbooks, and top-down workflow quick references. | Processed corpus at `processed/trading_market_structure_corpus.jsonl`. |

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

Keep this document in sync with the upstream OneDrive folder so that future
knowledge base drops reflect the new research materials.
