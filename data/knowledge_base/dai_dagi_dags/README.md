# DAI/DAGI/DAGS Knowledge Base Metadata

This directory captures a metadata-only snapshot of the Google Drive corpus shared via
<https://drive.google.com/drive/folders/1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB>.
The files were mirrored under `/tmp/dai_dagi_dags_drive` and classified into the
Dynamic AI (DAI), Dynamic AGI (DAGI), and Dynamic AGS (DAGS) domains to
support downstream ingestion planning.

## Contents

- `metadata_summary.json` &mdash; High-level counts, byte volumes, extension
  tallies, record totals, and dataset paths for each Dynamic AI, Dynamic AGI,
  and Dynamic AGS domain derived from the 115 mirrored files.
- `processed/dai_metadata.jsonl` &mdash; Per-file metadata records for trading and
  telemetry artefacts aligned with the DAI knowledge base.
- `processed/dagi_metadata.jsonl` &mdash; Metadata records for cross-domain
  research, psychology, and behavioural science references mapped to DAGI.
- `processed/dags_metadata.jsonl` &mdash; Governance and compliance documents
  originating from the Law subdirectory, mapped to DAGS.

## Reproduction

```bash
pip install gdown
python - <<'PY'
import importlib
module = importlib.import_module('gdown.download_folder')
module.MAX_NUMBER_FILES = 1000
module.download_folder(
    url="https://drive.google.com/drive/folders/1F2A1RO8W5DDa8yWIKBMos_k32DQD4jpB?usp=sharing",
    output="/tmp/dai_dagi_dags_drive",
    quiet=False,
)
PY
python scripts/knowledge_base/build_dai_dagi_dags_metadata.py --input /tmp/dai_dagi_dags_drive --output data/knowledge_base/dai_dagi_dags
```

The helper script normalises identifiers, computes SHA-256 checksums, and
renders JSONL slices per domain.
