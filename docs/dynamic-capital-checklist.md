# Dynamic Capital Checklist

This tracker documents the outstanding work required across the Dynamic Capital
project. It is organized so that the highest-priority actions appear first,
making it easier to execute items in the optimal order. Check items off as they
are completed.

> [!TIP] Pair this tracker with the
> [Dynamic Capital Onboarding Checklist](./onboarding-checklist.md) when guiding
> new collaborators, and use the [Checklist Directory](./CHECKLISTS.md) to see
> how each list maps to automation keys.

## Priority navigation

1. [Automation helper](#automation-helper)
2. [Core automation tasks](#core-automation-tasks)
3. [Setup Follow-Ups](#setup-follow-ups)
4. [Go Live Checklist](#go-live-checklist)
5. [Development & Delivery Guides](#development--delivery-guides)
6. [Launch & Production Readiness](#launch--production-readiness)
7. [Specialized Projects](#specialized-projects)
8. [Completed Repo-Level Action Items](#completed-repo-level-action-items)

## Quick status snapshot (2025-09-30)

| Area                   | Status                                  | Next action                                                                                                                                                           |
| ---------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix-and-check script   | 🔴 Failing (`scripts/fix_and_check.sh`) | Clear the `deno lint` violations (`no-explicit-any`, `require-await`, import prefixes) across Supabase functions, web components, and tooling, then rerun the helper. |
| Linkage audit          | 🟡 Blocked (`scripts/check-linkage.ts`) | Provide `TELEGRAM_BOT_TOKEN` and bring `https://qeejuomcapbdlhnjqjcc.functions.supabase.co/linkage-audit` back online so the outbound URL audit can complete.         |
| Telegram webhook check | 🟡 Blocked (`scripts/check-webhook.ts`) | Populate `TELEGRAM_BOT_TOKEN` (or supply a mock) so the webhook verifier can authenticate instead of exiting early.                                                   |
| Supabase CLI workflow  | 🟡 Pending (`Setup Follow-Ups` §1)      | Run `scripts/supabase-cli-workflow.sh` or the manual login/link/push sequence once credentials are available.                                                         |
| Production sanity test | 🟡 Pending (`Setup Follow-Ups` §4)      | Walk the `/start` → `/plans` approval flow and capture evidence that `current_vip.is_vip` toggles correctly.                                                          |

## Automation helper

Run `npm run checklists -- --list` to see automation-friendly tasks mapped to
this document and related checklists. When you need to execute the scripted
steps for a section, call the helper with the relevant key—for example
`npm run checklists -- --checklist dynamic-capital`. Optional items
(long-running builds or smoke tests) are skipped by default; include them with
`--include-optional`. You can also target individual tasks with
`--only <task-id>` or exclude steps with `--skip <task-id>`. The same helper
powers the automation keys highlighted in the
[Checklist Directory](./CHECKLISTS.md).

## Core automation tasks

Use the automation helper (or run commands directly) to complete the recurring
repo health checks before audits, launches, or large merges. Track the results
in your PR/issue notes so reviewers can see the evidence.

- [x] Sync `.env` and `.env.local` with `.env.example` (`npm run sync-env`) to
      ensure new environment keys are captured locally.
  > **Status (2025-09-30):** Automation helper appended 129 missing keys into
  > both `.env` and `.env.local`, restoring parity with the template.
- [x] Run the repository test suite (`npm run test`) so Deno and Next.js smoke
      tests cover the latest changes.
  > **Status (2025-09-30):** `npm run checklists -- --checklist dynamic-capital`
  > executed 119 Deno tests (1 ignored) in ~29s with all suites passing.
- [ ] Execute the fix-and-check script (`bash scripts/fix_and_check.sh`) to
      apply formatting and rerun Deno format/lint/type checks.
  > **Status (2025-09-30):** Helper aborted during the lint phase because files
  > across Supabase functions, web UI packages, and third-party utilities still
  > violate `no-explicit-any`, `require-await`, `jsx-key`, and related rules.
- [x] Run the aggregated verification suite (`npm run verify`) for the bundled
      static, runtime, and integration safety checks.
  > **Status (2024-11-19):** `verify_all.sh` completed successfully and
  > refreshed `.out/verify_report.md` with the latest results.
- [x] Audit Supabase Edge function hosts
      (`deno run -A scripts/audit-edge-hosts.ts`) to detect environment drift
      between deployments.
  > **Status (2025-09-30):** `npx deno run -A scripts/audit-edge-hosts.ts`
  > scanned 20 Edge URLs and reported no host mismatches.
- [ ] Check linkage across environment variables and outbound URLs
      (`deno run -A scripts/check-linkage.ts`) before promoting builds.
  > **Status (2025-09-30):** Script still skips webhook verification without
  > `TELEGRAM_BOT_TOKEN` and the linkage audit request to
  > `https://qeejuomcapbdlhnjqjcc.functions.supabase.co/linkage-audit` timed
  > out.
- [ ] Verify the Telegram webhook configuration
      (`deno run -A scripts/check-webhook.ts`) so bot traffic hits the expected
      endpoint.
  > **Status (2025-09-30):** Execution stops immediately with
  > `Missing TELEGRAM_BOT_TOKEN`; populate the secret or mock the Telegram API
  > to complete the check.
- [ ] _Optional:_ Run the mini app smoke test
      (`deno run -A scripts/smoke-miniapp.ts`) to mirror the go-live walkthrough
      end-to-end.
  > **Status (2024-11-19):** Requires `FUNCTIONS_BASE` for a deployed Supabase
  > Edge host; not available in this environment.

## Setup Follow-Ups

> [!TIP] Run `npm run checklists -- --checklist setup-followups` to execute the
> Supabase CLI automation and CI parity checks captured in this section.

1. [ ] Complete the Supabase CLI workflow
       (`npx supabase login && supabase link && supabase db push`) or run
       `bash scripts/supabase-cli-workflow.sh` with the required credentials
       exported.

       > **Status (2024-11-19):** Pending—credentials have not been supplied in
       > this environment.
2. [ ] Refresh or open the pending PR ensuring CI checks pass
       (`deno task typecheck`, `npm run test`, `npm run audit`, `deno task ci`).

       > **Status (2024-11-19):** Pending—rerun once local Supabase linking is
       > complete so CI parity can be captured alongside logs.
3. [ ] Enable auto-merge with the required branch protections.

       > **Status (2024-11-19):** Pending—activate after CI checks are
       > consistently passing for the target branch.
4. [ ] Run the production sanity test (`/start`, `/plans`, approve test payment)
       to confirm `current_vip.is_vip`.

       > **Status (2024-11-19):** Pending—blocked on Supabase credentials and
       > Telegram secrets before the happy path can be exercised.

## Go Live Checklist

Run `npm run go-live` (an alias for the `go-live` automation key) to execute the
scripted checks. Pass `-- --include-optional` when you need the longer-running
smoke tests alongside the core validations, then mirror the manual checks below
before exposing updates to traders or admins. Use the
[Go-Live Validation Playbook](./go-live-validation-playbook.md) for step-by-step
runbooks, curl commands, and evidence templates.

> [!TIP] Populate `TELEGRAM_BOT_TOKEN` (and related Telegram secrets) in
> `.env.local` or `.env` so the automation can talk to the Telegram API when it
> loads the configuration for webhook verification.

1. [ ] Confirm the Telegram webhook is set and returning `200` responses for
       health pings (automation now pings the derived `/version` endpoint; set
       `TELEGRAM_WEBHOOK_HEALTH_URL` to override) (see
       [playbook §1](./go-live-validation-playbook.md#1-telegram-webhook-health)).
2. [ ] Walk through the bank happy path to ensure approvals mark
       `current_vip.is_vip` correctly (see
       [playbook §2](./go-live-validation-playbook.md#2-bank-approvals--happy-path)).
3. [ ] Trigger a bank near-miss so `manual_review` captures the reason and the
       workflow pauses safely (see
       [playbook §3](./go-live-validation-playbook.md#3-bank-approvals--near-miss)).
4. [ ] Verify duplicate image uploads are blocked to prevent bypassing
       compliance checks (see
       [playbook §4](./go-live-validation-playbook.md#4-duplicate-receipt-safeguard)).
5. [ ] (If crypto rails are enabled) Submit a transaction with a pending TXID
       and ensure the approval occurs after confirmations land (see
       [playbook §5](./go-live-validation-playbook.md#5-crypto-txid-confirmations-if-enabled)).
6. [ ] Exercise admin commands (`/ping`, `/version`, `/admin`, etc.) to confirm
       operations tooling responds (see
       [playbook §6](./go-live-validation-playbook.md#6-admin-command-smoke-test)).
7. [ ] Capture evidence (screenshots, curl output) and attach it to the
       release/PR summary for audit trails.

## Development & Delivery Guides

Use these references to plan individual features and keep day-to-day work
aligned with the repo’s tooling standards.

1. **[Coding Efficiency Checklist](./coding-efficiency-checklist.md)** –
   Day-to-day iteration steps covering discovery, environment preparation,
   implementation, QA, and documentation. Pair with the `coding-efficiency`
   automation key for scripted verification.
2. **[Dynamic UI Development Checklist](./dynamic-ui-development-checklist.md)**
   – Frontend and backend guardrails for surfaces built on the Dynamic UI design
   system. Includes optional automation (`dynamic-ui`) for workspace builds,
   linting, and mini app packaging.

## Launch & Production Readiness

Confirm the deployment posture before exposing new entry points or changes to
end users.

1. **[Go Live Checklist](#go-live-checklist)** – Manual Telegram webhook and
   Mini App validation steps. Use the `go-live` automation key to bundle
   repeatable smoke tests.
2. **[Launch Checklist](./LAUNCH_CHECKLIST.md)** – Supabase secret inventories
   and keeper scheduling required ahead of production launches.
3. **[Variables and Links Checklist](./VARIABLES_AND_LINKS_CHECKLIST.md)** –
   Environment variable, hostname, and URL verification. The
   `variables-and-links` automation key runs the scripted audits that complement
   the manual review.
4. **[Vercel Production Checklist](./VERCEL_PRODUCTION_CHECKLIST.md)** – Applies
   the Vercel Well-Architected pillars to hosted frontends so operations,
   reliability, and cost expectations stay aligned.

## Specialized Projects

Track larger initiatives that span multiple teams or subsystems and copy the
detailed checklists into project docs for visibility.

1. **[Automated Trading System Build Checklist](./automated-trading-checklist.md)**
   – Sequences the TradingView → Vercel → Supabase → MetaTrader 5 automation
   effort, from alert payloads to VPS hardening and monitoring.
2. **[TradingView → MT5 Onboarding Checklist](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md)**
   – Tracks the cross-team onboarding roadmap so Pine Script, webhook, Supabase,
   and EA owners can coordinate deliverables.
3. **[Dynamic Codex Integration Checklist](./dynamic_codex_integration_checklist.md)**
   – Archived context after merging Dynamic Codex into the `/telegram` Next.js
   route; keep for historical reference.
4. **[Dynamic Trading Algo (DTA) Improvement Checklist](./dynamic-trading-algo-improvement-checklist.md)**
   – Guides Smart Money Concepts tuning across configuration, analyzers, and
   delivery workflows so BOS/liquidity updates land consistently.

## Completed Repo-Level Action Items

These foundational tasks have already been delivered and are retained for
historical context.

- [x] Add default exports to all Edge Functions.
- [x] Build out integration tests for payment and webhook flows.
- [x] Document expected environment variables and values.
- [x] Consolidate duplicate Supabase client creation.
- [x] Automate generation of repository summary docs.
- [x] Prune unused scripts.
- [x] Expand the README with setup guidance.
