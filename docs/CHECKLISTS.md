# Checklist Directory

Dynamic Capital relies on curated checklists to keep workstreams aligned across documentation, code, and deployments. This directory groups the major lists by theme so you can quickly find the right guide and see whether automation is available.

## How to use automation

Run the helper to explore or execute automation-aware checklists:

```bash
npm run checklists -- --list
npm run checklists -- --checklist <key> [--include-optional]
```

Each key maps to a sequence defined in [`scripts/run-checklists.js`](../scripts/run-checklists.js). The helper reads the tables below, resolves the referenced tasks, and runs the associated commands.

## Prioritized checklist roadmap

Follow the numbered order below when coordinating large efforts. Each entry links back to the detailed checklist and, where available, the automation helper key.

| Priority | Checklist | Primary focus | Typical use | Automation key |
| --- | --- | --- | --- | --- |
| 1 | [`Dynamic Capital Checklist`](./dynamic-capital-checklist.md) | Aggregated repo status and cross-checks | Kick off large initiatives or review overall progress | `dynamic-capital` |
| 2 | [`Coding Efficiency Checklist`](./coding-efficiency-checklist.md) | Day-to-day development hygiene | Scope and deliver individual features or maintenance updates | `coding-efficiency` |
| 3 | [`Once UI Development Checklist`](./once-ui-development-checklist.md) | Frontend/back-end surfaces using Once UI | Build or refactor any Once UI-powered surface (landing, dashboard, mini app shell) | `once-ui` |
| 4 | [`Variables and Links Checklist`](./VARIABLES_AND_LINKS_CHECKLIST.md) | Environment variables and outbound link audits | Confirm production configuration before toggling features | `variables-and-links` |
| 5 | [`Go Live Checklist`](./GO_LIVE_CHECKLIST.md) | Manual production readiness smoke tests | Validate Telegram webhook flows before launch | `go-live` |
| 6 | [`Launch Checklist`](./LAUNCH_CHECKLIST.md) | Secrets and keeper setup | Harden Supabase edge functions ahead of launch | — |
| 7 | [`Vercel Production Checklist`](./VERCEL_PRODUCTION_CHECKLIST.md) | Well-architected review for hosted frontends | Audit Vercel deployments for operational readiness | — |
| 8 | [`Automated Trading System Build Checklist`](./automated-trading-checklist.md) | TradingView → Vercel → Supabase → MetaTrader 5 pipeline | Stand up or extend the automated trading stack | — |
| 9 | [`TradingView → MT5 Onboarding Checklist`](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md) | Cross-team onboarding for the TradingView webhook to MT5 flow | Coordinate roadmap execution across teams | — |
| 10 | [`Dynamic Codex Integration Checklist`](./dynamic_codex_integration_checklist.md) | Merging Dynamic Codex into this monorepo | Completed — dashboard now lives at `/telegram` in the Next.js app | — |
| 11 | [`Git Branch Organization Checklist`](./git-branch-organization-checklist.md) | Align Git branches with deployable services and domains | Rework branching strategy to support independent deployments | — |

## Project delivery (priorities 1–3)

### Aggregate & iteration checklists
- **[`Dynamic Capital Checklist`](./dynamic-capital-checklist.md)** – the umbrella tracker that collects repo-level action items and links to every specialized list. Use it for weekly reviews or when coordinating cross-functional workstreams.
- **[`Coding Efficiency Checklist`](./coding-efficiency-checklist.md)** – a reusable template for feature branches. Copy it into issues or PRs to make sure implementation, testing, and documentation steps land together.

### UI & shared tooling
- **[`Once UI Development Checklist`](./once-ui-development-checklist.md)** – ensures surfaces built on the Once UI design system follow linting, testing, and build expectations. Includes optional automation for production builds and mini app packaging.

## Launch & production hardening (priorities 4–7)
- **[`Go Live Checklist`](./GO_LIVE_CHECKLIST.md)** – quick Telegram webhook and Mini App validation steps. Use alongside the `go-live` automation key for repeatable smoke tests.
- **[`Launch Checklist`](./LAUNCH_CHECKLIST.md)** – enumerates Supabase secrets and keeper tasks required before exposing the bot to end users.
- **[`Variables and Links Checklist`](./VARIABLES_AND_LINKS_CHECKLIST.md)** – covers outbound URLs, hostnames, and environment variable drift. Pair it with the automation key `variables-and-links` to run scripted audits.
- **[`Vercel Production Checklist`](./VERCEL_PRODUCTION_CHECKLIST.md)** – applies the Vercel Well-Architected review to the hosted frontend. Ideal before handoffs or compliance reviews.

## Specialized projects & integrations (priorities 8–10)
- **[`Automated Trading System Build Checklist`](./automated-trading-checklist.md)** – sequences the deliverables for the TradingView → Supabase → MetaTrader 5 automation project, from Pine Script alerts to VPS hardening.
- **[`TradingView → MT5 Onboarding Checklist`](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md)** – mirrors the onboarding roadmap so TradingView, webhook, Supabase, and MT5 teams can work in parallel with clear hand-offs.
- **[`Dynamic Codex Integration Checklist`](./dynamic_codex_integration_checklist.md)** – archived after Dynamic Codex was merged into the main `/telegram` route; keep for historical context.
- **[`Git Branch Organization Checklist`](./git-branch-organization-checklist.md)** – guides the restructuring of branches so each deployable service can map to its own domain and load-balanced release flow.

## Keep documentation in sync

Update checklists when processes change and reference supporting docs such as [`docs/env.md`](./env.md), [`docs/SETUP_SUMMARY.md`](./SETUP_SUMMARY.md), or service-specific runbooks. When automation is added for a new workflow, record the key and linked tasks here so contributors can discover it quickly.
