# Checklist Directory

Dynamic Capital relies on curated checklists to keep workstreams aligned across documentation, code, and deployments. This directory groups the major lists by theme so you can quickly find the right guide and see whether automation is available.

## How to use automation

Run the helper to explore or execute automation-aware checklists:

```bash
npm run checklists -- --list
npm run checklists -- --checklist <key> [--include-optional]
```

Each key maps to a sequence defined in [`scripts/run-checklists.js`](../scripts/run-checklists.js). The helper reads the tables below, resolves the referenced tasks, and runs the associated commands.

### Bulk process checklists

Use the bulk processor to audit checklist progress or export open items:

```bash
npm run checklists:process
npm run checklists:process -- --state all --format json --output tmp/checklists.json
```

The script scans Markdown files whose names include `checklist`, groups items by section, and supports `text`, `markdown`, or `json` output so you can review status in bulk or feed another tool.

## Quick reference

| Checklist | Primary focus | Typical use | Automation key |
| --- | --- | --- | --- |
| [`Dynamic Capital Checklist`](./dynamic-capital-checklist.md) | Aggregated repo status and cross-checks | Kick off large initiatives or review overall progress | `dynamic-capital` |
| [`Coding Efficiency Checklist`](./coding-efficiency-checklist.md) | Day-to-day development hygiene | Scope and deliver individual features or maintenance updates | `coding-efficiency` |
| [`Once UI Development Checklist`](./once-ui-development-checklist.md) | Frontend/back-end surfaces using Once UI | Build or refactor any Once UI-powered surface (landing, dashboard, mini app shell) | `once-ui` |
| [`Variables and Links Checklist`](./VARIABLES_AND_LINKS_CHECKLIST.md) | Environment variables and outbound link audits | Confirm production configuration before toggling features | `variables-and-links` |
| [`Go Live Checklist`](./GO_LIVE_CHECKLIST.md) | Manual production readiness smoke tests | Validate Telegram webhook flows before launch | `go-live` |
| [`Launch Checklist`](./LAUNCH_CHECKLIST.md) | Secrets and keeper setup | Harden Supabase edge functions ahead of launch | — |
| [`Vercel Production Checklist`](./VERCEL_PRODUCTION_CHECKLIST.md) | Well-architected review for hosted frontends | Audit Vercel deployments for operational readiness | — |
| [`Automated Trading System Build Checklist`](./automated-trading-checklist.md) | TradingView → Vercel → Supabase → MetaTrader 5 pipeline | Stand up or extend the automated trading stack | — |
| [`Dynamic Codex Integration Checklist`](./dynamic_codex_integration_checklist.md) | Merging Dynamic Codex into this monorepo | Track integration status across frontend, backend, and tooling | — |

## Project delivery

### Aggregate & iteration checklists
- **[`Dynamic Capital Checklist`](./dynamic-capital-checklist.md)** – the umbrella tracker that collects repo-level action items and links to every specialized list. Use it for weekly reviews or when coordinating cross-functional workstreams.
- **[`Coding Efficiency Checklist`](./coding-efficiency-checklist.md)** – a reusable template for feature branches. Copy it into issues or PRs to make sure implementation, testing, and documentation steps land together.

### UI & shared tooling
- **[`Once UI Development Checklist`](./once-ui-development-checklist.md)** – ensures surfaces built on the Once UI design system follow linting, testing, and build expectations. Includes optional automation for production builds and mini app packaging.

## Launch & production hardening
- **[`Go Live Checklist`](./GO_LIVE_CHECKLIST.md)** – quick Telegram webhook and Mini App validation steps. Use alongside the `go-live` automation key for repeatable smoke tests.
- **[`Launch Checklist`](./LAUNCH_CHECKLIST.md)** – enumerates Supabase secrets and keeper tasks required before exposing the bot to end users.
- **[`Variables and Links Checklist`](./VARIABLES_AND_LINKS_CHECKLIST.md)** – covers outbound URLs, hostnames, and environment variable drift. Pair it with the automation key `variables-and-links` to run scripted audits.
- **[`Vercel Production Checklist`](./VERCEL_PRODUCTION_CHECKLIST.md)** – applies the Vercel Well-Architected review to the hosted frontend. Ideal before handoffs or compliance reviews.

## Specialized projects & integrations
- **[`Automated Trading System Build Checklist`](./automated-trading-checklist.md)** – sequences the deliverables for the TradingView → Supabase → MetaTrader 5 automation project, from Pine Script alerts to VPS hardening.
- **[`Dynamic Codex Integration Checklist`](./dynamic_codex_integration_checklist.md)** – documents the remaining work to fold Dynamic Codex into this repository without regressing existing tooling.

## Keep documentation in sync

Update checklists when processes change and reference supporting docs such as [`docs/env.md`](./env.md), [`docs/SETUP_SUMMARY.md`](./SETUP_SUMMARY.md), or service-specific runbooks. When automation is added for a new workflow, record the key and linked tasks here so contributors can discover it quickly.
