# Dynamic Capital Checklist

This tracker documents the outstanding work required across the Dynamic Capital
project. It is organized so that the highest-priority actions appear first,
making it easier to execute items in the optimal order. Check items off as they
are completed.

> [!TIP] Use the [Checklist Directory](./CHECKLISTS.md) to see how this tracker
> relates to other project-specific lists and automation keys.

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
      ensure new environment keys are captured locally. _Ran with the automation
      helper; 106 missing keys were appended to both `.env` and `.env.local`
      from the template so local parity is restored._
- [ ] Run the repository test suite (`npm run test`) so Deno and Next.js smoke
      tests cover the latest changes. _Hold this run until the fix-and-check
      loop succeeds; otherwise the lint failures mask any functional
      regressions the test suite might surface. Once the lint blockers are
      cleared, capture the command output as evidence in the PR description._
- [ ] Execute the fix-and-check script (`bash scripts/fix_and_check.sh`) to
      apply formatting and rerun Deno format/lint/type checks. _2025-09-27 run
      still fails: `deno lint` emits hundreds of existing violations. Burn
      down the debt in this order so each pass retires an error category:
      1. Remove redundant `async` keywords flagged by `require-await` across
         Supabase tests, Telegram handlers, and Next.js config files.
      2. Replace `any` annotations with concrete interfaces (queue mocks,
         analytics hooks, Telegram recompute helpers) or prefix unused mocks
         with `_` to satisfy `no-explicit-any` and `no-unused-vars`.
      3. Convert inline `https://` imports under `supabase/functions` to bare
         specifiers declared in `deno.json` so `no-import-prefix` passes.
      4. Patch empty `catch {}` blocks and dead variables in Node scripts so
         `no-empty` and `no-unused-vars` stop firing._
- [x] Run the aggregated verification suite (`npm run verify`) for the bundled
      static, runtime, and integration safety checks. _`verify_all.sh` completed
      successfully and refreshed `.out/verify_report.md` with the latest
      results._
- [x] Audit Supabase Edge function hosts
      (`deno run -A scripts/audit-edge-hosts.ts`) to detect environment drift
      between deployments. _Check completed via `npx deno`; 17 URLs were scanned
      and none deviated from the expected host pattern._
- [ ] Check linkage across environment variables and outbound URLs
      (`deno run -A scripts/check-linkage.ts`) before promoting builds. _Latest
      run (2025-09-27) completes the webhook lookup with the bundled trust
      stores but still times out hitting
      `https://qeejuomcapbdlhnjqjcc.functions.supabase.co/linkage-audit`. Work
      through the timeout by (a) confirming the Supabase project reference and
      service role in `.env`, (b) manually curling the `linkage-audit` edge
      function to verify DNS and firewall alignment, and (c) rerunning the
      script with `DEBUG=1` so the failing request payload and headers are
      logged for Supabase support._
- [ ] Verify the Telegram webhook configuration
      (`deno run -A scripts/check-webhook.ts`) so bot traffic hits the expected
      endpoint. _Attempt on 2025-09-27 stops early because `TELEGRAM_BOT_TOKEN`
      is not populated. To unblock the automation: 1) load the bot token and
      chat ID secrets into `.env.local`; 2) verify the secrets with
      `npm run env:validate`; 3) rerun the checker and capture the reported
      webhook URL plus certificate status for the release notes._
- [ ] _Optional:_ Run the mini app smoke test
      (`deno run -A scripts/smoke-miniapp.ts`) to mirror the go-live walkthrough
      end-to-end. _Requires `FUNCTIONS_BASE` to target a deployed Supabase Edge
      host; not available in this environment._

## Setup Follow-Ups

> [!TIP] Run `npm run checklists -- --checklist setup-followups` to execute the
> Supabase CLI automation and CI parity checks captured in this section.

1. [ ] Complete the Supabase CLI workflow
       (`npx supabase login && supabase link && supabase db push`) or run
       `bash scripts/supabase-cli-workflow.sh`. The helper now loads
       `.env.local`/`.env` for `SUPABASE_ACCESS_TOKEN`,
       `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF` (when available) and
       can deploy a comma-separated list of edge functions when
       `SUPABASE_DEPLOY_FUNCTIONS` is set.
2. [ ] Refresh or open the pending PR ensuring CI checks pass
       (`deno task typecheck`, `npm run test`, `npm run audit`, `deno task ci`).
3. [ ] Enable auto-merge with the required branch protections.
4. [ ] Run the production sanity test (`/start`, `/plans`, approve test payment)
       to confirm `current_vip.is_vip`.

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
       health pings (see
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
