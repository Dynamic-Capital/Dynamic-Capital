# Knowledge Base Training Drop Checklist

The shared OneDrive workspace now includes a `knowledge_base/` directory that
houses freshly uploaded corpora for model fine-tuning. Treat the folder as the
source of truth for knowledge-grounded training datasets that should be mirrored
into Supabase Storage and the local repository when preparing new runs.

## Access overview

- **OneDrive location:** `.../knowledge_base/` inside the
  `EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg` share already tracked in
  `docs/onedrive-shares/evlumlqt-folder.md`.
- **Contents:** Expect curated markdown, CSV, and JSON artefacts that expand the
  long-form knowledge base used for retrieval-augmented training.
- **Ownership:** Model engineering team. Announce additions in the #ml-updates
  channel alongside a brief describing intended use.

## Sync workflow

1. **List the drop**
   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   tsx scripts/onedrive/list-drive-contents.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg"
   ```
   - Inspect the tree for the `knowledge_base/` node and note new filenames and
     sizes.
2. **Snapshot metadata**
   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg" \
     docs/onedrive-shares/evlumlqt-folder.metadata.json
   ```
   - Commit the refreshed metadata file so the repo mirrors the share inventory.
3. **Mirror to storage**
   - Run the existing Supabase ↔ OneDrive sync (`npm run sync:onedrive` if
     available) or trigger the Power Automate flow responsible for dataset
     promotion.
   - Confirm `public.one_drive_assets` contains the `knowledge_base/` entries
     via Supabase SQL.
4. **Ingest locally**
   - Copy the new files into `data/knowledge_base/` (create the directory if it
     does not exist) while maintaining subfolders from OneDrive.
   - Record provenance in `data/knowledge_base/README.md` with dataset versions
     and intended prompts.

## Training integration

- Update experiment configs under `dynamic_trainer/` or `ml/` to point to the
  new local mirror when running fine-tuning or embedding refresh jobs.
- Rebuild vector indexes after syncing by executing the pipeline that feeds the
  retrieval layer (for example, `npm run embeddings:refresh knowledge_base`).
- Capture evaluation metrics and push summaries back into the `knowledge_base/`
  folder so the OneDrive mirror remains the long-term archive.

### Hardening enhancements (November 2025)

- Follow the
  [knowledge base enrichment checklist](../data/knowledge_base/2025-11-07/enrichment-checklist.md)
  before promoting artefacts from staging.
- Review telemetry in
  [`ingestion-metrics.json`](../data/knowledge_base/2025-11-07/ingestion-metrics.json)
  and log any deviations from the recall (≥ 0.92) or precision (≥ 0.88)
  thresholds.
- Run the regression prompts defined in the
  [`rag-sanity-playbook.md`](../data/knowledge_base/2025-11-07/rag-sanity-playbook.md)
  to confirm retrieval quality remained within the allowed delta.

## Governance checklist

- [ ] Metadata snapshot committed after every drop.
- [ ] Supabase manifest shows the new keys under `knowledge_base/`.
- [ ] Local repo `data/knowledge_base/` folder updated and documented.
- [ ] Training run logs reference the corresponding OneDrive dataset version.
