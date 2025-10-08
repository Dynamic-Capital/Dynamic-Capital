# Repository Map & Optimization Plan

_Last updated: 2025-09-17._

## 1. Repository Map

### 1.1 Application & Client Surfaces

| Path                     | Role                   | Notes                                                                                                                                                                                              |
| ------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/`              | Primary Next.js app    | Hosts the marketing landing experience under `app/(marketing)` and the authenticated console under `app/telegram`, with shared UI primitives in `components/` and context providers in `context/`. |
| `apps/landing/`          | Static snapshot helper | Bootstraps a headless capture of the Next.js homepage for the CDN-exported `_static/` bundle, mirroring Dynamic UI components to guarantee parity between SSR and static delivery.                 |
| `_static/` & `server.js` | CDN-friendly export    | Contains the frozen landing snapshot that the hardened Node server serves with cache control, CORS, and `/healthz` for probes.                                                                     |
| `public/` assets         | Shared collateral      | Marketing, favicon, and mini-app assets consumed by both the dynamic Next.js runtime and the static snapshot.                                                                                      |

### 1.2 Automation & Services

| Path                  | Role                | Notes                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/` | Edge function fleet | Deno functions spanning Telegram bot orchestration, private fund flows (`private-pool-*`), payments, analytics, webhook keepers, and AI helpers (`ai-faq-assistant`, `trade-helper`). Shared utilities live in `_shared/` for logging, validation, and secret handling. |
| `broadcast/`          | Campaign scheduler  | Schedules outbound broadcasts and promotional pushes, complementing Supabase cron triggers.                                                                                                                                                                             |
| `queue/`              | Worker harness      | Processes queued background jobs (receipt OCR, payment reconciliation) outside the real-time Telegram event loop.                                                                                                                                                       |
| `go-service/`         | Health shim         | Minimal Go service offering `/healthz` to support uptime monitors and external load balancers.                                                                                                                                                                          |

### 1.3 Data & Infrastructure

| Path                   | Role                    | Notes                                                                                                                           |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/` | Database change log     | Sequential SQL migrations covering schema, policies, and seed data for bots, payments, promos, analytics, and the private pool. |
| `db/`                  | Client utilities        | TypeScript client bindings and schema helpers for accessing Supabase/Postgres resources from non-edge runtimes.                 |
| `docker/`              | Container orchestration | Dockerfiles, Compose definitions, and Nginx reverse proxy config for replicable local or staging environments.                  |
| `dns/`                 | External records        | DigitalOcean zone exports and JSON automation descriptors for infrastructure-as-code around DNS.                                |

### 1.4 Tooling, Quality & Knowledge Base

| Path       | Role                 | Notes                                                                                                                                                                         |
| ---------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/` | Operational scripts  | CLI helpers for setting Telegram webhooks, syncing secrets, refreshing the landing snapshot, and running audits.                                                              |
| `tests/`   | Automated validation | Vitest/Jest suites covering API routes, Supabase policies, Telegram flows, and helper utilities to prevent regressions.                                                       |
| `docs/`    | Enablement hub       | Comprehensive documentation set: deployment runbooks, compliance evidence, phased launch plans, inventories (`REPO_SUMMARY.md`, `INVENTORY.csv`), and environment references. |
| `tools/`   | Developer aids       | Generators and CLIs (e.g., AlgoKit scaffolding) that bootstrap new functions and enforce conventions.                                                                         |

### 1.5 Site Map (Next.js & Supporting Endpoints)

