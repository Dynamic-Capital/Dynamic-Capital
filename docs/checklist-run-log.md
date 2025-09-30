# Checklist Runner Log

This log captures useful invocations of the internal checklist tooling along
with notes on the resulting output. Reference it when deciding which entry point
is the best fit for the task at hand.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Command Playbooks](#command-playbooks)
  - [2025-09-28 — Current Checklist Catalog Verification](#2025-09-28--current-checklist-catalog-verification)
  - [2025-09-28 — Go-Live Checklist Dry Run](#2025-09-28--go-live-checklist-dry-run)
  - [2024-02-24 — Listing Available Checklists](#2024-02-24--listing-available-checklists)
  - [2024-02-24 — Viewing CLI Help](#2024-02-24--viewing-cli-help)

## Quick Reference

| Scenario                                                      | Command                                                       | When to Use                                                                                    | Output Highlights                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Fast local runs that bypass npm wrappers.                     | `node scripts/run-checklists.js --list`                       | Iterate on the script directly without lifecycle hooks or npm overhead.                        | Streams the checklist metadata immediately in plain text.                        |
| Runs that require project hooks or environment bootstrapping. | `npm run checklists -- --list`                                | Respect npm lifecycle hooks (`prechecklists`, `.env` loading, etc.) while listing the catalog. | Mirrors the raw list while honoring repository setup requirements.               |
| Preview a specific checklist without executing tasks.         | `node scripts/run-checklists.js --checklist <name> --dry-run` | Validate the task inventory before running the automation in CI or production.                 | Prints the planned tasks, references, and notes without triggering side effects. |
| Need usage guidance before choosing a subcommand.             | `npm run checklists`                                          | Remind yourself of the supported options or share quick guidance with teammates.               | Displays the built-in help banner with usage examples.                           |

## Command Playbooks

### 2025-10-16 — Modular Architecture Checklist Run

**Command**

```bash
npm run checklists -- --checklist dynamic-modular-architecture
```

**Purpose**

Summarize the implementation and verification checklists embedded in
`docs/dynamic-capital-modular-architecture.md` so teams can capture status in
one step.

**Highlights**

- Parses the implementation and verification sections, ensuring each contains at
  least one checklist item.
- Reports completion counts and enumerates the individual tasks with an `OPEN`
  or `DONE` label for quick review.
- Fails fast when headings or checklist items are missing, guarding against
  accidental documentation regressions.

### 2025-10-16 — Automated Trading Build Checklist Run

**Command**

```bash
npm run checklists -- --checklist build-implementation
```

**Purpose**

Generate a consolidated status snapshot for the Automated Trading System Build
Checklist so operators can audit delivery across every pipeline layer from a
single command.

**Highlights**

- Parses each numbered section (TradingView signals through end-to-end
  validation) and validates that they retain at least one checklist item.
- Prints section-level completion totals alongside the enumerated tasks and
  their `OPEN`/`DONE` state labels.
- Surfaces an error if the document loses its numbered headings, protecting the
  automation contract relied on by the checklist runner.

### 2025-10-16 — Knowledge Base Drop Verification

**Command**

```bash
npm run checklists -- --checklist knowledge-base-drop
```

**Purpose**

Run the automation-backed knowledge base checklist to validate the latest
OneDrive drop against the local mirror and provenance documentation.

**Highlights**

- Executes `knowledge-base-verify`, which parses
  `docs/onedrive-shares/evlumlqt-folder.metadata.json` and compares it with the
  files under `data/knowledge_base/`.
- Confirms the provenance table in `data/knowledge_base/README.md` references
  every artefact recorded in the metadata snapshot.
- Output reported:
  `Validated 3 knowledge base artefacts against local mirror and
  provenance README.`

### 2025-09-28 — Current Checklist Catalog Verification

**Command**

```bash
node scripts/run-checklists.js --list
```

**Purpose**

Confirm the latest catalog of checklists and surface any newly added entries or
task descriptions.

**Highlights**

- Matches the snapshot below and now includes additional checklist families such
  as `dynamic-ui`, `variables-and-links`, `go-live`, and `setup-followups`.
- Each entry links to the reference documentation and enumerates the associated
  required tasks.

### 2025-09-28 — Go-Live Checklist Dry Run

**Command**

```bash
node scripts/run-checklists.js --checklist go-live --dry-run
```

**Purpose**

Preview the go-live verification flow without invoking external dependencies
while confirming the required task inventory.

**Highlights**

- Surfaces a single required task that checks the Telegram webhook
  configuration.
- References the primary documentation for deeper instructions and stores the
  task definition under the `go-live` checklist.
- Demonstrates the dry-run experience so operators know what to expect before
  executing the checklist in production.

**Output Snapshot**

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

### 2024-02-24 — Listing Available Checklists

**Command**

```bash
node scripts/run-checklists.js --list
```

**Purpose**

Compare the direct Node entry point with the npm wrapper and document the
differences that matter during local development.

**Highlights**

- Node script streams the full checklist metadata (name, description,
  references, and library entries) without extra framing.
- npm wrapper mirrors the same listing while ensuring project-level environment
  variables and npm lifecycle hooks fire before execution.

**Output Snapshot**

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
> reference document, and associated tasks (including optional items where
> noted).

### 2024-02-24 — Viewing CLI Help

**Command**

```bash
npm run checklists
```

**Purpose**

Display usage guidance and supported options for the checklist runner.

**Highlights**

- Shows the default help banner and reminds you to supply `--list`, a checklist
  name, or other parameters to run targeted entries.
- Helpful when onboarding teammates or refreshing your memory of supported
  commands.
