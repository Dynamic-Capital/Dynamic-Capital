# Memory Core Directory

This directory tracks the external storage locations that host long-term memory
corpora for the Dynamic Capital stack. Each entry lists the provider, access
link, and the storage limit to help operators allocate uploads without
overfilling the drives.

## Active Memory Cores

| Core          | Provider     | Access                                                                                 | Capacity |
| ------------- | ------------ | -------------------------------------------------------------------------------------- | -------- |
| Memory Core 1 | Google Drive | <https://drive.google.com/drive/folders/1IX6IU758PHpK09cDeXiAe-CQo6mnN-T2?usp=sharing> | 20 GB    |
| Memory Core 2 | Google Drive | <https://drive.google.com/drive/folders/1erZ2feAOMU7KJDsHDoTgE86hgrtAYFMn?usp=sharing> | 50 GB    |
| Memory Core 3 | OneDrive     | <https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg>  | 50 GB    |

## Usage Notes

- Respect the capacity limit for each core to avoid sync failures.
- When adding new datasets, update this directory so downstream automations can
  locate the relevant corpus quickly.
- If access permissions change, include a short note next to the affected entry.

## Sync & Export Automation

- Operational parameters for these cores live in
  `config/memory-sync.config.json` which captures observed latency, throughput,
  and backlog levels for each location.
- Generate an optimized export schedule with
  `deno run -A scripts/ops/optimize-memory-sync.ts`. Pass `--json` to emit the
  plan in machine-readable form or `--config` to point at an alternate
  configuration snapshot.
