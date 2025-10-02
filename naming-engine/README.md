# Naming Engine

Optimised utilities for maintaining a shared dictionary of short codes and
semantic names across Dynamic Capital projects.

## Features

- ⚡️ Zero-allocation lookups via pre-computed maps.
- 🧠 Semantic short-code generation with deterministic variants.
- 🛠️ CLI that supports dry-runs, directory traversal, and timestamped backups.

## Quick start

```bash
npm install
npm run replace -- --dry-run examples
```

Use the `--dry-run` flag to preview replacements. Omit it to write the changes
in place. Pass directories or individual files as targets.

### Options

| Flag         | Description                                    |
| ------------ | ---------------------------------------------- |
| `--dry-run`  | Preview replacements without editing files.    |
| `--backup`   | Create timestamped backups before writing.     |
| `--silent`   | Suppress informational logs.                   |

## Extending the schema

1. Add new entries to [`naming.schema.json`](./naming.schema.json).
2. Import helpers from [`engine/index.ts`](./engine/index.ts) for quick lookups.
3. Use [`generateShortName`](./engine/utils.ts) when deriving new codes.

Remember to run `npm run replace` within this package directory so that the
local `tsconfig.json` is used.
