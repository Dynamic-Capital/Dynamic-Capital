# Codex CLI Workflow Helper

The Lovable Codex CLI exports UI updates directly into this repository. The
`scripts/codex-workflow.js` helper centralizes the post-export automation so you
can reproduce Codex's build steps locally and keep your environment in sync.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run codex:post-pull` | Install dependencies, sync `.env`/`.env.local`, validate core environment variables, and execute the combined `lovable-build.js` pipeline. |
| `npm run codex:dev` | Optionally sync `.env`/`.env.local` before delegating to `lovable-dev.js`, which runs preflight checks and launches the Next.js dev server. |
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
- `--agent <id>` – scope failure history and reminders to a specific Codex agent (also via `CODEX_AGENT_ID`).
- `--no-shared-cache` – skip the shared dependency cache when coordinating with other agents.

Run `scripts/codex-workflow.js --help` to see the full list of options.

The helper keeps a small JSON file (`.codex-workflow-state.json`, ignored by
Git) that tracks which steps failed recently. Each `--agent` gets its own
failure history so multiple Codex assistants can run the workflow without
overwriting each other's reminders. When a task fails multiple times, the CLI
surfaces targeted troubleshooting tips before the next run. Use `--reset-issues`
if you want to discard that history and silence the reminders.

To speed up cooperative runs, the helper fingerprints `package-lock.json` and
shares `npm install` successes between agents. Skip the shared cache with
`--no-shared-cache` (or `CODEX_DISABLE_SHARED_CACHE=1`) whenever you need a
clean install.

### Adaptive issue detection

Beyond the static troubleshooting tips, the helper now inspects command output
for common failure signatures—missing npm scripts, `MODULE_NOT_FOUND`
exceptions, `ENOENT` file paths, and shell `command not found` errors. Whenever
it recognizes one of these patterns, it prints focused next steps (e.g. recreate
Codex-exported scripts, add the missing dependency with `npm install`, or create
the referenced file) so new issues can be resolved without manually scanning the
logs.

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
