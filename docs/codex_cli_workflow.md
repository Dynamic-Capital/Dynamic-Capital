# Codex CLI Workflow Helper

The Lovable Codex CLI exports UI updates directly into this repository. The
`scripts/codex-workflow.js` helper centralizes the post-export automation so you
can reproduce Codex's build steps locally and keep your environment in sync.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run codex:post-pull` | Install dependencies, sync `.env.local`, validate core environment variables, and execute the combined `lovable-build.js` pipeline. |
| `npm run codex:dev` | Optionally sync `.env.local` before delegating to `lovable-dev.js`, which runs preflight checks and launches the Next.js dev server. |
| `npm run codex:build` | Run the Lovable production build locally (Next.js dashboard + Telegram mini app). |
| `npm run codex:verify` | Execute `scripts/verify/verify_all.sh` for the full repository verification sweep. |

Each command is a thin wrapper around `scripts/codex-workflow.js MODE` so you can
still pass additional flags via `npm run codex:<mode> -- --flag`.

## Flags

Common flags accepted by the helper:

- `--no-install` – skip `npm install` when you already have dependencies.
- `--no-sync` – prevent the helper from running `npm run sync-env`.
- `--no-env-check` – skip the `scripts/check-env.ts` guard (not recommended).
- `--no-build` – omit the Lovable build step.
- `--build-optional` – treat build failures as warnings.
- `--verify` – run `npm run verify` after the post-pull steps.
- `--dry-run` – preview the steps without executing commands.
- `--reset-issues` – clear the cached failure history before running tasks again.

Run `scripts/codex-workflow.js --help` to see the full list of options.

The helper keeps a small JSON file (`.codex-workflow-state.json`, ignored by
Git) that tracks which steps failed recently. When a task fails multiple times,
the CLI surfaces targeted troubleshooting tips before the next run. Use
`--reset-issues` if you want to discard that history and silence the reminders.

## Suggested workflow

```bash
# After exporting from Codex
npm run codex:post-pull -- --verify

# For local iteration while Codex keeps the preview running
npm run codex:dev -- --no-sync

# Before pushing back to GitHub or mirroring Codex deploys
npm run codex:build
```

This workflow keeps the Lovable environment, the local repo, and GitHub in lock
step while providing a single entry point for Codex-specific automation.
