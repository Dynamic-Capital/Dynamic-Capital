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
