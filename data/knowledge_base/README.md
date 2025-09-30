# Knowledge Base Drops

This directory mirrors curated corpora published to the shared OneDrive
`knowledge_base/` folder. Each subdirectory corresponds to a dated drop and
contains the artifacts required for retrieval-augmented training.

## 2025-10-15 — Knowledge Base Expansion

- **Source manifest:** `docs/onedrive-shares/evlumlqt-folder.metadata.json`
- **Supabase mirror:** `public.one_drive_assets/knowledge_base/2025-10-15/*`
- **Description:** Added playbook documentation, prompt templates, and
  evaluation snapshots for the October knowledge base refresh.

### Files

| Relative path                     | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `2025-10-15/modeling-overview.md` | Outline of the multi-pass retrieval strategy used in October experiments. |
| `2025-10-15/rag-prompts.csv`      | Prompt templates paired with retrieval hints for the updated corpus.      |
| `2025-10-15/eval-window.json`     | Evaluation window metadata for replaying fine-tuning checkpoints.         |

Record additional drops by appending new sections that include the provenance
and file descriptions from the corresponding OneDrive manifest.

## Research — Staging Area Sync

- **Source location:** `OneDrive\\DynamicAI_DB\\knowledge_base\\research`
- **Supabase mirror (planned):** `public.one_drive_assets/knowledge_base/research/*`
- **Description:** New research datasets have been uploaded to OneDrive and are
  waiting on checksum validation before we promote them into the shared
  retrieval corpus. Track synchronization steps and dataset notes in the
  `research/README.md` control file.

### Files

| Relative path        | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `research/README.md` | Mirroring checklist plus dataset registry for the research drop. |
| `research/processed/dhivehi_training_corpus.jsonl` | Preprocessed Dhivehi Radheef corpus ready for instruction tuning. |
| `research/training_runs/dhivehi_radheef_v1.json` | Dynamic trainer readiness summary for the Dhivehi corpus fine-tune. |
| `research/manifest.json` | Structured manifest enumerating the staged research datasets. |