| Route         | Audience / Access       | Description & Key Hooks                                                                                                                                                                                                                                                   |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`           | Public                  | Marketing landing experience rendered via the `OnceLandingPage` composition with CTA handlers deep-linking to the Telegram bot for onboarding, plan selection, and payments. Brand gradients and the animated `BrandLogo` establish the Dynamic Capital look immediately. |
| `/:locale`    | Public                  | Locale-aware alias that reuses the homepage component and layout providers while injecting locale content, keeping routing logic centralized. Locale shells inherit the same brand tokens so translated routes still surface the signature gradients.                     |
| `/telegram`   | Authenticated ops staff | Rich dashboard for monitoring the Telegram bot, reviewing analytics, managing promos, and launching the embedded admin console. The dashboard bootstraps brand-aware providers so charts, alerts, and badges reuse the `dc-brand` palette.                                |
| `/signal`     | Public CDN              | Serves the pre-rendered `_static/index.html` snapshot to host the marketing page without requiring runtime secrets. The static artifact bakes in the same gradient overlays and typography so the CDN host mirrors live branding.                                         |
| `/healthz`    | Ops & monitoring        | JSON health probe exposing status, timestamp, and environment metadata for uptime checks. Branding metadata (app name, environment tags) keeps monitoring dashboards aligned with Dynamic Capital terminology.                                                            |
| `/api`        | Programmatic            | Baseline API heartbeat returning a simple payload with CORS headers for service-level probes. Responses include the branded service identifier so upstream monitors display the correct Dynamic Capital label.                                                            |
| `/api/hello`  | Programmatic            | Demo JSON response plus preflight handler for smoke tests and sample integrations. Payload text references Dynamic Capital to validate that partner sandboxes surface the right branding.                                                                                 |
| `/api/auth/*` | Authenticated           | NextAuth handler wired to the Supabase adapter and GitHub OAuth for secure console sign-in. Metadata passed to identity providers keeps OAuth consent screens consistent with Dynamic Capital’s brand naming.                                                             |

**Brand Alignment Notes**

- Gradient overlays and `BrandLogo` variants are shared between SSR and static
  hosts so animations, typography, and color ramps stay synchronized across
  entry points.
- Supabase-powered content pulls (hero KPIs, testimonials) are wrapped with
  brand-aware typography tokens so marketing copy preserves the Dynamic Capital
  tone.
- CTA links encode `dynamic.capital` deep links that open the Telegram bot in a
  branded context, avoiding mismatched hostnames.

### 1.6 Page Map (Landing `/` Experience)

1. **Hero & Primary CTAs** – Animated headline, value proposition, KPI stats,
   and dual CTAs (“Join the VIP desk”, “Explore how it works”) wired into
   Telegram deep links passed from the page shell. The hero overlays the
   `gradient-brand` background and animated `BrandLogo` to anchor the palette.
2. **Why Dynamic Capital Section** – Three-card feature grid highlighting bank
   verification, crypto routing, and the admin cockpit, each with iconography,
   Once UI motion variants, and `brand-alpha` backgrounds that telegraph the
   Dynamic Capital accent hues.
3. **Plan Selector & Payment Guides** – Split layout pairing plan explainer copy
   with quick-start buttons for bank/crypto flows and pricing cards featuring
   benefits plus “Choose plan” actions. Buttons reuse the `dc-brand` color scale
   so upgrade paths are visually tied to the rest of the funnel.
4. **Workflow Timeline** – Four-step progression from proof submission to funds
   release, emphasizing automation metrics per phase. Each timeline badge uses
   brand-contrast tokens so status chips feel native to the palette.
5. **Social Proof & Final CTA** – Testimonials grid with roles/metrics
   culminating in closing CTAs that launch the Telegram workspace or reach
   support. Quote cards lean on `brand-alpha-weak` surfaces to keep the social
   section on-brand while maintaining readability.
6. **Legacy Chat Assistant Widget (removed)** – Former floating assistant that
   managed open/minimized state, persisted message history, logged to Supabase,
   and offered fallbacks when AI responses failed. Retain telemetry hooks in
   case the experience returns so we can rehydrate the widget without
   re-engineering analytics.

### 1.7 App Map (Telegram Operations Console)

- **ChatAssistantWidget** – Client-side widget that persists message history,
  invokes the `ai-faq-assistant` edge function, logs interactions to Supabase,
  and supplies resilient fallbacks when the AI service is unavailable.
- **BotDashboard (`/telegram`)**
  - **Data bootstrap** – On mount, fetches analytics via
    `supabase.functions.invoke('analytics-data')` and pings `test-bot-status` to
    drive status badges and stats cards.
  - **Welcome view** – Hero header, four key stats, navigation cards (packages,
    support, config, analytics, promos, notifications, admin), and quick actions
    for launching the admin panel, refreshing status, and managing users.
  - **Detail views** – Conditional renders unlock specialized panels:
    - Configuration placeholder guiding admins back to the main dashboard.
    - Subscription management with editable plan cards.
    - Revenue analytics with summary tiles, package performance breakdown, chart
      placeholder, and export actions.
    - Support operations showing ticket metrics and recent requests.
    - Promo manager listing active campaigns with CRUD affordances, performance
      metrics, and clipboard copy for promo codes.
    - Admin view embedding the full `AdminDashboard` component for elevated
      controls.
- **AdminDashboard Component**
  - **Access control & data loading** – Verifies admin rights via Telegram IDs
    or Supabase profile roles, then calls edge functions for analytics and
    pending payments while listening for auth changes to refresh data.
  - **Loading/denied states** – Provides guarded UI with animated loader or
    access-denied messaging as checks resolve.
  - **Operational cockpit** – Once authorized, renders a Dynamic UI–styled shell
    with overview metrics, last-sync badges, and tabbed navigation for payments,
    logs, bans, broadcast manager, and bot diagnostics, including inline
    approve/reject actions on queued payments. The shell injects
    `dc-brand`/`dc-brand-light` tokens into cards, alerts, and tabs so the
    console mirrors the marketing experience.

### 1.8 App Router Route Inventory

Staying future proof means keeping an explicit contract for each App Router
entry point so new routes can be added without breaking assumptions. The tables
below cover UI surfaces (`page.tsx`) and server handlers (`route.ts`), including
the data dependencies that must be honored when scaling features.

#### 1.8.1 UI Page Segments (`page.tsx`)

| Route              | File                                                      | Description                                                                                    | Data & Service Dependencies                                                                                                                                      | Scalability Guardrails                                                                                                                                                       |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | `apps/web/app/page.tsx`                                   | Renders the Once Landing Page shell with the `MultiLlmLandingPage` hero and marketing content. | Currently static marketing copy with Dynamic UI components; optional chroma background pulled from `dynamicUI.effects`.                                          | Preserve shell composition so future CTAs or widgets can slot in without reshaping the layout; consider lazy-loading interactive add-ons if they return.                     |
| `/:locale`         | `apps/web/app/[locale]/page.tsx`                          | Locale-aware alias that re-exports the root page to share layout and logic.                    | Relies on shared translation content loaded higher in the tree (planned `generateStaticParams`) and whichever copy management pipeline feeds the marketing team. | Introduce localized metadata via `generateMetadata` and drive translations through a CMS or JSON bundle per locale; keep re-export pattern to avoid drift between languages. |
| `/telegram`        | `apps/web/app/telegram/page.tsx`                          | Authenticated dashboard entry that mounts `BotDashboard`.                                      | Consumes Supabase Edge functions (`analytics-data`, `test-bot-status`) via React Query, plus session context from `Providers`.                                   | Split panels into feature modules (`components/telegram/*`) as they grow, and gate new admin features behind feature flags stored in Supabase for controlled rollout.        |
| `*` (404 fallback) | `apps/web/app/not-found.tsx`                              | Friendly not-found boundary with CTA back to the homepage.                                     | Depends on the global layout and theme providers.                                                                                                                | Keep copy short and avoid hardcoded product names so the view stays valid as branding evolves; consider wiring telemetry for missing routes to Supabase logs.                |
| Error boundaries   | `apps/web/app/error.tsx`, `apps/web/app/global-error.tsx` | Client-rendered error shells for route-level and root-level failures.                          | Receive error objects from Next.js runtime and render minimal HTML.                                                                                              | When adding async server components, ensure thrown errors remain serializable; hook observability (Sentry/Logflare) via a shared error reporter imported in these files.     |

> **Future Locale Support** – When adding new locales, pair
> `apps/web/app/[locale]/layout.tsx` with a localized metadata exporter and
> share translational resources through a dedicated `/i18n` module to keep the
> route tree maintainable.

#### 1.8.2 Server & Edge Route Handlers (`route.ts`)

| Route         | File                                           | Methods          | Description                                                                        | Downstream Contracts                                                                                                                                               | Scalability Guardrails                                                                                                                                          |
| ------------- | ---------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/signal`     | `apps/web/app/signal/route.ts`                 | `GET`            | Streams the pre-rendered `_static/index.html` snapshot for the CDN marketing host. | Reads from `_static/index.html`; expects `npm run build:landing` to refresh the artifact before deploy.                                                            | If the snapshot grows, switch to async `fs.promises.readFile` and enable caching headers. Consider S3-backed storage when multiple regions need the artifact.   |
| `/healthz`    | `apps/web/app/healthz/route.ts`                | `GET`            | Health probe returning status, timestamp, and environment.                         | Uses `NODE_ENV` config helper; consumed by load balancers and uptime monitors.                                                                                     | Expand payload via shared `health-report` util so future services (Queue, Edge functions) append checks consistently. Keep handler synchronous for low latency. |
| `/api`        | `apps/web/app/api/route.ts`                    | `GET`, `OPTIONS` | Baseline heartbeat with CORS preflight helper.                                     | Depends on `@/utils/http.ts` helpers for JSON responses and method guards.                                                                                         | Reuse the helper when adding new verbs; co-locate integration tests under `tests/api/` to detect contract drift as more services consume the endpoint.          |
| `/api/hello`  | `apps/web/app/api/hello/route.ts`              | `GET`, `OPTIONS` | Demo endpoint mirroring the baseline API response pattern.                         | Shares the HTTP utility helpers and is safe for public demos or smoke tests.                                                                                       | Convert to a template when scaffolding new endpoints—copy the method guards, update the payload, then add load tests before opening to partners.                |
| `/api/auth/*` | `apps/web/app/api/auth/[...nextauth]/route.ts` | `GET`, `POST`    | NextAuth handler using the Supabase adapter and GitHub OAuth for console sign-in.  | Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_ID`, `GITHUB_SECRET` environment variables and the shared `Providers` context for session hydration. | Externalize provider config into `config/auth.ts` when adding more identity providers, and backfill integration tests for sign-in/sign-out flows.               |

### 1.9 Route Evolution & Scalability Guidelines

- **Establish scaffolding commands.** Add
  `npm run generate:route -- --name <segment>` (or a Plop generator) so every
  new route includes testing stubs, telemetry hooks, and documentation updates.
  The generator now ships with the repo—running it creates `layout.tsx`,
  `page.tsx`, loading/error boundaries, an observability helper, optional
  `route.ts`, and a Vitest smoke test under `tests/routes/` for the provided
  segment.
- **Co-locate observability.** Standardize on a lightweight `logRouteRequest`
  helper imported by new `route.ts` files to push metrics into Supabase or
  Logflare. This keeps monitoring coverage consistent as the API surface grows.
- **Honor the global theme contract.** Use the shared `ThemeToggle` and
  `useTheme` hook when introducing new layout segments so `data-theme` and
  Telegram-driven palette updates remain synchronized across marketing and app
  shells.
- **Guard dynamic imports.** When a route adds heavy client components (charts,
  editors), wrap them in `next/dynamic` with SSR disabled and provide skeleton
  fallbacks so the landing experience stays fast on marketing CDNs.
- **Document contracts first.** Before merging a new route, append it to the
  tables above, describe data dependencies, and link to relevant edge functions
  or migrations to avoid orphaned features.
- **Version operational APIs.** For programmatic consumers, adopt `/api/v1/*`
  namespacing as soon as the second integration appears. Use the existing `/api`
  heartbeat as the canonical place to publish supported versions.
- **Automate regression coverage.** Pair any new `page.tsx` or `route.ts` with
  Vitest/Playwright smoke tests (mirroring Section 3’s checklist) so rollback
  safety grows alongside the route map.

### 1.10 GitHub Map (Dynamic Branding Automation)

| Asset                                | Purpose                                                                | Branding Touchpoints                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`           | Runs linting, testing, and documentation drift checks on every commit. | `npm run docs:summary` enforces updates to the site, page, and app maps so brand narratives stay synchronized.        |
| `.github/workflows/assets_audit.yml` | Generates duplicate/orphan asset reports for maintainers to review.    | Protects logo files, gradients, and other branded media by flagging unused assets before they drift out of alignment. |
| `.github/pull_request_template.md`   | Captures risk assessment and sourcing requirements for contributors.   | Requires authors to cite sources for claim-heavy marketing copy, preventing off-brand or unsanctioned positioning.    |
| `.github/labels.yml`                 | Defines triage labels for repository hygiene.                          | Dedicated content/sourcing labels spotlight storytelling work, making it easy to route brand updates for review.      |

## 2. Responsibility Map

| Domain                 | Critical Assets                                                                    | Primary Owner          | Backup Owner           | Notes                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- | ---------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Marketing Experience   | `apps/web/app/(marketing)`, `_static/`, `public/`                                  | Frontend Engineering   | Growth & Content       | Maintain design parity across SSR and static exports; coordinate copy changes with Growth.                       |
| Operations Console     | `apps/web/app/telegram`, `components/dashboard/*`                                  | Operations Engineering | Trading Operations     | Ensure uptime of admin dashboards, integrate new Supabase analytics as trading workflows evolve.                 |
| Telegram Bot Runtime   | `supabase/functions/telegram-*`, `queue/`, `broadcast/`                            | Bot Platform Team      | Backend Engineering    | Manage webhook health, cron schedules, and conversation flows; coordinate with Operations for incident response. |
| Private Fund Pool      | `supabase/functions/private-pool-*`, migrations under `supabase/migrations/*fund*` | Trading Operations     | Finance & Compliance   | Enforce settlement rules, reconcile payouts, and update policies alongside regulatory guidance.                  |
| Compliance & Audits    | `docs/compliance/*`, `supabase/functions/*-audit*`, `scripts/verify/*`             | Compliance Team        | Operations Engineering | Keep attestations current and automate verification scripts in CI.                                               |
| Infrastructure & DevEx | `docker/`, `lovable-*.js`, `tools/`, `scripts/*`                                   | Platform Engineering   | Backend Engineering    | Own build pipelines, container images, Dynamic integration, and developer tooling upgrades.                      |

## 3. Optimization Opportunities & Tracker

- [x] **Document landing build parity checks.** Added an automation notes
      section and parity checklist to `docs/REPO_SUMMARY.md` so marketing
      updates always trigger `npm run build:landing` and `_static/` parity
      reviews.【F:scripts/generate-repo-summary.ts†L138-L152】
- [x] **Group Supabase health functions.** Introduced `_shared/health.ts` and
      refactored `system-health`, `web-app-health`, and `miniapp-health` to
      reuse standardized measurement utilities and response
      shapes.【F:supabase/functions/_shared/health.ts†L1-L143】【F:supabase/functions/system-health/index.ts†L1-L158】【F:supabase/functions/web-app-health/index.ts†L1-L118】【F:supabase/functions/miniapp-health/index.ts†L1-L172】
- [x] **Automate bot resilience audits.** Added
      `scripts/ops/bot-resilience-audit.ts` to ping `telegram-webhook-keeper`,
      calculate queue depth, and log the summary to `admin_logs` for the Ops
      console.【F:scripts/ops/bot-resilience-audit.ts†L1-L117】
- [x] **Harden documentation drift detection.** CI now runs
      `npm run docs:summary` and fails when `docs/REPO_SUMMARY.md` or
      `docs/REPO_MAP_OPTIMIZATION.md` drift from the committed
      state.【F:.github/workflows/ci.yml†L1-L63】
- [x] **Modularize dashboard widgets.** Split the Telegram dashboard into
      dedicated view components under `components/telegram/dashboard` so bundles
      are clearer and views can be
      lazy-loaded.【F:apps/web/components/telegram/BotDashboard.tsx†L1-L109】【F:apps/web/components/telegram/dashboard/WelcomeView.tsx†L1-L210】【F:apps/web/components/telegram/dashboard/PromosView.tsx†L1-L165】

### 3.1 Plan Execution Checklist

**Completed**

- [x] Site map documented for core Next.js and operational endpoints
      (Section&nbsp;1.5). 【F:docs/REPO_MAP_OPTIMIZATION.md†L39-L69】
- [x] Landing page map detailed with CTA flows and section-by-section notes
      (Section&nbsp;1.6). 【F:docs/REPO_MAP_OPTIMIZATION.md†L71-L95】
- [x] App map outlining the Telegram console architecture and major components
      (Section&nbsp;1.7). 【F:docs/REPO_MAP_OPTIMIZATION.md†L97-L139】
- [x] App Router route inventory covering UI and server handlers with
      scalability guardrails (Section&nbsp;1.8).
      【F:docs/REPO_MAP_OPTIMIZATION.md†L141-L205】
- [x] GitHub map documents the automation surfaces that safeguard Dynamic
      Capital branding (Section&nbsp;1.10).
      【F:docs/REPO_MAP_OPTIMIZATION.md†L206-L217】
- [x] Landing build parity checklist captured in the generated repository
      summary so `_static/` stays in sync with marketing routes.
      【F:scripts/generate-repo-summary.ts†L138-L152】
- [x] Supabase health routes share `_shared/health.ts` helpers for consistent
      telemetry and responses.
      【F:supabase/functions/_shared/health.ts†L1-L143】【F:supabase/functions/system-health/index.ts†L1-L158】【F:supabase/functions/web-app-health/index.ts†L1-L118】【F:supabase/functions/miniapp-health/index.ts†L1-L172】
- [x] Bot resilience audit script added under `scripts/ops/` to post keeper and
      queue status into `admin_logs`.
      【F:scripts/ops/bot-resilience-audit.ts†L1-L117】
- [x] CI runs `npm run docs:summary` and fails on drift in repository map
      documentation. 【F:.github/workflows/ci.yml†L1-L63】
- [x] Telegram dashboard refactored into modular view components for analytics,
      promos, support, and welcome flows.
      【F:apps/web/components/telegram/BotDashboard.tsx†L1-L109】【F:apps/web/components/telegram/dashboard/WelcomeView.tsx†L1-L210】【F:apps/web/components/telegram/dashboard/PromosView.tsx†L1-L165】

**Incomplete / Pending**

_None — tracker items in this section have been completed and moved above._

## 4. Usage Playbooks & Checklists

### 4.1 Onboarding Checklist

- [ ] Review Section 1 to map core code surfaces before cloning or running
      services.
- [ ] Align with the responsibility map (Section 2) to identify primary contacts
      for any planned changes.
- [ ] Provision Supabase, Telegram, and Vercel environment variables using the
      secrets scripts referenced in Section 1.4.
- [ ] Run local smoke checks (`npm run lint`, `npm run test`,
      `npm run build:landing`) to confirm the setup mirrors CI expectations.

### 4.2 Planning & Change Management Checklist

- [ ] Confirm impacted domains in Section 2 and tag the listed primary/backup
      owners in the work item.
- [ ] Capture architecture or data model updates in `docs/` alongside the
      relevant code change.
- [ ] Schedule updates to `_static/` or other deploy artifacts if marketing or
      console UI changes are included.
- [ ] Add new operational scripts or jobs to the repository map table in Section
      1 for discoverability.

### 4.3 Continuous Improvement Checklist

- [ ] Review the tracker in Section 3 during sprint planning and update statuses
      or add new optimization ideas.
- [ ] After shipping an optimization, document the outcome in the commit message
      and mark the checklist item as complete.
- [ ] Re-run `npm run docs:summary` (and associated CI checks) to ensure
      documentation drift is caught.
- [ ] Share learnings in the Ops or Platform channels and update the
      responsibility map if ownership shifts.
