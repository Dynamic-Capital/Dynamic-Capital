# Dynamic Capital Checklist

This tracker documents the outstanding work required across the Dynamic Capital project. It is organized so that the highest-priority actions appear first, making it easier to execute items in the optimal order. Check items off as they are completed.

> [!TIP] Use the [Checklist Directory](./CHECKLISTS.md) to see how this tracker relates to other project-specific lists and automation keys.

## Priority navigation

1. [Automation helper](#automation-helper)
2. [Core automation tasks](#core-automation-tasks)
3. [Setup Follow-Ups](#setup-follow-ups)
4. [Go Live Checklist](#go-live-checklist)
5. [Development & Delivery Guides](#development--delivery-guides)
6. [Launch & Production Readiness](#launch--production-readiness)
7. [Specialized Projects](#specialized-projects)
8. [Completed Repo-Level Action Items](#completed-repo-level-action-items)

## Automation helper

Run `npm run checklists -- --list` to see automation-friendly tasks mapped to this document and related checklists. When you need to execute the scripted steps for a section, call the helper with the relevant key—for example `npm run checklists -- --checklist dynamic-capital`. Optional items (long-running builds or smoke tests) are skipped by default; include them with `--include-optional`. You can also target individual tasks with `--only <task-id>` or exclude steps with `--skip <task-id>`. The same helper powers the automation keys highlighted in the [Checklist Directory](./CHECKLISTS.md).

## Core automation tasks

Use the automation helper (or run commands directly) to complete the recurring repo health checks before audits, launches, or large merges. Track the results in your PR/issue notes so reviewers can see the evidence.

- [ ] Sync `.env` and `.env.local` with `.env.example` (`npm run sync-env`) to ensure new environment keys are captured locally.
- [ ] Run the repository test suite (`npm run test`) so Deno and Next.js smoke tests cover the latest changes.
- [ ] Execute the fix-and-check script (`bash scripts/fix_and_check.sh`) to apply formatting and rerun Deno format/lint/type checks.
- [ ] Run the aggregated verification suite (`npm run verify`) for the bundled static, runtime, and integration safety checks.
- [ ] Audit Supabase Edge function hosts (`deno run -A scripts/audit-edge-hosts.ts`) to detect environment drift between deployments.
- [ ] Check linkage across environment variables and outbound URLs (`deno run -A scripts/check-linkage.ts`) before promoting builds.
- [ ] Verify the Telegram webhook configuration (`deno run -A scripts/check-webhook.ts`) so bot traffic hits the expected endpoint.
- [ ] _Optional:_ Run the mini app smoke test (`deno run -A scripts/smoke-miniapp.ts`) to mirror the go-live walkthrough end-to-end.

## Setup Follow-Ups

> [!TIP] Run `npm run checklists -- --checklist setup-followups` to execute the Supabase CLI automation and CI parity checks captured in this section.

1. [ ] Complete the Supabase CLI workflow (`npx supabase login && supabase link && supabase db push`) or run `bash scripts/supabase-cli-workflow.sh` with the required credentials exported.
2. [ ] Refresh or open the pending PR ensuring CI checks pass (`deno task typecheck`, `npm run test`, `npm run audit`, `deno task ci`).
3. [ ] Enable auto-merge with the required branch protections.
4. [ ] Run the production sanity test (`/start`, `/plans`, approve test payment) to confirm `current_vip.is_vip`.

## Go Live Checklist

Run the `go-live` automation key (`npm run checklists -- --checklist go-live --include-optional`) and mirror the manual validations below before exposing updates to traders or admins. Refer to the detailed [Go Live Checklist](./GO_LIVE_CHECKLIST.md) for curl commands and troubleshooting steps.

1. [ ] Confirm the Telegram webhook is set and returning `200` responses for health pings.
2. [ ] Walk through the bank happy path to ensure approvals mark `current_vip.is_vip` correctly.
3. [ ] Trigger a bank near-miss so `manual_review` captures the reason and the workflow pauses safely.
4. [ ] Verify duplicate image uploads are blocked to prevent bypassing compliance checks.
5. [ ] (If crypto rails are enabled) Submit a transaction with a pending TXID and ensure the approval occurs after confirmations land.
6. [ ] Exercise admin commands (`/plans`, `/sync`, etc.) to confirm operations tooling responds.
7. [ ] Capture evidence (screenshots, curl output) and attach it to the release/PR summary for audit trails.

## Development & Delivery Guides

Use these references to plan individual features and keep day-to-day work aligned with the repo’s tooling standards.

1. **[Coding Efficiency Checklist](./coding-efficiency-checklist.md)** – Day-to-day iteration steps covering discovery, environment preparation, implementation, QA, and documentation. Pair with the `coding-efficiency` automation key for scripted verification.
2. **[Once UI Development Checklist](./once-ui-development-checklist.md)** – Frontend and backend guardrails for surfaces built on the Once UI design system. Includes optional automation (`once-ui`) for workspace builds, linting, and mini app packaging.

## Launch & Production Readiness

Confirm the deployment posture before exposing new entry points or changes to end users.

1. **[Go Live Checklist](#go-live-checklist)** – Manual Telegram webhook and Mini App validation steps. Use the `go-live` automation key to bundle repeatable smoke tests.
2. **[Launch Checklist](./LAUNCH_CHECKLIST.md)** – Supabase secret inventories and keeper scheduling required ahead of production launches.
3. **[Variables and Links Checklist](./VARIABLES_AND_LINKS_CHECKLIST.md)** – Environment variable, hostname, and URL verification. The `variables-and-links` automation key runs the scripted audits that complement the manual review.
4. **[Vercel Production Checklist](./VERCEL_PRODUCTION_CHECKLIST.md)** – Applies the Vercel Well-Architected pillars to hosted frontends so operations, reliability, and cost expectations stay aligned.

## Specialized Projects

Track larger initiatives that span multiple teams or subsystems and copy the detailed checklists into project docs for visibility.

1. **[Automated Trading System Build Checklist](./automated-trading-checklist.md)** – Sequences the TradingView → Vercel → Supabase → MetaTrader 5 automation effort, from alert payloads to VPS hardening and monitoring.
2. **[TradingView → MT5 Onboarding Checklist](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md)** – Tracks the cross-team onboarding roadmap so Pine Script, webhook, Supabase, and EA owners can coordinate deliverables.
3. **[Dynamic Codex Integration Checklist](./dynamic_codex_integration_checklist.md)** – Archived context after merging Dynamic Codex into the `/telegram` Next.js route; keep for historical reference.

## Completed Repo-Level Action Items

These foundational tasks have already been delivered and are retained for historical context.

- [x] Add default exports to all Edge Functions.
- [x] Build out integration tests for payment and webhook flows.
- [x] Document expected environment variables and values.
- [x] Consolidate duplicate Supabase client creation.
- [x] Automate generation of repository summary docs.
- [x] Prune unused scripts.
- [x] Expand the README with setup guidance.
