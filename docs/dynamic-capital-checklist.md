# Dynamic Capital Checklist

This tracker documents the outstanding work required across the Dynamic Capital project. It is organized so that the highest-priority actions appear first, making it easier to execute items in the optimal order. Check items off as they are completed.

> [!TIP] Use the [Checklist Directory](./CHECKLISTS.md) to see how this tracker relates to other project-specific lists and automation keys.

## Priority navigation

1. [Automation helper](#automation-helper)
2. [Setup Follow-Ups](#setup-follow-ups)
3. [Launch & Production Readiness](#launch--production-readiness)
4. [Development & Delivery Guides](#development--delivery-guides)
5. [Specialized Projects](#specialized-projects)
6. [Completed Repo-Level Action Items](#completed-repo-level-action-items)

## Automation helper

Run `npm run checklists -- --list` to see automation-friendly tasks mapped to this document and related checklists. When you need to execute the scripted steps for a section, call the helper with the relevant key—for example `npm run checklists -- --checklist dynamic-capital`. Optional items (long-running builds or smoke tests) are skipped by default; include them with `--include-optional`. You can also target individual tasks with `--only <task-id>` or exclude steps with `--skip <task-id>`. The same helper powers the automation keys highlighted in the [Checklist Directory](./CHECKLISTS.md).

## Setup Follow-Ups

1. [ ] Complete the Supabase CLI workflow (`npx supabase login && supabase link && supabase db push`).
2. [ ] Refresh or open the pending PR ensuring CI checks pass.
3. [ ] Enable auto-merge with the required branch protections.
4. [ ] Run the production sanity test (`/start`, `/plans`, approve test payment) to confirm `current_vip.is_vip`.

## Development & Delivery Guides

Use these references to plan individual features and keep day-to-day work aligned with the repo’s tooling standards.

1. **[Coding Efficiency Checklist](./coding-efficiency-checklist.md)** – Day-to-day iteration steps covering discovery, environment preparation, implementation, QA, and documentation. Pair with the `coding-efficiency` automation key for scripted verification.
2. **[Once UI Development Checklist](./once-ui-development-checklist.md)** – Frontend and backend guardrails for surfaces built on the Once UI design system. Includes optional automation (`once-ui`) for workspace builds, linting, and mini app packaging.

## Launch & Production Readiness

Confirm the deployment posture before exposing new entry points or changes to end users.

1. **[Go Live Checklist](./GO_LIVE_CHECKLIST.md)** – Manual Telegram webhook and Mini App validation steps. Use the `go-live` automation key to bundle repeatable smoke tests.
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
