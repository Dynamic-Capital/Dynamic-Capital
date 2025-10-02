# IQM Academy Cheat Sheets Integration

## Overview

The original IQM Academy cheat sheets repository contained large SVG assets that
inflated this project's Git history. Instead of keeping those artifacts under
version control, we provide a small helper script that fetches or updates the
upstream repository on demand.

## Usage

Run the synchronization script whenever you need the cheat sheets locally:

```bash
deno run -A scripts/sync-iqm-cheatsheets.ts
```

The script stores the repository in `third_party/iqm-academy-cheat-sheets/`,
which is ignored by Git. Subsequent executions update the checkout in place,
ensuring you always have the latest files without bloating this repository.

## Rationale

- **Lean history** – avoids tracking multi-megabyte SVG assets inside the main
  repository.
- **Deterministic updates** – the script always resets the checkout to the
  latest `main` branch.
- **Simple workflow** – mirrors the previous "clone" behavior with a single
  command.
