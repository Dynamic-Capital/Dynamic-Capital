# Knowledge Base Mirror

This directory stores the local mirror of datasets synchronized from the shared
OneDrive `knowledge_base/` folder tracked in
`docs/onedrive-shares/evlumlqt-folder.md`. The mirror allows model-training jobs
to pin to a reproducible snapshot even when collaborators rotate the upstream
share contents.

## Current snapshot

No datasets have been ingested in this environment yet. Replace this note with a
summary table (filename, source hash, sync date, intended usage) after mirroring
files from OneDrive.

## Sync log

| Date (UTC) | Action                         | Notes                                                                                 |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| 2025-02-14 | Initialized mirror scaffolding | Created local directory and placeholder README so future syncs have a provenance log. |

## Operating notes

- Store raw datasets under subdirectories that match the OneDrive structure.
- Keep large binaries in LFS or external storage if they exceed repository
  limits; record pointers here instead of committing oversized files.
- Update this README whenever you refresh the mirror so teammates can correlate
  training runs with the datasets they reference.
