# Dynamic Capital Repository Inventory

_Last updated: 2025-09-15 (UTC)._

## 1. Product snapshot

- Telegram-first deposit automation with optional Mini App plus a static
  marketing site, all backed by Supabase for data storage and automation
  flows.【F:README.md†L1-L39】
- A single Next.js app renders both the marketing landing page and the
  authenticated mini app. The build pipeline captures the homepage into
  `_static/` so it can be served without runtime secrets while the `/app` routes
  stay dynamic.【F:README.md†L10-L57】【F:README.md†L96-L117】

## 2. Application surfaces

### Web & Mini App delivery

- **`apps/landing/`** – Snapshot helper that reuses the Next.js build to capture
  the homepage into `_static/` for CDN
  hosting.【F:README.md†L96-L117】【18a1b8†L1-L19】
- **`apps/web/`** – Main Next.js application powering the public landing page
  and authenticated dashboard with feature-specific folders for routes (`app/`),
  UI (`components/`), hooks, and configuration (`next.config.mjs`,
  `tailwind.config.ts`, etc.).【F:README.md†L16-L39】【e9cdd9†L1-L6】
- **`_static/` + `server.js`** – Hardened Node server that serves the exported
  landing snapshot with caching, CORS, security headers, and a `/healthz`
  check.【F:README.md†L96-L117】【304716†L1-L112】
- **`Procfile`** – Declares the production start command for the standalone
  Next.js server so PaaS platforms can boot the app.【1512da†L1-L2】

### Background and CLI services

- **`broadcast/index.ts`** – Standalone broadcast planner referenced in the
  project overview for scheduling outbound messaging
  jobs.【4bcdf6†L1-L2】【6cb097†L1-L2】
- **`queue/index.ts`** – Lightweight worker harness for queued tasks that
  complement the Telegram workflows.【a55bc1†L1-L2】【416f4d†L1-L2】
- **`go-service/`** – Minimal Go HTTP service (with `main.go` and `go.mod`) that
  exposes a `/healthz` endpoint for infrastructure
  probes.【F:README.md†L58-L65】【bf9fee†L1-L2】

## 3. Supabase platform & data layer

- **`supabase/functions/`** – Large catalog of Deno Edge Functions covering
  Telegram bot logic, mini-app operations, admin tooling, payments, analytics,
  and health checks. Shared helpers live in `_shared/` alongside
  feature-specific directories such as `telegram-bot`, `miniapp`, `admin-*`, and
  `analytics-*` families.【b6622b†L1-L86】【ffcaaf†L1-L10】
- **`supabase/migrations/`** – Sequential SQL migrations that manage tables,
  policies, indexes, and seed data for the Supabase/Postgres backend (dozens of
  files spanning bot content, payments, promotions, subscriptions, and
  auditing).【7456a1†L1-L20】
- **`supabase/config.toml` & `supabase/functions/_tests/`** – Supabase CLI
  configuration and targeted Deno tests (`miniapp-health`, `start-command`,
  `webhook-secret`) that validate deployed
  functions.【a5daed†L1-L2】【9b6ab9†L1-L2】
- **`db/`** – Local TypeScript client and schema references (`client.ts`,
  `schema.ts`) for interacting with the database outside of Supabase Edge
  Functions.【ddbcb5†L1-L2】

## 4. Supporting infrastructure & configuration

- **`docker/`** – Container assets including app and Go service Dockerfiles,
  compose file, Nginx config, and health check script for running the stack in
  controlled environments.【b095f5†L1-L2】
- **`dns/`** – DNS zone export (`dynamic-capital.ondigitalocean.app.zone`;
  update when a fresh export is captured) and DigitalOcean automation config
  (`dynamic-capital.lovable.app.json`) used to reproduce external
  records.【a93f31†L1-L2】
- **`apps/web/app/telegram/`** – Next.js route for the Telegram operations
  dashboard, replacing the standalone Dynamic Codex Vite workspace so bot
  tooling ships from the unified
  build.【F:apps/web/app/telegram/page.tsx†L1-L11】【F:README.md†L96-L117】
