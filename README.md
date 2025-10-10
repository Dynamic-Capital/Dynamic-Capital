# Dynamic Capital — Web3

<!-- BADGES:START -->
<!-- BADGES:END -->

**Fast, verified deposits for traders across bank and crypto rails.**

## Table of Contents

<!-- TOC:START -->
- [Overview](#overview)
- [What's New](#whats-new)
- [Quick Links](#quick-links)
  - [Saved GitHub Queries](#saved-github-queries)
  - [GitHub CLI One-Liners](#github-cli-one-liners)
  - [Efficiency Resources](#efficiency-resources)
- [Platform Capabilities](#platform-capabilities)
  - [Telegram Mini App](#telegram-mini-app)
  - [Feature Highlights](#feature-highlights)
  - [Investor Experience](#investor-experience)
  - [Treasury and Token](#treasury-and-token)
- [Architecture](#architecture)
  - [Workspace Layout](#workspace-layout)
  - [Dynamic AGI Self-Improvement Loop](#dynamic-agi-self-improvement-loop)
  - [Dynamic Theme System](#dynamic-theme-system)
  - [Security Features](#security-features)
  - [Privacy and Data Handling](#privacy-and-data-handling)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
    - [Client Runtime Variables](#client-runtime-variables)
    - [Server-Side Secrets](#server-side-secrets)
    - [Timezone Discipline](#timezone-discipline)
- [Development Workflow](#development-workflow)
  - [Source Structure](#source-structure)
  - [Working with Dynamic Codex](#working-with-dynamic-codex)
    - [Recommended Codex Flows](#recommended-codex-flows)
    - [Local Development Commands](#local-development-commands)
  - [UI Development Guidelines](#ui-development-guidelines)
    - [AI-Powered Features](#ai-powered-features)
    - [Debugging Tools](#debugging-tools)
  - [Architecture and Integration Guardrails](#architecture-and-integration-guardrails)
    - [Telegram Bot ⇄ Mini App Connection](#telegram-bot--mini-app-connection)
    - [Critical Surfaces](#critical-surfaces)
    - [Safe-to-Modify Areas](#safe-to-modify-areas)
    - [Connectivity Sanity Checks](#connectivity-sanity-checks)
    - [Mini App Data Pipelines](#mini-app-data-pipelines)
    - [Common UI Pitfalls to Avoid](#common-ui-pitfalls-to-avoid)
    - [Edge Function Error Handling](#edge-function-error-handling)
- [Testing and Quality](#testing-and-quality)
  - [Core Checks](#core-checks)
  - [Targeted Smoke Workflows](#targeted-smoke-workflows)
  - [Local Webhook Testing](#local-webhook-testing)
    - [Public Tunnel for Remote QA](#public-tunnel-for-remote-qa)
- [Build and Deployment](#build-and-deployment)
  - [Building](#building)
    - [Bundle Analysis](#bundle-analysis)
  - [Static Snapshot Pipeline](#static-snapshot-pipeline)
  - [Asset Deployment](#asset-deployment)
  - [Maintenance and Automation](#maintenance-and-automation)
  - [Environment Variables](#environment-variables)
    - [Build Environment](#build-environment)
  - [Running with Docker](#running-with-docker)
    - [GitHub Actions Docker Smoke Test](#github-actions-docker-smoke-test)
  - [Deployment](#deployment)
- [Operational Routines](#operational-routines)
  - [Mini App](#mini-app)
  - [VIP Sync](#vip-sync)
  - [Go Service](#go-service)
    - [Build and Run](#build-and-run)
    - [Docker](#docker)
- [Automation and Data Pipelines](#automation-and-data-pipelines)
  - [Analyst Insights Collector](#analyst-insights-collector)
  - [LLM-Native Crawling Stack](#llm-native-crawling-stack)
  - [Dynamic Hedge Model](#dynamic-hedge-model)
- [GitHub Integration](#github-integration)
- [Hybrid Development Workflow](#hybrid-development-workflow)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Notes](#notes)
<!-- TOC:END -->

## Overview

Dynamic Capital delivers a Telegram-first experience for capital onboarding. A
Next.js application (under `apps/web`) powers both the marketing landing page and
the authenticated Mini App dashboard, while Supabase handles storage,
authentication, and real-time orchestration.

> **Browser fallback:** Standard DNS resolvers cannot resolve `.ton` domains and
> may return `DNS_PROBE_FINISHED_NXDOMAIN`. Use the TON Foundation gateway at
> <https://ton.site/dynamiccapital.ton> or install a TON-enabled wallet
> extension (for example, MyTonWallet) to access production content hosted at
> `DynamicCapital.ton`. Legacy self-hosted proxies remain documented for
> redeployments.

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

### Saved GitHub Queries

- [Everything you've opened (issues + PRs)](https://github.com/search?q=author%3ADynamic-Capital&type=issues)
- [Only PRs you've opened](https://github.com/search?q=is%3Apr+author%3ADynamic-Capital+sort%3Aupdated-desc&type=pullrequests)
- [Only issues you've opened](https://github.com/search?q=is%3Aissue+author%3ADynamic-Capital+is%3Aopen&type=issues)
- [This repo: your PRs](https://github.com/search?q=repo%3ADynamic-Capital%2FDynamic-Capital+author%3ADynamic-Capital+is%3Apr&type=pullrequests)
- [Everything you're involved in](https://github.com/search?q=involves%3ADynamic-Capital&type=issues)
- [PRs you've reviewed](https://github.com/search?q=is%3Apr+reviewed-by%3ADynamic-Capital&type=pullrequests)
- [PRs requesting your review](https://github.com/search?q=is%3Apr+review-requested%3ADynamic-Capital&type=pullrequests)

> 💡 Add filters such as `created:>=2025-09-01` to any query URL to focus on
> activity within a specific date range.

### GitHub CLI One-Liners

```bash
# All of your PRs in this repo
gh api 'search/issues?q=repo:Dynamic-Capital/Dynamic-Capital+is:pr+author:Dynamic-Capital' -q '.items[].html_url'

# Your commits in this repo
gh api 'repos/Dynamic-Capital/Dynamic-Capital/commits?author=Dynamic-Capital' -q '.[].html_url'
```

### Efficiency Resources

- [Project efficiency playbook](docs/project-efficiency.md) — repo-specific
  tactics for faster builds, leaner dependencies, and predictable validation.

### GitHub Web Tips

- Append `.patch` or `.diff` to any GitHub commit, PR, or file comparison URL to
  access a plaintext diff that's ideal for quick reviews or copy/paste
  workflows.

## Platform Capabilities

### Telegram Mini App

- Built with **Next.js (App Router)** + **React 18** in `apps/web`.
- Hosted on DigitalOcean with Supabase as the real-time backend.
- Provides fast bank OCR deposit capture and crypto TXID verification.

### Feature Highlights

- Dynamic Codex accelerates UI development with live components, design tokens,
  and telemetry-backed linting.
- Lucide icon set by default with optional swap to `react-icons`.
- Built-in analytics for Telegram session flow, performance, and retention.

### Investor Experience

- Single onboarding pipeline covering KYC, deposit verification, and escalation
  paths.
- Role-aware dashboards with guardrails for treasury managers, analysts, and
  support teams.

### Treasury and Token

- Configurable hedging strategies orchestrated via Supabase edge functions.
- Token metrics surfaced across Mini App and marketing properties with
  configurable refresh intervals.

## Architecture

Dynamic Capital is organized as a multi-service workspace with a shared design
system and automation layer.

### Workspace Layout

- **Apps** — `apps/web` (Next.js surfaces) and `apps/landing` (static collateral
  builds).
- **Services** — Go- and Node-based backends, plus Supabase edge functions under
  `supabase/functions`.
- **Automation** — Cron-based data pulls, Telegram sync jobs, and TradingView
  integration in `automation/` and `scripts/`.
- **Core Libraries** — Shared domain logic, adapters, and design tokens in
  `core/` and `shared/`.
- **Data** — Supabase schema, analytics exports, and cold storage snapshots in
  `supabase/` and `data/`.

### Dynamic AGI Self-Improvement Loop

Operational telemetry feeds Dynamic Codex with prompt, test, and deployment
history to recommend optimal workflows and remediation steps.

### Dynamic Theme System

A theming layer ensures brand consistency between Mini App, marketing site, and
admin dashboards. Tokens are distributed via shared packages and consumed by
Tailwind and CSS-in-JS utilities.

### Security Features

- Role-based access with Supabase policies and JWT session scopes.
- Telegram bot ↔ Mini App handshake validation enforced via signature checks and
  expiry windows.
- Edge functions protect payment orchestration and shield direct network access
  to private infrastructure.

### Privacy and Data Handling

User data is scoped to the minimal fields required for capital onboarding.
Access to production secrets and audit trails is governed by Vault-backed
rotation policies and security playbooks documented in `docs/security/`.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+ (pnpm 8+ is also supported)
- Supabase CLI (for database migrations)
- Docker (optional, for parity with CI smoke tests)

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and supply credentials. Environment variables
are grouped by surface to avoid accidental leakage across contexts.

#### Client Runtime Variables

Public configuration used by the Mini App and marketing site. Avoid embedding
secrets in these values.

#### Server-Side Secrets

Supabase keys, Telegram bot tokens, and payment processors belong in server-side
variables. Reference them via platform secrets in deployment targets.

#### Timezone Discipline

Ensure the host machine uses UTC when running database migrations or cron jobs.
CI containers assume UTC and may drift if local overrides are in place.

## Development Workflow

### Source Structure

- `apps/` — Runtime surfaces (Next.js apps, Go services, bots).
- `core/` — Shared domain logic, adapters, and design tokens.
- `automation/` — Scheduled jobs, ingestion scripts, and exporters.
- `_static/` — Snapshot of the marketing landing page produced by the build
  pipeline.

### Working with Dynamic Codex

#### Recommended Codex Flows

Dynamic Codex provides guided flows for UI scaffolding, copy iteration, and test
creation. Pair it with GitHub PR templates for rapid feedback loops.

- `npm run codex:post-pull` — Apply workspace migrations after syncing main.
- `npm run codex:dev` — Launch Codex-driven development flows.
- `npm run codex:verify` — Run Codex governance checks before opening a PR.

#### Local Development Commands

```bash
npm run dev          # Next.js Mini App & marketing surfaces
npm run dev:lovable  # Dynamic preview runner for design experiments
npm run build        # Production build for apps/web and apps/landing
```

### UI Development Guidelines

- Prefer composition and shared components over duplication.
- Organize Tailwind classes by layout → spacing → typography → visual order.
- Snapshot significant UI updates via `_static/` regeneration before release.

#### AI-Powered Features

Leverage the Multi-LLM Studio workspace to test prompts locally before shipping
changes. Store reusable prompt sets in `content/prompts/`.

#### Debugging Tools

Use the built-in telemetry panel (press `⌘`/`Ctrl` + `.`) to inspect network
calls, latency, and Supabase RPC logs while developing.

### Architecture and Integration Guardrails

#### Telegram Bot ⇄ Mini App Connection

Never bypass Telegram's init data verification. Use helpers in
`apps/web/lib/telegram.ts` for consistent validation.

#### Critical Surfaces

Avoid editing handshake endpoints, signature verification, or token exchange
flows without architecture approval. Supabase functions under
`supabase/functions/telegram-*` enforce these guarantees.

#### Safe-to-Modify Areas

Copy updates, layout adjustments, and component tweaks are safe provided they do
not alter API contracts.

#### Connectivity Sanity Checks

Use `npm run verify` to execute the aggregated repository validation workflow
(including Telegram connectivity checks) after network or schema changes.

#### Mini App Data Pipelines

Mini App views rely on services in `apps/web/services/miniapp`. Review the data
contracts before introducing new Supabase queries.

#### Common UI Pitfalls to Avoid

- Mismatched Telegram theme tokens
- Unhandled loading states for Supabase mutations
- Hard-coded currency formatting without locale awareness

#### Edge Function Error Handling

Edge functions emit structured errors for observability. Surface user-safe
messages in the Mini App while logging details to Supabase and Sentry.

## Testing and Quality

### Core Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run format -- --check
```

### Targeted Smoke Workflows

- `npm run verify` — Full-stack validation including static exports and edge
  deploy simulations.
- `npm run smoke:tunnel` — Sanity-check public tunnels used for Telegram webhook
  testing.

### Local Webhook Testing

Use `npm run tunnel:functions` to start a local tunnel and replay canned
payloads.

#### Public Tunnel for Remote QA

Expose local instances through `npm run smoke:tunnel` when collaborating with
remote reviewers.

## Build and Deployment

### Building

```bash
npm run build
```

#### Bundle Analysis

```bash
npm run analyze
```

### Static Snapshot Pipeline

The build pipeline exports the marketing landing page into `_static/` for CDN
hosting without runtime secrets.

### Asset Deployment

Use `npm run upload-assets` to publish design tokens, icon sets, and static
artifacts.

### Maintenance and Automation

Automated workflows reside under `.github/workflows`. Scheduled jobs run via the
`automation/` workspace and surface telemetry in Supabase.

### Environment Variables

Group secrets by environment and surface. Production values live in the platform
secret store of the target (DigitalOcean, Vercel, Fly.io, etc.).

#### Build Environment

Use `.env.build` when running CI pipelines locally to match the GitHub Actions
build context.

### Running with Docker

```bash
docker compose up --build
```

#### GitHub Actions Docker Smoke Test

CI invokes `docker compose -f docker-compose.ci.yml up` for validation. Mirror
that locally when troubleshooting build failures.

### Deployment

- Marketing and Mini App: DigitalOcean + Supabase edge functions
- Bots and cron jobs: Fly.io and Supabase scheduled functions
- Go services: Container registry → Kubernetes workloads

## Operational Routines

### Mini App

Daily checks verify Supabase migrations, Telegram bot webhooks, and payment
processor connectivity.

### VIP Sync

Weekly account reviews align treasury balances, premium support tickets, and
escalations. Update playbooks in `docs/operations/vip-sync.md` after each run.

### Go Service

#### Build and Run

```bash
make go-service
./bin/go-service
```

#### Docker

```bash
docker build -t dynamic-capital/go-service -f go-service/Dockerfile .
```

## Automation and Data Pipelines

### Analyst Insights Collector

`automation/collectors/analyst-insights.ts` ingests TradingView and Telegram
feeds into Supabase for downstream strategy modeling.

### LLM-Native Crawling Stack

`dynamic_crawl/` provides modular crawlers with embeddings, summarization, and
signal tagging pipelines.

### Dynamic Hedge Model

`dynamic_hedge_model/` orchestrates hedging strategies with risk guardrails and
feeds the Multi-LLM Studio for scenario analysis.

## GitHub Integration

Use repository project boards for roadmap visibility. Automation syncs PR labels
with deployment environments, and CODEOWNERS ensures the correct reviewers are
requested automatically.

## Hybrid Development Workflow

Blend Dynamic Codex guidance with human review. Start features in Codex, move to
local development for polishing, then rely on GitHub checks for gating releases.

## Contributing

Review [CONTRIBUTING.md](CONTRIBUTING.md) for branching strategy, review
expectations, and release processes. Please follow the Code of Conduct when
interacting with the community.

## Security

Responsible disclosure guidelines live in [SECURITY.md](SECURITY.md). Report
vulnerabilities privately via GitHub Security Advisories or email
[security@DynamicCapital.ton](mailto:security@DynamicCapital.ton).

## License

This project is proprietary to Dynamic Capital. Review the full terms in
[LICENSE](LICENSE) before using or distributing the code.

## Notes

- Regenerate `_static/` whenever marketing copy or hero assets change.
- Use the governance dashboards in `apps/web`'s `/ops` routes for deployment
  readiness checks prior to production releases.
