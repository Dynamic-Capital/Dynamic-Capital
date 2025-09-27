# Project Optimization Roadmap (Audit Reset)

_Last reviewed: 2025-09-27._

The previous revision of this roadmap listed every initiative as complete even though the
codebase does not yet implement most of the described work. This update resets the plan
based on what is actually present in the repository so teams can track real progress.

## Audit summary

- Service ownership is not mapped: `CODEOWNERS` only lists a default maintainer group and a
  few broad directories, and the main checklist document does not enumerate owners or
  escalation paths.
- No baseline performance artifacts or Supabase telemetry snapshots are stored under
  `_static/` or in the trading runbook, so we lack frozen reference points for future
  improvements.
- Observability helpers exist for the default API route, but Supabase Edge functions and the
  job queue only emit basic logs without correlation identifiers or health endpoints.
- Front-end performance work such as dynamic imports or Server Component migrations has not
  been landed; key pages still render large client components directly.
- CI enforces `npm run build`, `npm run typecheck`, `npm run lint`, and `npm run test`, but it
  does so in a single job—matrix builds and release automation remain TODOs.

## Phase 0 — Establish baselines

- [ ] **Map ownership and workflows**
  - Extend `CODEOWNERS` with per-surface owners and mirror the same table in
    `docs/dynamic-capital-checklist.md` so escalation paths are explicit.
  - Capture pager/escalation guidance for Supabase edge functions and queue jobs inside
    `docs/RUNBOOK_start-not-responding.md` or linked runbooks.
- [ ] **Capture current health metrics**
  - Generate a Lighthouse report for `apps/web/app/page.tsx` and commit it under
    `_static/metrics/`.
  - Export queue latency, Supabase function durations, and bot uptime snapshots to
    `docs/trading-runbook.md` for comparison against future changes.
- [ ] **Audit documentation freshness**
  - Annotate stale runbooks and setup guides with `<!-- TODO: Needs update -->` markers so the
    follow-up work is trackable in docs and code search.

## Phase 1 — Tighten observability & resiliency

- [x] **Instrument the core API entrypoint**
  - `apps/web/app/api/route.ts` already wraps its handler with `withApiMetrics`, which records
    counters, histograms, and in-flight gauges in
    `apps/web/observability/server-metrics.ts`.
- [ ] **Extend structured logging**
  - Teach `supabase/functions/_shared/logger.ts` to append correlation IDs, request metadata,
    and execution timings so downstream logs can be linked.
  - Plumb those IDs through high-volume edge functions (receipt OCR, plan sync) and queue
    processors.
- [ ] **Instrument critical flows beyond the default API**
  - Wrap the Telegram webhook, receipt ingestion, and payment review edge functions with the
    same metrics helper to emit latency and error counters.
  - Add a `/queue/healthz` endpoint (or extend the Go service) to expose queue depth, oldest
    job age, and worker heartbeat signals rather than the current static `ok` response.
- [ ] **Harden fallback paths**
  - Implement stale-while-revalidate caching and circuit breakers in Supabase edge functions
    that front Telegram or plan APIs, ensuring the Mini App continues to serve cached data
    during upstream outages.

## Phase 2 — Performance & cost optimization

- [ ] **Client performance**
  - Convert the Telegram `BotDashboard` page to load via `next/dynamic` or route segments so
    the initial payload only streams the visible panels.
  - Audit the `(marketing)` routes and migrate static content to React Server Components where
    interactive hooks are not required.
  - Evaluate bundle analysis output and add budgets to CI to catch regressions.
- [ ] **Edge & queue efficiency**
  - Batch Supabase writes in queue processors that currently perform per-record operations.
  - Shift GPU-intensive tasks from synchronous HTTP handlers to scheduled queue workers with
    progress reporting.
- [ ] **Cost controls**
  - Track which training jobs rely on Colab or other free tiers and document escalation to
    spot/preemptible instances for longer runs.
  - Centralize demo hosting guidance (e.g., Hugging Face Spaces vs. Vercel previews) in the
    docs so contributors know where to deploy experiments.

## Phase 3 — Automation & delivery maturity

- [ ] **CI/CD hardening**
  - Split the existing GitHub Actions pipeline into matrix jobs for Next.js, Supabase (Deno),
    and Go targets so failures are scoped and parallelized.
  - Cache npm, Deno, and Go module directories to reduce rerun times.
- [ ] **Testing expansion**
  - Add Deno unit tests for Supabase edge functions and wire them into the required checks.
  - Expand Vitest coverage for webhook handlers and queue processors, including failure-path
    assertions.
  - Introduce ML experiment regression tests (e.g., snapshotting metrics) so `dynamic_ai/`
    changes are verifiable.
- [ ] **Release automation**
  - Formalize staging, canary, and production environments with per-environment config files
    and Supabase projects.
  - Automate changelog generation and release note templates as part of the deployment
    workflow.
  - Generate `_static/` snapshots during deploys to capture evidence for audits.

## Phase 4 — Strategic scaling

- [ ] **Feature flag framework**
  - Ship a shared feature flag client (e.g., `apps/web/lib/feature-flags.ts`) that reads from
    Supabase tables or environment-driven configurations.
  - Document rollout procedures so payments, AI copilots, and other sensitive flows can be
    toggled safely.
- [ ] **Cross-surface consistency**
  - Centralize plan metadata in a shared module under `packages/` for reuse across the web
    app, Telegram console, and edge functions.
  - Align design tokens so React UI and Supabase-rendered emails pull from the same theme
    definitions.
- [ ] **Continuous optimization loop**
  - Schedule quarterly architecture reviews that compare Supabase spend, queue throughput, and
    Core Web Vitals against the Phase 0 baselines once they exist.
  - Maintain `docs/IMPROVEMENT_OPPORTUNITIES.md` as a rolling backlog with owner, status, and
    metric impact fields, updating it whenever new optimization work is identified.

## Quick-win backlog

- [ ] Add response-time logging to the `/api` route output so we can inspect latency samples in
    application logs until a centralized metrics backend is available.
- [ ] Publish a lightweight queue status endpoint returning depth, in-flight counts, and
    failure totals.
- [ ] Wire Colab notebooks for `dynamic_ai/` experiments to an MLflow or alternative tracker and
    document how artifacts are synced back into the repository.
- [ ] Update `docs/IMPROVEMENT_OPPORTUNITIES.md` with owner and impact metadata for each entry.
- [ ] Ensure CI always runs `npm run lint`, `npm run typecheck`, and `npm run test` on pull
    requests (already true today) and surface the results in PR comments for faster review.

Use this roadmap as a living document—review it during weekly syncs, tick items off as work
ships, and extend the plan when new surfaces come online.