- **`lovable-build.js` / `lovable-dev.js`** – Helper scripts that bootstrap
  environment variables and orchestrate combined Next.js + miniapp builds when
  running on Dynamic’s deployment platform.【e53642†L1-L36】

## 5. Tooling, documentation & testing

- **`scripts/`** – Operational CLI scripts for building miniapp bundles, setting
  Telegram webhooks, syncing environments, performing audits, and running
  verification suites (`verify/`, `cleanup/`, `ops/`, etc.).【13847a†L1-L8】
- **`docs/`** – Extensive knowledge base with deployment guides, checklists,
  networking notes, Supabase audits, and workflow documentation; includes
  machine-generated `INVENTORY.csv` for line-of-code and size
  tracking.【e6c7f6†L1-L32】【648e45†L1-L120】
- **`tests/`** – Vitest/Jest-style suites validating API routes, miniapp
  options, Telegram flows, payments policies, and utility helpers, plus stubs
  for Supabase and Telegram integrations.【fd35fe†L1-L12】

## 6. Quick directory reference

| Path                     | Purpose / Highlights                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/landing/`          | Helper workspace that captures the Next.js homepage into `_static/` for CDN deployment.【F:README.md†L96-L117】【18a1b8†L1-L19】                   |
| `apps/web/`              | Next.js app powering both the landing page and dashboard with rich component, hook, and config subfolders.【F:README.md†L16-L39】【e9cdd9†L1-L6】  |
| `_static/` & `server.js` | Landing snapshot served through the hardened Node static server with security headers and health checks.【F:README.md†L96-L117】【304716†L1-L112】 |
| `broadcast/index.ts`     | Broadcast planner entry point for scheduled outbound messaging.【4bcdf6†L1-L2】【6cb097†L1-L2】                                                    |
| `queue/index.ts`         | Worker harness for queued Telegram operations.【a55bc1†L1-L2】【416f4d†L1-L2】                                                                     |
| `supabase/functions/`    | Comprehensive suite of Deno Edge Functions plus shared helpers for bot, admin, analytics, and miniapp tasks.【b6622b†L1-L86】【ffcaaf†L1-L10】     |
| `supabase/migrations/`   | Database schema, policy, index, and seed migrations for Supabase/Postgres.【7456a1†L1-L20】                                                        |
| `scripts/`               | Automation scripts for builds, deployments, audits, and environment checks.【13847a†L1-L8】                                                        |
| `docs/`                  | Repository documentation, checklists, and inventories for onboarding and audits.【e6c7f6†L1-L32】【648e45†L1-L120】                                |
| `tests/`                 | Automated test suites and stubs covering APIs, miniapp flows, and Telegram integrations.【fd35fe†L1-L12】                                          |
| `docker/`                | Containerization and reverse proxy assets (Dockerfiles, Compose, Nginx, health checks).【b095f5†L1-L2】                                            |
| `go-service/`            | Auxiliary Go health service exposing `/healthz`.【bf9fee†L1-L2】                                                                                   |
| `dns/`                   | Exported DNS zone records.【a93f31†L1-L2】                                                                                                         |
| `apps/web/app/telegram/` | Telegram bot dashboard route now served from the main Next.js build.【F:apps/web/app/telegram/page.tsx†L1-L11】                                    |
| `db/`                    | TypeScript database client/schema utilities.【ddbcb5†L1-L2】                                                                                       |
| `Procfile`               | Platform startup definition pointing at the Next.js standalone server build.【1512da†L1-L2】                                                       |

## 7. Trading automation scaffolding

- **`algorithms/`** – Workspace for the TradingView Pine Script strategies,
  Vercel webhook receiver, and MetaTrader 5 Expert Advisor. Each sub-folder
  ships with a README that outlines recommended structure, handoff expectations,
  and next steps so the automation pipeline can come together
  incrementally.【F:algorithms/README.md†L1-L18】【F:algorithms/pine-script/README.md†L1-L33】【F:algorithms/vercel-webhook/README.md†L1-L29】【F:algorithms/mql5/README.md†L1-L31】
