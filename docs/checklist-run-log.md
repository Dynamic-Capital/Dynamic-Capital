# Checklist Runner Log

This log captures useful invocations of the internal checklist tooling along
with notes on the resulting output. Reference it when deciding which entry point
is the best fit for the task at hand.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Command Playbooks](#command-playbooks)
  - [2025-10-17 — Modular Architecture Checklist Run](#2025-10-17--modular-architecture-checklist-run)
  - [2025-10-17 — Automated Trading Build Checklist Run](#2025-10-17--automated-trading-build-checklist-run)
  - [2025-10-01 — Modular Architecture Checklist Run](#2025-10-01--modular-architecture-checklist-run)
  - [2025-10-01 — Automated Trading Build Checklist Run](#2025-10-01--automated-trading-build-checklist-run)
  - [2025-10-16 — Modular Architecture Checklist Run](#2025-10-16--modular-architecture-checklist-run)
  - [2025-10-16 — Automated Trading Build Checklist Run](#2025-10-16--automated-trading-build-checklist-run)
  - [2025-10-16 — Stage 1 Onboard & Orient Checklist Run](#2025-10-16--stage-1-onboard--orient-checklist-run)
  - [2025-10-16 — Knowledge Base Drop Verification](#2025-10-16--knowledge-base-drop-verification)
  - [2025-09-28 — Current Checklist Catalog Verification](#2025-09-28--current-checklist-catalog-verification)
  - [2025-09-28 — Go-Live Checklist Dry Run](#2025-09-28--go-live-checklist-dry-run)
  - [2024-02-24 — Listing Available Checklists](#2024-02-24--listing-available-checklists)
  - [2024-02-24 — Viewing CLI Help](#2024-02-24--viewing-cli-help)

## Quick Reference

| Scenario                                                      | Command                                                       | When to Use                                                                                    | Output Highlights                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fast local runs that bypass npm wrappers.                     | `node scripts/run-checklists.js --list`                       | Iterate on the script directly without lifecycle hooks or npm overhead.                        | Streams the checklist metadata immediately in plain text.                                  |
| Runs that require project hooks or environment bootstrapping. | `npm run checklists -- --list`                                | Respect npm lifecycle hooks (`prechecklists`, `.env` loading, etc.) while listing the catalog. | Mirrors the raw list while honoring repository setup requirements.                         |
| Preview a specific checklist without executing tasks.         | `node scripts/run-checklists.js --checklist <name> --dry-run` | Validate the task inventory before running the automation in CI or production.                 | Prints the planned tasks, references, and notes without triggering side effects.           |
| Need usage guidance before choosing a subcommand.             | `npm run checklists`                                          | Remind yourself of the supported options or share quick guidance with teammates.               | Displays the built-in help banner with usage examples.                                     |
| Review the latest initiative status snapshot.                 | `./playbook`                                                  | Pull the newest `docs/status-updates` summary ahead of stand-ups or report prep.               | Prints the summary and follow-up actions; add `--section` to include desk-specific detail. |

### Automation exports

- Use `npm run checklists -- --automation governance --plan-export automation/logs/governance-plan.json --result-export automation/logs/governance-run.json`
  to bundle intelligence and trading loops into a single run with machine-readable artefacts.
- Run `./playbook --automate --export-dir automation/playbook` before leadership cadences to refresh timestamped Markdown snapshots for every initiative update.

## Command Playbooks

### 2025-02-13 — Dynamic AI Validation Checklist Run

**Command**

```bash
npm run checklists -- --checklist dai
```

**Purpose**

Exercise the Dynamic AI regression suites before updating persona prompts or
orchestration lobes, ensuring the Brain’s pipelines remain auditable.

**Highlights**

- Pytest executed the architecture checks across pipeline phases, residency
  guards, and telemetry validation (11 tests, all
  passing).【5f5071†L1-L17】【e4c75d†L1-L6】
- Persona and fusion coverage verified agent chaining, benchmarking surfaces,
  and lattice assembly in 36 passing tests, clearing the path for new prompt
  deployments.【3c4987†L1-L8】
- Checklist automation completed without manual intervention, producing
  artefacts for the release record.【3c4987†L6-L8】

### 2025-02-13 — Dynamic AGI Oversight Checklist Run

**Command**

```bash
npm run checklists -- --checklist dagi
```

**Purpose**

Validate DAGI self-improvement, mentorship feedback, and orchestration
diagnostics prior to integrating new modules or telemetry feeds.

**Highlights**

- Oversight pytest suite covered build tooling, identity controls, mentorship
  pipelines, and fine-tuning adapters with 18 passing
  tests.【8b5e25†L1-L11】【eb586e†L1-L8】
- Checklist automation finished successfully, documenting the run for future
  infrastructure reviews.【fe1511†L1-L3】

### 2025-10-01 — Modular Architecture Checklist Run

**Command**

```bash
node scripts/run-checklists.js --checklist dynamic-modular-architecture
```

**Purpose**

Dry-run style status snapshot confirming the Dynamic Modular Architecture
checklist remains parseable after dependency updates.

**Highlights**

- Parses `docs/dynamic-capital-modular-architecture.md` and outputs the
  implementation and verification task tables.
- Reports completion totals (0 done / 5 pending for both sections), matching the
  source document.
- Confirms the automation helper continues to exit successfully after the npm
  workspace dependency refresh.

**Output Snapshot**

```text
Dynamic Capital Modular Architecture checklist status
Source: docs/dynamic-capital-modular-architecture.md

Implementation checklist — 5 tasks
  Complete: 0
  Pending: 5

Verification checklist — 5 tasks
  Complete: 0
  Pending: 5
```

### 2025-10-01 — Automated Trading Build Checklist Run

**Command**

```bash
node scripts/run-checklists.js --checklist build-implementation
```

**Purpose**

Validate that the automated trading build report helper still enumerates every
section after updating Node dependencies for the checklist runner.

**Highlights**

- Loads `docs/automated-trading-checklist.md` and prints each stage with OPEN
  task counts.
- Confirms all seven sections resolve with zero completed items, matching the
  authored plan.
- Demonstrates that automation output remains stable across dependency updates,
  ready for follow-up implementation work.

**Output Snapshot**

```text
Automated Trading System Build checklist status
Source: docs/automated-trading-checklist.md

1. TradingView Signal Generation — 6 tasks
  Complete: 0
  Pending: 6

2. Vercel Webhook Receiver — 8 tasks
  Complete: 0
  Pending: 8
```

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

### 2025-10-16 — Stage 1 Onboard & Orient Checklist Run

**Command**

```bash
node scripts/run-checklists.js --checklist web-stage1
```

**Purpose**

Summarize the onboarding alignment tasks from Stage 1 of the unified site map so
teams can verify the cross-surface commitments before implementation work
begins.

**Highlights**

- Parses the Stage 1 subsection under "Implementation Checklist" in
  `docs/web-site-map.md` to confirm the hero and personalization tasks remain
  documented.
- Prints each Stage 1 task with its supporting bullet guidance, preserving the
  onboarding requirements for `/`, `/miniapp`, `/investor`, and `/miniapp/home`.
- Reports the aggregate progress line (`0/2 complete`) to track when the
  cross-surface welcome experience is ready to ship.

**Output Snapshot**

```text
Dynamic Capital Stage 1 implementation checklist status
Source: docs/web-site-map.md
Stage: Stage 1 — Onboard & Orient

Progress: 0/2 complete (0% done)
```

### 2025-10-17 — Modular Architecture Checklist Run

**Command**

```bash
node scripts/run-checklists.js --checklist dynamic-modular-architecture
```

**Purpose**

Reconfirm that the modular architecture automation still parses the
implementation and verification tables after recent documentation updates.

**Highlights**

- Streams the status summary for both checklists with zero completed items so
  teams know the roadmap remains pending.
- Confirms the helper exits cleanly without requiring optional tasks or
  additional flags.

**Output Snapshot**

```text
Dynamic Capital Modular Architecture checklist status
Source: docs/dynamic-capital-modular-architecture.md

Implementation checklist — 5 tasks
  Complete: 0
  Pending: 5

Verification checklist — 5 tasks
  Complete: 0
  Pending: 5
```

### 2025-10-17 — Automated Trading Build Checklist Run

**Command**

```bash
node scripts/run-checklists.js --checklist build-implementation
```

**Purpose**

Validate that the automated trading build report reflects the latest task
inventory referenced during the TradingView ↔ MT5 architecture review.

**Highlights**

- Prints every section (TradingView signals, Vercel webhook, Supabase, MT5 EA,
  hosting, CI/CD, validation) with open task counts.
- Captures the normalized alert schema and infrastructure TODOs, helping the
  integration team prioritize implementation work.

**Output Snapshot**

```text
Automated Trading System Build checklist status
Source: docs/automated-trading-checklist.md

1. TradingView Signal Generation — 6 tasks
  Complete: 0
  Pending: 6

2. Vercel Webhook Receiver — 8 tasks
  Complete: 0
  Pending: 8
```

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

### 2025-10-01 — Ecosystem Deployment Checklist Summary

**Command**

```bash
node scripts/run-checklists.js --checklist ecosystem-deployment
```

**Purpose**

Capture a fresh snapshot of the cross-surface deployment plan for Supabase,
Vercel, DigitalOcean, Telegram, and TON integrations.

**Highlights**

- Confirms the automation still parses 47 deployment tasks grouped by platform
  streams.
- Provides section-by-section completion ratios to help product and platform
  leads coordinate open work.
- Retains narrative context for optional TON burn triggers so launch managers
  can decide when to activate them.

**Output Snapshot**

```text
Dynamic Capital ecosystem deployment checklist status
Source: docs/dynamic-capital-ecosystem-deployment-checklist.md

Overall progress: 0/47 complete (0% done)

Supabase Setup — 12 tasks
  Progress: 0/12 complete (0% done)
```

### 2025-10-01 — Knowledge Base Drop Verification

**Command**

```bash
node scripts/run-checklists.js --checklist knowledge-base-drop
```

**Purpose**

Verify the OneDrive knowledge base manifest continues to mirror the checked-in
artefacts and provenance notes.

**Highlights**

- Validates the manifest against three locally mirrored artefacts.
- Confirms the README guidance still explains how contributors should refresh
  training drops.
- Keeps the knowledge transfer pipeline auditable before the next bulk import.

**Output Snapshot**

```text
Validated 3 knowledge base artefacts against local mirror and provenance README.
```

### 2025-10-01 — NFT Collectible Checklist Summary

**Command**

```bash
node scripts/run-checklists.js --checklist nft-collectible
```

**Purpose**

Audit the NFT launch checklist structure and regenerate the grouped task export
for planning boards.

**Highlights**

- Confirms the automation still counts 9 sections and 42 required checklist
  items.
- Streams the full narrative task list to share with marketing and lore teams.
- Provides optional enhancement reminders for dynamic metadata and loyalty
  scoring experiments.

**Output Snapshot**

```text
Validated NFT checklist structure: 9 sections, 42 checklist items.

NFT Collectible Launch Checklist Tasks
=====================================

1. Concept Foundations
----------------------
```

### 2025-10-01 — Podman GitHub Integration Validation (Failed)

**Command**

```bash
node scripts/run-checklists.js --checklist podman-github
```

**Purpose**

Exercise the Windows Podman machine validation routine so the team knows what to
remediate before attempting GitHub workflow parity on local machines.

**Highlights**

- Checklist runner reports the Podman CLI is missing from the PATH, causing
  every machine inspection step to fail.
- Documents the exact commands the automation attempted (`podman machine list`,
  `podman info`, etc.) so infra engineers can replay them after installing
  Podman Desktop.
- Flags the failure as blocking because the required task could not complete.

**Output Snapshot**

```text
[podman-checklist] Podman CLI not found in PATH. Install Podman Desktop or add podman to PATH.
[podman-checklist] Failed to start machine podman-machine-default.
[podman-checklist] Failed to read machine list: spawn podman ENOENT
```
