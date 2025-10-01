# Dynamic Capital Ecosystem Platform

<div align="center">

  <strong>Institutional-grade intelligence, trading, and automation for digital asset growth.</strong>

  <sub>Dynamic Capital unifies Web3 infrastructure, machine intelligence, and precise execution tooling into an adaptive platform that scales with market velocity.</sub>

</div>

---

<!-- BADGES:START -->
<!-- BADGES:END -->

**Fast deposits for traders. Bank & crypto, verified.**

## Table of Contents

<!-- TOC:START -->

- [Executive Overview](#executive-overview)
  - [Vision](#vision)
  - [Strategic Focus](#strategic-focus)
- [Investor Snapshot](#investor-snapshot)
  - [Value Drivers](#value-drivers)
  - [Traction Signals](#traction-signals)
- [Beginner's Guide](#beginners-guide)
  - [First Steps](#first-steps)
  - [Learning Resources](#learning-resources)
- [Ecosystem Pillars](#ecosystem-pillars)
  - [Dynamic Capital Modules](#dynamic-capital-modules)
- [Interface Layout](#interface-layout)
  - [Header](#header)
  - [Footer](#footer)
- [What's New](#whats-new)
- [Quick Links](#quick-links)
  - [Saved GitHub queries](#saved-github-queries)
  - [GitHub CLI one-liners](#github-cli-one-liners)
- [Platform Capabilities](#platform-capabilities)
  - [Telegram Mini App — Next.js + React + Icons](#telegram-mini-app--nextjs--react--icons)
  - [Install](#install)
  - [Swap icon library (optional)](#swap-icon-library-optional)
  - [Features](#features)
  - [Investor Experience](#investor-experience)
  - [Treasury & Token](#treasury--token)
  - [Architecture & Docs](#architecture--docs)
    - [Dynamic AGI self-improvement loop](#dynamic-agi-self-improvement-loop)
  - [Dynamic Theme System](#dynamic-theme-system)
  - [Security Features](#security-features)
  - [Privacy & Security](#privacy--security)
- [Environment Setup](#environment-setup)
  - [Client-side (`NEXT_PUBLIC_*`)](#client-side-next_public_)
  - [Server-only secrets](#server-only-secrets)
  - [Timezone configuration](#timezone-configuration)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
  - [Project starters](#project-starters)
  - [Development Process Overview](#development-process-overview)
  - [Quick start with Dynamic Codex](#quick-start-with-dynamic-codex)
    - [Using Dynamic Codex (Recommended)](#using-dynamic-codex-recommended)
    - [Local Development](#local-development)
    - [Codex CLI workflow helper](#codex-cli-workflow-helper)
- [Build & Deployment](#build--deployment)
  - [Building](#building)
    - [Bundle analysis](#bundle-analysis)
  - [Static snapshot pipeline](#static-snapshot-pipeline)
  - [Asset Deployment](#asset-deployment)
  - [Maintenance & Automation](#maintenance--automation)
  - [🎨 UI Development with Dynamic Codex](#ui-development-with-dynamic-codex)
    - [Quick UI Guidelines](#quick-ui-guidelines)
    - [UI Development Workflow](#ui-development-workflow)
    - [AI-Powered Features](#ai-powered-features)
    - [Debugging Tools](#debugging-tools)
  - [🔒 Architecture & Integration Guardrails](#architecture--integration-guardrails)
    - [Telegram Bot ⇄ Mini App Connection](#telegram-bot--mini-app-connection)
    - [🚨 CRITICAL: DO NOT MODIFY INTEGRATION](#critical-do-not-modify-integration)
    - [✅ SAFE TO MODIFY: UI & UX Only](#safe-to-modify-ui--ux-only)
    - [Connectivity Sanity Checks](#connectivity-sanity-checks)
    - [Payment Flow Overview](#payment-flow-overview)
    - [Common UI Pitfalls to Avoid](#common-ui-pitfalls-to-avoid)
    - [Edge Function Error Handling](#edge-function-error-handling)
  - [Environment variables](#environment-variables)
    - [Build environment](#build-environment)
  - [Running with Docker](#running-with-docker)
    - [GitHub Actions Docker smoke test](#github-actions-docker-smoke-test)
  - [Deployment](#deployment)
- [Testing & Validation](#testing--validation)
  - [API Demo](#api-demo)
  - [Tests](#tests)
  - [CI / checks](#ci--checks)
  - [Smoke checks](#smoke-checks)
  - [Local webhook testing](#local-webhook-testing)
    - [Public tunnel for remote QA](#public-tunnel-for-remote-qa)
- [Operational Routines](#operational-routines)
  - [Mini App](#mini-app)
  - [VIP Sync](#vip-sync)
  - [Go Service](#go-service)
    - [Build and run](#build-and-run)
    - [Docker](#docker)
- [Automation & Data Pipelines](#automation--data-pipelines)
  - [Analyst Insights Collector](#analyst-insights-collector)
  - [Dynamic Hedge Model](#dynamic-hedge-model)
- [GitHub Integration](#github-integration)
- [Hybrid Development Workflow](#hybrid-development-workflow)
- [References](#references)
- [License / contributions](#license--contributions)
- [Notes](#notes)

<!-- TOC:END -->

## Executive Overview

### Vision

Dynamic Capital brings institutional discipline to the digital asset market by
combining compliant onboarding, intelligent automation, and transparent risk
controls. The platform empowers investors to deploy capital confidently while
engineering teams continue to evolve the product with the full Dynamic Codex
toolchain.

### Strategic Focus

- Deliver regulated-friendly deposit and withdrawal workflows that work across
  traditional banking and on-chain rails.
- Augment trading desks with explainable AI copilot experiences that keep
  humans in the loop.
- Provide a modular foundation—spanning infrastructure, analytics, and
  operations—that scales from pilot programs to multi-entity portfolios.

## Investor Snapshot

### Value Drivers

- **Unified surface area:** A single Next.js codebase powers the Telegram bot,
  web dashboard, and landing experience for consistent messaging and faster
  iteration.
- **Governance-ready architecture:** Supabase-backed data services, auditable
  automations, and configurable guardrails support treasury oversight and
  compliance reviews.
- **AI-enhanced execution:** Integrated research, signal generation, and
  hedging logic compress decision cycles for discretionary and systematic
  strategies alike.

### Traction Signals

- Production-ready Telegram Mini App deployed on DigitalOcean with Supabase for
  authentication, storage, and secure edge functions.
- Automated build pipeline that snapshots the marketing site into `_static/`
  for CDN delivery without exposing secrets.
- Continuous discovery via Dynamic Codex workflows that shorten prototyping
  loops for new trading logic, models, and user journeys.

## Beginner's Guide

### First Steps

1. **Explore the platform story:** Start with the [Executive Overview](#executive-overview)
   to understand the strategy and scope.
2. **Review capabilities:** Dive into [Platform Capabilities](#platform-capabilities)
   for a breakdown of product surfaces, integrations, and AI features.
3. **Follow the workflows:** Use the [Development Workflow](#development-workflow)
   and [Build & Deployment](#build--deployment) sections to see how teams ship
   updates safely.

### Learning Resources

- **Quick reference:** The [Quick Links](#quick-links) section collects saved
  GitHub searches and CLI snippets for deeper due diligence.
- **Technical deep dives:** Explore [Architecture & Docs](#architecture--docs)
  and [Security Features](#security-features) for implementation specifics.
- **Operational readiness:** Consult [Testing & Validation](#testing--validation)
  and [Operational Routines](#operational-routines) to understand monitoring
  and maintenance practices.

## Ecosystem Pillars

### Dynamic Capital Modules

| Module | Focus |
| --- | --- |
| **DYNAMIC CAPITAL WEB3** | Bridges custody, settlement, and network access across leading blockchains. |
| **DYNAMIC CAPITAL TOKEN** | Structures treasury incentives, access tiers, and on-chain governance hooks. |
| **DYNAMIC AGS** | Coordinates governance services to align stakeholders and automate policy enforcement. |
| **DYNAMIC AGI** | Drives the self-improving intelligence loop that continuously retrains and redeploys AI agents. |
| **DYNAMIC AI** | Bundles research assistants, copilots, and analytics dashboards for decision support. |
| **DYNAMIC TRADING LOGIC** | Captures risk rules, execution parameters, and guardrails for discretionary traders. |
| **DYNAMIC TRADING ALGO** | Automates systematic strategies with parameterized bots and adaptive hedging. |
| **DYNAMIC ENGINES** | Powers low-latency execution services, routing, and connectivity with market venues. |
| **DYNAMIC TOOLS** | Provides developer and operator utilities, from observability to workflow orchestration. |
| **DYNAMIC MODELS** | Houses predictive, quantitative, and sentiment models that feed trading decisions. |
| **DYNAMIC** | Represents the shared brand system and experience layer that unites every module. |

These modules operate together to deliver a cohesive ecosystem—from the
on-chain Web3 foundation and token mechanics to intelligence systems, trading
automation, and supporting tooling.

## Interface Layout

The Dynamic Capital experience prioritizes clarity, trust, and real-time signal
delivery for traders and operators. The following guidelines ensure the UI
reinforces brand identity while surfacing critical actions.

### Header

- **Identity first:** Persist the Dynamic Capital logotype and gradient motif to
  anchor the ecosystem branding across the Telegram Mini App and web surfaces.
- **Status-aware controls:** Surface live portfolio health, treasury runway, or
  trading session state with concise iconography and color semantics that follow
  accessibility contrast ratios.
- **Action shortcuts:** Pin universal actions—"Deposit", "Launch AI Copilot",
  and "Review Signals"—so power users can switch contexts without losing
  situational awareness.
- **Telemetry hooks:** Emit lightweight analytics events (`header:view` and
  `header:cta_click`) to keep observability consistent across clients.

### Footer

- **Contextual navigation:** Group navigation targets by workflow pillars (AI,
  Trading, Treasury, Operations) and keep tap targets within 48px minimum height
  for touch ergonomics.
- **Regulatory confidence:** Reserve a footer band for compliance badges,
  jurisdiction disclosures, and updated audit timestamps to reinforce trust.
- **Realtime alerts:** Integrate a non-intrusive toast rail or ticker that can
  surface hedging directives, market volatility flags, or AI audit summaries.
- **Support loop:** Provide a persistent "Need Help?" affordance that routes to
  the Dynamic Support desk or kicks off an in-bot troubleshooting flow.

## What's New

<!-- WHATS_NEW:START -->

- Dynamic AI multi-lobe fusion engine now powers adaptive trade orchestration
  with a Supabase-backed hedging service for real-time guardrails.
- Multi-LLM Studio workspace enables cross-provider strategy design with shared
  prompts, benchmarks, and deployment presets.
- Enhanced Telegram bot console delivers richer admin telemetry, escalation
  tooling, and instant Mini App synchronization.

<!-- WHATS_NEW:END -->

## Quick Links

### Saved GitHub queries

- [Everything you've opened (issues + PRs)](https://github.com/search?q=author%3ADynamic-Capital&type=issues)
- [Only PRs you've opened](https://github.com/search?q=is%3Apr+author%3ADynamic-Capital+sort%3Aupdated-desc&type=pullrequests)
- [Only issues you've opened](https://github.com/search?q=is%3Aissue+author%3ADynamic-Capital+is%3Aopen&type=issues)
- [This repo: your PRs](https://github.com/search?q=repo%3ADynamic-Capital%2FDynamic-Capital+author%3ADynamic-Capital+is%3Apr&type=pullrequests)
- [Everything you're involved in](https://github.com/search?q=involves%3ADynamic-Capital&type=issues)
- [PRs you've reviewed](https://github.com/search?q=is%3Apr+reviewed-by%3ADynamic-Capital&type=pullrequests)
- [PRs requesting your review](https://github.com/search?q=is%3Apr+review-requested%3ADynamic-Capital&type=pullrequests)

> 💡 Add filters like `created:>=2025-09-01` to any query URL above to focus on
> activity within a date range.

### GitHub CLI one-liners

```bash
# All of your PRs in this repo
gh api 'search/issues?q=repo:Dynamic-Capital/Dynamic-Capital+is:pr+author:Dynamic-Capital' -q '.items[].html_url'

# Your commits in this repo
gh api 'repos/Dynamic-Capital/Dynamic-Capital/commits?author=Dynamic-Capital' -q '.[].html_url'
```

## Platform Capabilities

### Telegram Mini App — Next.js + React + Icons

- Built with **Next.js (App Router)** + **React 18**
- Uses **lucide-react** icons (swap to `react-icons` if preferred)
- Telegram theme drives CSS vars (auto updates on theme change)
- App shell with safe areas, bottom tabs, icons
- MainButton/BackButton + haptics helpers in `lib/telegram.ts`

### Install

```bash
pnpm add lucide-react # or: npm i lucide-react
```

### Swap icon library (optional)

If you prefer `react-icons`, remove `lucide-react` imports and:

```bash
pnpm add react-icons
```

Then in `BottomNav.tsx`:

```ts
import { FiActivity, FiHome, FiUser } from "react-icons/fi";
// ...use <FiHome/>, <FiActivity/>, <FiUser/>
```

### Features

- Telegram webhook (200-fast), OCR on images only
- Bank receipts (BML/MIB) auto-verification
- Crypto TXID submissions (no image approvals)
- Optional Mini App (glass theme, 1:1 assets)
- Admin commands for maintenance
- **Dynamic Codex Integration** for AI-powered development
- **Multi-LLM Studio tool** (`apps/web/app/tools/multi-llm`) for comparing
  OpenAI, Anthropic, and Groq chat completions side by side with configurable
  temperature and token limits directly inside the main Next.js app.
- **Market Intelligence Workspace** with curated data rooms, model outputs, and
  deal pipelines for investor-ready insights.
- **Dynamic Market Review automation** that aggregates TradingView signals,
  Telegram alerts, and Supabase events into actionable hedging triggers.
- **`economic-calendar` edge function** streaming macro events into the signal
  bus for instant bot and dashboard consumption.
- Step through the
  [Dynamic AI & Dynamic Trading Algo Enhancement Roadmap](docs/multi-llm-algo-enhancement-roadmap.md)
  to align provider orchestration with the trading automation stack.
- Onboard fast with the [Dynamic AI Overview](docs/dynamic-ai-overview.md)
  summarising the Brain layer, lobe fusion model, and operational guardrails
  that keep automation governed.

### Investor Experience

- **TonConnect onboarding flow** delivers deep links from Telegram, QR fallback,
  and guarded session handshakes so traders can authenticate once and rejoin
  across devices.
- **Automation guardrails** enforce per-user hedging limits, circuit breakers,
  and operator approval queues before new strategies reach production.
- **Supported wallets** include Tonkeeper, OpenMask, and MyTonWallet with
  dynamic capability negotiation for staking, swaps, and signature payloads.

### Treasury & Token

- **Dynamic Capital Token (DCT)** anchors treasury governance with transparent
  supply, vesting cliffs, and fee routing published in the
  [DCT whitepaper](docs/dynamic-capital-ton-whitepaper.md).
- **Live DEX references**: monitor liquidity and pricing on
  [STON.fi](https://app.ston.fi) and [DeDust](https://dedust.io) pairs, with
  hedging hooks synced to the Supabase ledger service.

### Architecture & Docs

Explore the broader platform anatomy and contributor guides:

- [Master meta-model reference](models/meta_model.md) — shared
  state/control/dynamics grammar with module index.
- [Dynamic Capital ecosystem anatomy](docs/dynamic-capital-ecosystem-anatomy.md)
- [Dynamic Capital flow chart](docs/dynamic-capital-flow-chart.md) — high-level
  CI/CD and runtime topology across GitHub, Vercel, Supabase, DigitalOcean, and
  TON.
- [Dynamic AI overview](docs/dynamic-ai-overview.md)
- [Dynamic Trading ALGO vs LOGIC](docs/dynamic-trading-algo-vs-logic.md)
- [Model intelligence & infrastructure reference](docs/model-intelligence-infrastructure-reference.md)
- [Protocol layering framework](docs/dynamic_protocol_layers.md)

#### Dynamic AGI self-improvement loop

`dynamic_agi.DynamicAGIModel` now accepts an optional `DynamicSelfImprovement`
manager that records each evaluation and emits an iterative improvement plan.
Provide realised performance telemetry or human feedback when calling
`evaluate()` so the manager can accumulate session snapshots. The returned
`AGIOutput` includes an `improvement` payload with ranked focus areas,
aggregated metrics, and the latest introspection reports. See
`tests/dynamic_agi/test_dynamic_self_improvement.py` for an end-to-end example.

**Dynamic AGI** abbreviates **Driving Yield of New Advancements in Minds,
Intelligence & Creation — Adapting Global Intelligence**. The
`dynamic_agi.DynamicAGIModel.identity` helper exposes this expansion and its
three pillars (`Driving Yield of New Advancements in Minds`,
`Intelligence &
Creation`, `Adapting Global Intelligence`) so downstream
services can surface consistent branding while reinforcing the platform's
mandate to compound innovation under adaptive intelligence safeguards.

### Dynamic Theme System

The web console and Mini App share a synchronized theming pipeline so traders
see consistent branding across every surface:

- **Instant boot theme** – `apps/web/app/layout.tsx` injects a no-flash script
  that resolves the preferred theme (`system`, `light`, or `dark`) before React
  hydration so the UI renders with the correct palette on first paint.
- **Runtime coordination** – `apps/web/hooks/useTheme.tsx` bridges
  `next-themes`, Telegram `themeParams`, and the Dynamic UI design tokens. It
  stores the active mode in `localStorage`, toggles the appropriate
  `data-theme`/`color-scheme` attributes, and listens for Telegram theme change
  events to keep the Mini App shell in sync.
- **Persisted preferences** – The Supabase edge functions
  `supabase/functions/theme-get/index.ts` and
  `supabase/functions/theme-save/index.ts` read and store user-specific theme
  settings so the dashboard remembers the preferred mode across devices.

When adding new routes or components, rely on the shared `useTheme` hook and the
`ThemeToggle` UI so appearance updates propagate everywhere without duplicating
logic.

### Security Features

- Optional HTTPS server enforces TLS 1.2+ (prefers TLS 1.3) when SSL
  certificates are supplied.
- HTTP Strict Transport Security (HSTS) headers for all responses.
- Lightweight per-IP rate limiting to mitigate basic DDoS attacks.
- Maintains third-party certifications for ISO 27001, SOC 2 Type II, PCI DSS
  Level 1, HIPAA, GDPR, and the EU–US Data Privacy Framework
  ([docs/compliance](docs/compliance/README.md)).

### Privacy & Security

No secrets in this repo; uses environment variables. Service role keys used only
in Edge Functions. Code and assets may be encrypted/obfuscated later. Logs avoid
PII; rate limits enabled.

## Environment Setup

Copy `.env.example` to `.env` and `.env.local`, then adjust values for your
environment. Running `npm run sync-env` later will append newly added variables
from the example file into both destinations without overwriting your values:

```bash
cp .env.example .env
cp .env.example .env.local
```

The example defaults `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to
`http://localhost:3000` so the app works locally out of the box. Replace these
with your deployed domain when staging or going to production.

Create `.env` files for each component and define variables needed in your
deployment.

### Client-side (`NEXT_PUBLIC_*`)

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and can be
shared between the static landing page and the Next.js API service:

```
NEXT_PUBLIC_SUPABASE_URL=... 
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Store these in your hosting platform's environment settings or in
`.env`/`.env.local` for local development. The static site should have access to
the same values at build time.

### Server-only secrets

Keep secrets such as `SUPABASE_SERVICE_ROLE_KEY` or `TELEGRAM_BOT_TOKEN` only in
the environment for the Next.js component. Do **not** prefix them with
`NEXT_PUBLIC_` or expose them in the static site.

For local work, create `.env`/`.env.local` at the repository root and run
`npm run dev` to load the variables. In production, manage secrets through your
platform's configuration for each component.

### Timezone configuration

Build tooling and scheduled jobs assume all services run in UTC. When bringing
up the Docker stack or configuring CI runners, make sure the host OS has the
correct timezone database installed and the `TZ` environment variable set to
`UTC`. The provided Docker image now installs `tzdata` and exports `TZ=UTC`, so
matching the same setting locally keeps timestamps consistent across build
artifacts and logs.

> **Proxy-friendly npm wrapper:** if your terminal session provides legacy
> `npm_config_http_proxy` variables you may see
> `npm warn Unknown env config
> "http-proxy"`. Run commands through
> `node scripts/npm-safe.mjs <npm args>` (for example
> `node scripts/npm-safe.mjs run dev`) to strip the deprecated proxy keys and
> silence the warning while preserving HTTP/HTTPS proxy support.

If you regularly invoke bare `npm` commands (such as `npm audit --omit=dev`) and
want to clean your current shell once per session, run:

```bash
eval "$(node scripts/env/clean-legacy-npm-proxy.mjs)"
```

The helper prints `export`/`unset` commands that remap the legacy proxy
variables to the supported `proxy`/`https-proxy` keys so subsequent npm calls
run without the deprecation warning.

## Project Structure

- **Functions** – Edge functions live under `supabase/functions` and any
  framework-managed API routes belong in `functions/`.
- **Build outputs** – Use `npm run build:all` to compile both the Next.js app
  and mini app functions. Optionally specify an output directory (relative to
  the build context) to control where build assets are generated; if omitted,
  the default location is used.
- **Static snapshot** – Place user-facing assets in `apps/web/public/` and run
  `npm run build:web && npm run build:landing` to mirror the homepage into
  `_static/` for CDN hosting.
- **Root configuration** – Key files like `package.json`, `tsconfig.json`,
  `eslint.config.js`, and `.env.example` sit at the project root. Keep
  `.env.example` updated when adding new environment variables.
- **Go service** – simple HTTP server in `go-service/` with a `/healthz`
  endpoint.
- **Unified builds** – the previous `external/dynamic_codex` Vite workspace has
  been merged; all bot tooling now ships from the Next.js app so the project is
  maintained with a single build pipeline.
- **File organizer** – Run `npm run docs:organize` to regenerate
  `docs/REPO_FILE_ORGANIZER.md`, which groups top-level files by domain so
  contributors can quickly find the right surface.

## Development Workflow

### Project starters

- **Package scripts** – launch development, build, and production with
  `npm run dev`, `npm run build`, and `npm run start` in `package.json`
- **Next.js web app** – main layout and landing page entry points in
  `app/layout.tsx` and `app/page.tsx`. Operational views such as the Telegram
  bot dashboard live directly under `app/telegram`.
- **Telegram bot** – Supabase Edge Function at
  `supabase/functions/telegram-bot/index.ts`
- **Mini App function** – Supabase Edge Function at
  `supabase/functions/miniapp/index.ts`
- **Broadcast planner** – standalone service at `broadcast/index.ts`
- **Queue worker** – standalone service at `queue/index.ts`

### Development Process Overview

| Tool                   | What It Does                                                            | How You Use It                                                                                  |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Dynamic (Platform)** | Hosts your web app, manages deployment, and provides a Supabase backend | Use the Dynamic console to configure environment variables and monitor deployments              |
| **Dynamic (AI)**       | Generates initial project scaffolding and high-level feature guidance   | Use the chat interface during setup and when auto-generating components                         |
| **Telegram/BotFather** | Manages the bot and links it to your web app                            | Run BotFather commands like `/setmenubutton` or `/mybots` to connect the bot to your deployment |
| **Codex CLI**          | Assists with granular, code-level tasks on your local machine           | Use terminal commands for UI refinements, refactoring, and adding features                      |
| **GitHub**             | Version control and deployment trigger                                  | Push local changes to GitHub to trigger Dynamic to rebuild and redeploy your web app            |

### Quick start with Dynamic Codex

#### Using Dynamic Codex (Recommended)

1. Open the project in Dynamic Codex
2. Use the chat interface to describe desired changes
3. Use Visual Edits for quick UI modifications
4. Monitor the live preview for real-time feedback

#### Local Development

```bash
# Create your local environment files
cp .env.example .env
cp .env.example .env.local
# Ensure .env and .env.local have all variables
npm run sync-env

# Start local stack
supabase start

# Serve the function (new terminal)
supabase functions serve telegram-bot --no-verify-jwt

# Ping (expects 200)
curl -X POST "http://127.0.0.1:54321/functions/v1/telegram-bot" \
  -H "content-type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET" \
  -d '{"test":"ping"}'
```

#### Codex CLI workflow helper

The Codex CLI pulls these changes into your local checkout. Run the helper
scripts to reproduce Codex's post-export steps and keep everything in sync:

- `npm run codex:post-pull` – install dependencies, sync environment files,
  validate required variables, and run the combined Dynamic build.
- `npm run codex:dev` – ensure the environment is synced before launching
  `lovable-dev.js` (Next.js dev server with Codex preflight checks).
- `npm run codex:build` – run the Dynamic production build locally (same as
  Codex deploys).
- `npm run codex:verify` – execute the repository verification suite.

Pass extra flags after `--` to tweak the workflow:

```bash
npm run codex:post-pull -- --verify            # run verification after syncing
npm run codex:post-pull -- --no-build          # skip the Dynamic build step
npm run codex:dev -- --no-sync                 # keep existing env values
npm run codex:post-pull -- --dry-run           # list steps without executing
npm run codex:post-pull -- --reset-issues      # clear cached failure history & tips
npm run codex:post-pull -- --agent ui-bot      # isolate failure tracking per Codex agent
npm run codex:post-pull -- --no-shared-cache   # ignore shared install caches for this run
```

Available flags mirror the helper's usage (`--no-install`, `--no-sync`,
`--no-env-check`, `--build-optional`, etc.). See
`scripts/codex-workflow.js --help` for the full reference, and read
`docs/codex_cli_workflow.md` for a deeper walkthrough of recommended flows and
the repository's auto-conflict resolution guardrails.

Assigning an `--agent` name (or exporting `CODEX_AGENT_ID`) keeps failure
history scoped to that agent while still sharing successes with the rest of the
team. The helper fingerprints `package-lock.json` so multiple agents can reuse a
single `npm install` run; pass `--no-shared-cache` if you need to force a fresh
install. The helper remembers which steps failed recently so it can surface
troubleshooting tips the next time you run it. If you want to start fresh, pass
`--reset-issues` to clear that history before executing tasks.

When a command fails, the helper now scans the error output for familiar
patterns (missing package scripts, `MODULE_NOT_FOUND` errors, `ENOENT` paths,
etc.) and prints actionable fixes—like re-creating Codex-exported scripts or
running `npm install` for a missing dependency—so new issues can be resolved
without digging through logs.

Note: for OCR parsing, send an actual Telegram image to the bot; OCR runs only
on images.

## Build & Deployment

### Building

The main build compiles the dashboard only. Run the Mini App build separately
when needed:

```bash
# build the dashboard
npm run build

# build the Telegram Mini App
npm run build:miniapp

# build both targets
npm run build:all
```

`npm run build` produces a standalone bundle in `.next/standalone` which can be
run with `node .next/standalone/server.js`. This output is ideal for Docker or
process managers such as PM2.

#### Bundle analysis

Inspect bundle size by enabling the analyzer during build:

```bash
npm run analyze
# or
ANALYZE=true npm run build
```

### Static snapshot pipeline

Run `npm run build:web` to produce the standalone Next.js server output. Follow
with `npm run build:landing` to boot that server locally, capture the rendered
homepage, and copy the necessary assets into the `_static/` directory. The
hardened `server.js` serves this snapshot for CDN-style hosting, while the
Next.js server continues to power authenticated routes.

All landing page edits now live in `apps/web` (for example, `app/page.tsx` and
the Dynamic UI components). After changing those files, rerun the build steps
above to refresh the snapshot.

### Asset Deployment

- Run `npm run upload-assets` to push the generated `_static` directory to the
  configured CDN. The helper validates `CDN_ENDPOINT` and falls back to the
  regional Spaces endpoint if a custom CDN host is provided by mistake.
- Provide `DIGITALOCEAN_TOKEN`, `CDN_ENDPOINT_ID`, and `CDN_PURGE_PATHS`
  (comma-separated paths such as `/index.html,/`) to let the uploader purge
  stale CDN cache entries through the DigitalOcean API after each upload.
- A GitHub Actions workflow (`upload-assets.yml`) builds the Next.js app, runs
  the landing snapshot helper, and uploads `_static/` on pushes to `main`. It
  expects `CDN_BUCKET`, `CDN_ACCESS_KEY`, `CDN_SECRET_KEY`, and optional
  `CDN_REGION`/`CDN_ENDPOINT` secrets.
- Use
  `npm run do:sync-cdn -- --space <bucket> --region <slug> --apply --show-endpoint`
  to create or update the DigitalOcean CDN endpoint via the REST API and surface
  the endpoint ID. Pass `--custom-domain`/`--certificate-id` when attaching a
  vanity domain, or omit `--apply` for a dry run.
- During development, `npm run upload-assets:watch` monitors `_static` and
  uploads changes automatically.

### Maintenance & Automation

- Regenerate the documentation inventory after touching edge functions or
  environment variables with `npm run docs:summary`. The script updates
  `docs/REPO_SUMMARY.md` so reviewers can confirm every handler exposes a
  default export and spot any new `Deno.env.get` usage.
- Review the [Checklist Directory](docs/CHECKLISTS.md) to find the right
  project, launch, or integration checklist and see which ones have automation
  keys (`npm run checklists`).
- Keep `docs/env.md` in sync when introducing deployment settings such as
  `FUNCTIONS_BASE_URL` or log drain credentials (`LOGTAIL_SOURCE_TOKEN`,
  `LOGTAIL_URL`). Pair updates with the summary script so both docs reference
  the same keys.
- When rotating the Telegram webhook secret, run
  `deno run -A scripts/set-webhook.ts` (or `deno task set:webhook`) after
  deploying the updated function to re-register the webhook with BotFather.
- Scaffold AlgoKit runtime functions with
  `python tools/algo-cli/algokit.py function strategy-name --lang both` to
  create matching Python and TypeScript stubs from the command line.

### 🎨 UI Development with Dynamic Codex

#### Quick UI Guidelines

- **Design System Only**: NEVER use direct colors like `text-white`, `bg-black`.
  Always use semantic tokens from `index.css` and `tailwind.config.ts`
- **Component Structure**: Create focused, reusable components instead of
  modifying large files
- **Visual Edits**: Use Dynamic's Visual Edit button for quick text/color
  changes (saves credits)
- **Real-time Preview**: See changes immediately in the live preview window

#### UI Development Workflow

1. **Chat-driven**: Describe UI changes in natural language
2. **Visual Edits**: Use for simple text/color/font changes
3. **Incremental**: Test each change before requesting more
4. **Design System**: Always use semantic tokens, never hardcoded colors

#### AI-Powered Features

- **Natural Language Coding**: Describe features in plain English
- **Automatic Optimization**: Code is refactored for best practices
- **TypeScript Integration**: Full type safety and IntelliSense support
- **Responsive Design**: Mobile-first approach with proper breakpoints

#### Debugging Tools

- **Console Access**: Real-time console log monitoring
- **Network Inspection**: API call and edge function monitoring
- **Error Detection**: Automatic error identification and fixes
- **Performance Tracking**: Component optimization suggestions

### 🔒 Architecture & Integration Guardrails

#### Telegram Bot ⇄ Mini App Connection

<lov-mermaid>
graph TD
    A[Telegram Bot] -->|Webhook| B[Supabase Edge Functions]
    A -->|/start command| C[Mini App Button]
    C -->|Click| D[Web App Launch]
    D -->|initData auth| B
    B -->|Database| E[Supabase Tables]
    B -->|Storage| F[Receipt Files]

    subgraph "Core Tables"
        E1[bot_users]
        E2[user_subscriptions]
        E3[payment_intents]
        E4[receipts]
        E1 --> E2
        E2 --> E3
        E3 --> E4
    end

    E --> E1

    subgraph "Payment Flow"
        G[Receipt Upload] --> H[OCR Processing]
        H --> I[Bank Parser]
        I --> J{Auto-approve?}
        J -->|Yes| K[Approved]
        J -->|No| L[Manual Review]
    end

    B --> G

</lov-mermaid>

#### 🚨 CRITICAL: DO NOT MODIFY INTEGRATION

**⚠️ NEVER CHANGE THESE CORE SYSTEMS:**

1. **Supabase Database Schema**
   - Tables: `bot_users`, `user_subscriptions`, `payment_intents`, `receipts`
   - Relationships and foreign keys
   - RLS policies and security

2. **Edge Functions Integration**
   - `telegram-bot/index.ts` - Core webhook handler
   - Authentication flow between bot and Mini App
   - Payment processing and OCR pipeline

3. **initData Validation**
   - Telegram Web App authentication mechanism
   - User session handling
   - Security token validation

#### ✅ SAFE TO MODIFY: UI & UX Only

**These areas are safe for UI improvements:**

- **React Components**: All files in `components/`
- **Pages**: All files in `app/`
- **Styling**: `app/globals.css`, `tailwind.config.ts`
- **UI Library**: `components/ui/`
- **Hooks**: `lib/hooks/` (UI-related only)

#### Connectivity Sanity Checks

Before making changes, verify these connections work:

```bash
# 1. Bot webhook responds
WEBHOOK_BASE=${TELEGRAM_WEBHOOK_URL:-https://your-project-ref.functions.supabase.co/telegram-bot}
WEBHOOK_BASE=${WEBHOOK_BASE%/}
curl -X POST "$WEBHOOK_BASE" \
  -H "content-type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: SECRET" \
  -d '{"test":"ping"}'

# 2. Mini App loads
curl -s https://your-project-ref.functions.supabase.co/miniapp/

# 3. Auth endpoint works
curl -X POST https://your-project-ref.functions.supabase.co/verify-initdata \
  -H "content-type: application/json" \
  -d '{"initData":"VALID_INIT_DATA"}'
```

#### Payment Flow Overview

1. **User starts bot** → `/start` command → Creates `bot_users` record
2. **Subscription needed** → Shows plans → Creates `user_subscriptions`
3. **Payment intent** → Bank details shown → Creates `payment_intents`
4. **Receipt upload** → OCR processing → Creates `receipts` record
5. **Auto-verification** → Bank parser → Approves or flags for review
6. **VIP access** → Telegram channel invitation → Updates subscription status

#### Common UI Pitfalls to Avoid

❌ **DON'T:**

- Use `text-white`, `bg-black` or any direct colors
- Modify API endpoints or database queries
- Change authentication flows
- Edit Supabase schema or policies
- Hardcode URLs or tokens

✅ **DO:**

- Use semantic tokens: `text-foreground`, `bg-background`
- Create new UI components for features
- Use the existing design system
- Test in both light and dark modes
- Follow mobile-first responsive design

#### Edge Function Error Handling

Use the `callEdgeFunction` helper to invoke Supabase Edge Functions. It returns
an object with optional `data` and `error` fields instead of throwing on
failure:

```ts
const { data, error } = await callEdgeFunction<MyType>("FUNCTION_NAME");
if (error) {
  // handle error.message / error.status
} else {
  // use typed data
}
```

This pattern keeps error handling consistent across the app and avoids unhandled
promise rejections.

Admin and system functions such as `ADMIN_SESSION` or `RESET_BOT` require
`TELEGRAM_WEBHOOK_SECRET` to be configured. The helper will throw before making
the request if the secret is missing.

### Environment variables

Full list and usage notes: [docs/env.md](docs/env.md).

- The `ALLOWED_ORIGINS` variable controls which domains may call the API and
  edge functions. If unset, it falls back to `SITE_URL` (or
  `http://localhost:3000` when `SITE_URL` is missing).
- See [docs/NETWORKING.md](docs/NETWORKING.md) for port mappings, reverse proxy
  tips, and Cloudflare ingress IPs.
- Copy `.env.example` to `.env.local` and replace the placeholder values with
  real secrets for your environment. This file is ignored by Git so each
  contributor maintains their own local configuration.

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- TELEGRAM_BOT_USERNAME _(optional)_
- TELEGRAM_BOT_URL _(optional)_
- USDT_TRC20_ADDRESS
- TELEGRAM_ADMIN_IDS _(comma-separated Telegram user IDs; spaces are ignored)_
- MINI_APP_URL _(optional)_
- AMOUNT_TOLERANCE _(optional)_
- WINDOW_SECONDS _(optional)_
- OPENAI_API_KEY _(optional)_
- OPENAI_ENABLED _(optional)_
- BENEFICIARY_TABLE _(optional)_
- LOG_LEVEL _(optional)_

#### Build environment

Both the dashboard and the Telegram MiniApp require these variables at build
time (exposed with Next.js `NEXT_PUBLIC_` prefix so they end up in the browser
bundle). `NEXT_PUBLIC_API_URL` is optional and defaults to `/api` if omitted:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# NEXT_PUBLIC_API_URL=https://example.com/api
```

Set the required Supabase values in your hosting provider (e.g., Dynamic
workspace settings). If either value is missing, the app will render a
configuration error screen instead of loading. You can optionally set
`NEXT_PUBLIC_API_URL` to point at a custom API; otherwise the client uses the
relative `/api` path. The client also accepts `SUPABASE_URL`/`SUPABASE_ANON_KEY`
as fallbacks if the `NEXT_PUBLIC_` values are not provided.

Values are set in Supabase function secrets, GitHub Environments, or Dynamic
Codex project settings. Do not commit them.

To troubleshoot `401 Unauthorized` from admin endpoints, generate a known-good
`initData` string and verify it:

```bash
deno run --no-npm -A scripts/make-initdata.ts --id=<your_telegram_id>
curl -X POST -H "Content-Type: application/json" \
  -d "{\"initData\":\"$INITDATA\"}" \
  "$SUPABASE_URL/functions/v1/verify-initdata"
```

### Running with Docker

1. **Build the image**

   ```bash
   DOCKER_BUILDKIT=1 docker build -f docker/Dockerfile -t dynamic-chatty-bot .
   ```

   BuildKit enables caching of Next.js build artifacts. For non-Docker CI, cache
   the `apps/web/.next/cache` directory between runs to speed up builds. GitHub
   Actions uses `actions/cache` with a key derived from `package-lock.json` and
   `apps/web/package.json`:

   ```yaml
   - uses: actions/cache@v3
     with:
       path: apps/web/.next/cache
       key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json', 'apps/web/package.json') }}
   ```

2. **Run the container**

   ```bash
   docker run -p 8080:8080 --env-file .env.local dynamic-chatty-bot
   # or start via Compose with three app replicas
   docker compose up --scale app=3
   ```

3. **Override configuration** using `-e` flags, `--env-file`, or custom `.env`
   files to set `NEXT_PUBLIC_*` or other variables.

4. **Run tests or Supabase functions** within the container:

   ```bash
   docker run --rm dynamic-chatty-bot npm test
   docker run --rm dynamic-chatty-bot npm run serve:functions
   ```

5. **Health check replicas**

   ```bash
   ./docker/healthcheck.sh
   ```

6. **Troubleshooting**
   - If ports like `8080` or `54321` are taken, adjust `-p` mappings or stop the
     conflicting service.
   - Ensure required environment variables are present; missing values may cause
     runtime errors.

#### GitHub Actions Docker smoke test

- The `Docker local smoke test` workflow builds the Compose `app` service image
  and runs a lightweight command inside the resulting container to ensure Docker
  remains functional in CI.
- It runs automatically for pull requests or pushes that touch the `docker/`
  directory (or the workflow file itself) and is also available through the
  **Run workflow** button on the Actions tab for ad-hoc verification.
- To reproduce the same check locally, run
  `docker compose -f
  docker/docker-compose.yml build app` followed by
  `docker compose -f
  docker/docker-compose.yml run --rm --entrypoint node app --version`.

### Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environment vars, tests,
deployment, and troubleshooting. For Nginx + Let's Encrypt on DuckDNS, see
[docs/DUCKDNS_NGINX_CERTBOT.md](docs/DUCKDNS_NGINX_CERTBOT.md).

Set your Supabase project reference for the deploy scripts:

```bash
export PROJECT_REF=<your-project-ref>
```

The commands `npm run deploy:edge`, `npm run edge:deploy:core`, and
`npm run edge:deploy:ops` will read this variable when deploying functions.

Deploy a single function manually:

```bash
supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
```

Set Telegram webhook (with secret): use BotFather or API; do not paste secrets
in README.

## Testing & Validation

### API Demo

A simple `app/api/hello` route returns a JSON greeting. The client page in
`app/api-demo/page.tsx` fetches this endpoint on mount and displays loading,
success, or error states based on the fetch result.

### Tests

- `tests/api/hello.test.ts` calls the route handler and asserts the expected
  JSON payload.
- `tests/app/api-demo/page.test.tsx` renders the demo page with a mocked `fetch`
  and verifies that the message appears.

### TypeScript type checking

Install the web workspace dependencies to make sure browser-only packages such
as `@web3-onboard/*` are available to the compiler, then run the type checker:

```bash
npm install --workspace apps/web
npm run typecheck
```

The type check targets the Next.js Mini App and should complete without warnings
once the workspace dependencies are in place.

If the workspace packages fall out of sync you may see TypeScript errors such as
`Cannot find module '@web3-onboard/core'` during the check. Running the install
command again refreshes the browser-only dependencies so `tsc` can finish
without emitting diagnostics.

### CI / checks

All Deno tasks live in `deno.json` and can be run via `deno task <name>`.

Type check:

```bash
deno check --allow-import supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
```

If tests present:

```bash
deno test -A
```

### Smoke checks

```bash
curl -s https://your-project-ref.functions.supabase.co/miniapp/version
WEBHOOK_BASE=${TELEGRAM_WEBHOOK_URL:-https://your-project-ref.functions.supabase.co/telegram-bot}
WEBHOOK_BASE=${WEBHOOK_BASE%/}
curl -s "$WEBHOOK_BASE/version"
curl -s -X POST "$WEBHOOK_BASE" \
  -H 'x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>' \
  -H 'content-type: application/json' -d '{"test":"ping"}'
```

Confirm the tunnel helper wiring before exposing a localhost webhook via ngrok:

```bash
npm run smoke:tunnel -- --port 54321 --log=stdout
```

The smoke script runs the helper in dry-run mode, surfaces the resolved binary
and arguments, and fails fast if overrides (such as `--port` or `--bin`) are not
applied as expected.

### Local webhook testing

Run Edge Functions locally without JWT verification to exercise webhooks:

```bash
npm run serve:functions
```

Then POST to `http://localhost:54321/functions/v1/telegram-webhook` with
`X-Telegram-Bot-Api-Secret-Token`.

#### Public tunnel for remote QA

If teammates need to validate the webhook or Mini App from outside your network,
expose the local Supabase functions port through a trusted tunnel provider such
as ngrok. A convenience script is available to start the standard tunnel:

```bash
npm run tunnel:functions
```

If you only need to confirm the ngrok arguments or verify custom flags, run the
command in dry-run mode:

```bash
npm run tunnel:functions -- --dry-run
```

Share the resulting HTTPS endpoint with reviewers and map requests to the
appropriate function path. For instance,
`https://exosporal-ezequiel-semibiographically.ngrok-free.dev/` has been used to
proxy the local Telegram webhook during QA sessions—replace it with your own
ephemeral domain and rotate the tunnel token regularly.

## Operational Routines

### Mini App

- Set `MINI_APP_URL` in env (example domain only, do not hardcode).
- Launch via Web App button inside Telegram.
- All UI images should be 1:1 (square).

### VIP Sync

- Bot must be an admin in VIP channels to receive membership updates and call
  `getChatMember`.
- Configure VIP channels via `bot_settings.vip_channels` (JSON array) or env
  `VIP_CHANNELS`.
- Memberships are synced on join/leave events and via `/vip-sync` helper
  endpoints.
- Use `scripts/import-vip-csv.ts` for bulk backfills; users must `/start` the
  bot at least once.

### Go Service

A minimal Go HTTP server lives in `go-service/` and exposes a `/healthz`
endpoint on port `8080`.

#### Build and run

```bash
cd go-service
go run main.go
# or build
go build
./go-service
```

#### Docker

```bash
docker build -f docker/go.Dockerfile -t go-service .
docker run --rm -p 8080:8080 go-service
```

## Automation & Data Pipelines

### Analyst Insights Collector

The discretionary research feed from the Dynamic Capital TradingView profile is
now modelled end-to-end:

- **Database schema** – `public.analyst_insights` stores each idea with
  `symbol`, `bias`, `content`, and `chart_url`. The DAG configuration lives in
  `public.node_configs`; the `human-analysis` node is pre-seeded with a weight
  of `0.25` and points Fusion Brain to this table via
  `metadata.source = "analyst_insights"`.
- **Edge function** – `analysis-ingest` accepts JSON payloads containing the
  fields above. It validates the payload, normalises bias values, and upserts
  rows so duplicate chart URLs can be reprocessed safely.
- **Python scraper** – `collect_tradingview.py` scrapes the public Ideas feed
  and forwards posts to the edge function. Provide credentials via environment
  variables:

  ```bash
  export TRADINGVIEW_USERNAME=DynamicCapital-FX
  export SUPABASE_ANALYSIS_FN_URL="https://<PROJECT_REF>.functions.supabase.co/analysis-ingest"
  export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
  pip install --upgrade requests beautifulsoup4
  python collect_tradingview.py --dry-run  # verify locally
  ```

- **Automation** – `.github/workflows/tradingview-ideas.yml` runs every six
  hours (and on demand) using the secrets `TRADINGVIEW_USERNAME`,
  `SUPABASE_ANALYSIS_FN_URL`, and `SUPABASE_ANON_KEY`. The workflow installs the
  lightweight Python dependencies and executes the collector script.

Set `TRADINGVIEW_LOG_LEVEL=DEBUG` locally to inspect scraping output when
troubleshooting.

### Dynamic Hedge Model

The automated hedge engine now complements the directional trading pipeline:

- **Database schema** – `public.hedge_actions` records every hedge lifecycle
  event with enums for side, reason, and status so dashboards and bots can track
  volatility offsets alongside standard trades.
- **Policy node** – the `dynamic-hedge` entry in `public.node_configs` runs
  every five minutes, watching trades, correlations, and risk settings before
  persisting new hedges and emitting MT5-ready signals.
- **Edge function** – the `dynamic-hedge` Supabase function evaluates ATR
  spikes, drawdown breaches, and high-impact news, logs the action, and queues
  execution orders for the trading core.

## GitHub Integration

This project features **bidirectional GitHub sync** through Dynamic Codex:

- Changes in Codex automatically push to GitHub
- GitHub changes sync back to Codex in real-time
- Built-in version control and rollback capabilities
- CI/CD integration with GitHub Actions
- [Using Personal Access Tokens](docs/GITHUB_PAT.md) for pushes and workflow
  auth

## Hybrid Development Workflow

For a combined approach that keeps production on DigitalOcean while iterating
with Dynamic and local tooling, see
[docs/HYBRID_DEVELOPMENT_WORKFLOW.md](docs/HYBRID_DEVELOPMENT_WORKFLOW.md). It
covers prototyping in Dynamic, exporting via the Codex CLI, local testing, and
syncing changes through GitHub to maintain a seamless deployment pipeline.

## References

| Focus Area                | Resource                                                                 | Description |
| ------------------------- | ------------------------------------------------------------------------- | ----------- |
| Ecosystem architecture    | [dynamic_ecosystem/](dynamic_ecosystem/)                                  | High-level specs and models for the interconnected Dynamic platform pillars. |
| Trading intelligence      | [dynamic_algo/](dynamic_algo/)                                            | Core automation routines orchestrating trading signals and hedging logic. |
| AI research               | [dynamic_ai/](dynamic_ai/)                                                | Machine intelligence experiments, copilots, and model governance assets. |
| Token & treasury          | [dynamic_token/](dynamic_token/)                                          | Tokenomics artifacts plus treasury operations playbooks. |
| Operational guardrails    | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                                  | Deployment, environment, and rollback procedures for production stability. |
| Security & compliance     | [SECURITY.md](SECURITY.md)                                                | Security postures, reporting channels, and ongoing compliance commitments. |
| Developer productivity    | [docs/codex_cli_workflow.md](docs/codex_cli_workflow.md)                  | Codex workflows, templates, and tooling for rapid iteration. |
| Data & analytics pipelines| [data/](data/)                                                            | Datasets, ingestion scripts, and analytics-ready exports. |

## License / contributions

Proprietary / All rights reserved. Review the root [`LICENSE`](LICENSE) file for
usage terms and
[`docs/legal/THIRD_PARTY_LICENSES.md`](docs/legal/THIRD_PARTY_LICENSES.md) for
attribution of bundled open-source components. Personal project; external
PRs/issues are closed by default.

## Notes

Repo keeps source only. No caches (.cas), dist/, or node_modules/ are committed.

Future changes may encrypt code and increase env usage; see
[docs/agent.md](docs/agent.md) for behavior spec and Dynamic Codex integration
details.
