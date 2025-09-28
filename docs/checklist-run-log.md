# Checklist Runner Log

This log captures useful invocations of the internal checklist tooling along with
notes on the resulting output. Use it as a quick reference when deciding which
entry point to reach for.

## Quick Reference

| Scenario | Command | Notes |
| --- | --- | --- |
| Fast local runs that bypass npm wrappers. | `node scripts/run-checklists.js --list` | Emits the raw listing immediately. Use when iterating on the script itself. |
| Runs that require project hooks or environment bootstrapping. | `npm run checklists -- --list` | Executes through npm so lifecycle hooks (`prechecklists`, `.env` loading, etc.) run automatically. |
| Need usage guidance before choosing a subcommand. | `npm run checklists` | Shows help text describing `--list`, named checklists, and additional options. |

## 2024-02-24 — Listing Available Checklists

The first comparison between the direct Node entry point and the npm wrapper highlighted a few practical differences:

- **Node script** — streams the full checklist metadata (name, description, references, and library entries) without extra framing.
- **npm wrapper** — mirrors the same listing while ensuring project-level environment variables and npm lifecycle hooks fire before execution.

### Output Snapshot

```text
Available checklists:

- coding-efficiency: Coding Efficiency Checklist
    Automation hooks referenced in the coding efficiency checklist.
    Reference: docs/coding-efficiency-checklist.md
    • sync-env — Sync .env and .env.local with .env.example (npm run sync-env)
    • repo-test — Run repository test suite (npm run test)
    • fix-and-check — Run repo fix-and-check script (bash scripts/fix_and_check.sh)
    • verify — Run aggregated verification suite (npm run verify)
```

> The listing continues for every checklist, surfacing each description,
> reference document, and associated tasks (including optional items where noted).

## 2025-09-28 — Current Checklist Catalog Verification

- Command: `node scripts/run-checklists.js --list`
- Purpose: Confirm the latest catalog of checklists and surface any newly added
  entries or task descriptions.
- Output summary: Matches the snapshot above and now includes new checklist families such as:
  - `dynamic-ui`
  - `variables-and-links`
  - `go-live`
  - `setup-followups`
  Each entry links to reference documentation and enumerates the required tasks.

## 2025-09-28 — Go-Live Checklist Dry Run

- Command: `node scripts/run-checklists.js --checklist go-live --dry-run`
- Purpose: Preview the go-live verification flow without invoking external
  dependencies while confirming the required task inventory.
- Output summary: Shows a single required task that checks the Telegram webhook
  configuration and links back to the primary documentation for deeper
  instructions.

### Output Snapshot

```text
[checklists] TELEGRAM_BOT_TOKEN missing; using fixtures/telegram-webhook-info.json for webhook checks.
Planned tasks (1):

1. Check Telegram webhook configuration (deno run -A scripts/check-webhook.ts)
   Command: deno run -A scripts/check-webhook.ts
   Type: required
   Sources: go-live
   References: docs/dynamic-capital-checklist.md
   Notes: Verifies that the Telegram bot webhook is reachable and configured with the expected URL.

Dry run enabled. No commands were executed.
```

## 2024-02-24 — Viewing CLI Help

- Command: `npm run checklists`
- Purpose: Displays usage guidance and supported options for the checklist
  runner.
- Output summary: Shows the default help banner and reminds you to supply
  `--list`, a checklist name, or other parameters to run targeted entries.
