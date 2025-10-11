# Checklist Audit Report — 2025-10-08

## Overview

- **Total files referencing checklists:** 271
- **Total checklist mentions:** 1,054
- **Primary locations:** Documentation dominates (186 files), followed by
  automation logic in `algorithms/` and execution planners in
  `dynamic_summary/`.
- **Purpose of this audit:** Surface where checklist guardrails live today and
  highlight automation coverage so the execution team can prioritise follow-up
  hardening.

## Repository Hotspots

### References by Top-Level Directory

| Directory               | Files | Checklist Mentions |
| ----------------------- | ----: | -----------------: |
| docs                    |   186 |                693 |
| algorithms              |    16 |                 88 |
| apps                    |    13 |                 43 |
| dynamic_trading_persona |     2 |                 38 |
| dynamic_summary         |     2 |                 28 |
| data                    |    10 |                 19 |
| tests                   |     3 |                 19 |
| scripts                 |     5 |                 18 |

### Checklist-Heavy Files

| File                                  | Mentions |
| ------------------------------------- | -------: |
| docs/checklist-run-log.md             |       98 |
| docs/CHECKLISTS.md                    |       60 |
| algorithms/python/desk_token_hub.py   |       28 |
| docs/DYNAMIC_DOCS_ORGANIZER.md        |       27 |
| docs/README.md                        |       26 |
| dynamic_trading_persona/profiles.py   |       26 |
| dynamic_summary/planner.py            |       24 |
| docs/dynamic-capital-checklist.md     |       20 |
| algorithms/python/checklist_parser.py |       17 |
| tests/test_dynamic_summary_planner.py |       17 |

## Automation Inventory

The scripted checklist runner exposes the following automation surfaces.
Prioritise these when enforcing guardrails in CI or operational sweeps.

- **Coding Efficiency Checklist (`coding-efficiency`):** Lints, repo tests,
  fix-and-check script, verification umbrella.
- **Dynamic UI Checklist (`dynamic-ui`):** Web linting/testing plus optional
  build validations.
- **Variables & Links (`variables-and-links`):** Edge host and linkage audits.
- **Go-Live (`go-live`):** Telegram webhook validation with optional tunnel and
  mini app smoke tests.
- **Setup Follow-Ups (`setup-followups`):** Supabase CLI workflow, Deno
  typecheck, dependency audit, CI parity.
- **Dynamic Capital Aggregate (`dynamic-capital`):** Bundles repo hygiene,
  deployment audits, and webhook checks.
- **Stage 1 Web & Mini App (`web-stage1`):** Alignment report for initial
  surface rollout.
- **Ecosystem Deployment (`ecosystem-deployment`):** Summarises Supabase,
  Vercel, DigitalOcean, Telegram, and TON launch tracks.
- **Dynamic Modular Architecture (`dynamic-modular-architecture`):**
  Implementation and verification drill-downs.
- **Automated Trading Build (`build-implementation`):** Implementation checklist
  synthesis for trading automation.
- **Dynamic AI Validation (`dai`):** Pytest suites covering DAI architecture and
  personas.
- **Dynamic AGI Oversight (`dagi`):** Pytest suite for AGI governance.
- **NFT Collectible Launch (`nft-collectible`):** Markdown structure validation
  plus task extraction.
- **Knowledge Base Drop (`knowledge-base-drop`):** Verifies metadata snapshots
  for OneDrive ingests.
- **Podman GitHub Integration (`podman-github`):** Podman machine verification
  for Windows operators.

Automation bundles are also available for **governance**, **readiness**, and
**full** sweeps, chaining the relevant checklists into a single command for
programme-level assurance.

## Observations & Follow-Ups

1. **Documentation density:** With 65% of checklist references in `docs/`,
   ensure future updates keep the automation keys (`npm run checklists`) in sync
   with narrative guidance.
2. **Execution planners:** Modules like `dynamic_summary/planner.py` and persona
   profiles translate checklists into structured tasks. Consider adding
   regression tests when expanding their schemas.
3. **Automation coverage gaps:** Some operational checklists (for example TON
   deployment documents) are narrative-only. Evaluate whether lightweight
   scripts should back them before production pushes.
4. **Test integration:** Existing pytest suites (`dai`, `dagi`, summary planner)
   already enforce parts of the governance flow. Expanding CI triggers to
   include these bundles would raise checklist compliance confidence.
