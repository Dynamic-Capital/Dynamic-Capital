# Project Efficiency Playbook

Efficient development in Dynamic Capital relies on three pillars: faster builds,
predictable environments, and targeted validation. This playbook consolidates
repo-specific tactics that keep shipping velocity high without sacrificing
quality.

## 1. Build & Bundle Optimization

- **Use the staged build scripts**: `npm run build:web` and
  `npm run build:landing` are already wrapped in `scripts/npm-safe.mjs`, which
  propagates the correct workspace context. Avoid running `next build`
  directly—leveraging the wrapper ensures shared environment variables and
  workspace caching are respected.
- **Analyze bundles before shipping**: Run `npm run build:web` followed by
  `npm run build:web -- --analyze` (Next.js option) to identify heavy routes.
  Move shared UI into `@/components` and replace large dependencies with lighter
  equivalents when the analyzer flags >200 kB gzip bundles.
- **Enable persistent caching locally**: Set `NEXT_CACHE_DIR=.next/cache` inside
  `.env.local` so that incremental Next.js builds reuse artifacts between runs.
  Pair this with `npm run build:dev` when iterating on SSR logic to catch
  regressions without a full production build.

## 2. Dependency Hygiene

- **Prune unused packages**: After major feature work, run `npx depcheck` to
  surface dead dependencies in `apps/web`. Remove unused packages and rerun
  `npm install` to shrink the lockfile and Docker layers.
- **Lock critical versions**: High-churn libraries like `@langchain/*` and
  `supabase` can introduce breaking changes. Prefer pinning versions in
  `package.json` and update with `npm update <pkg> --depth 0` during scheduled
  maintenance windows.
- **Audit third-party risk**: The repo ships with `npm run audit` and
  `npm run audit:fix`. Schedule the audit script in CI or cron to minimize
  security-driven rework.

## 3. Targeted Validation Workflow

- **Stick to the focused quality gates**: Before opening a PR, run the trio
  `npm run lint`, `npm run typecheck`, and `npm run test`. These map to the App
  Router code paths and prevent slow full-verify runs.
- **Use `npm run verify` sparingly**: The verify script triggers cross-language
  pipelines and can take several minutes. Reserve it for release branches or
  infrastructure edits.
- **Leverage Vitest filters**: When editing isolated utilities under `src/`, run
  `npm run test -- --run tests/path/to/file.test.ts` to avoid the full suite.

## 4. Environment & CI Tips

- **Share `.env.example` updates**: Whenever a new environment variable is
  introduced, update `.env.example` and run `npm run env:report` to document the
  delta. This prevents onboarding churn.
- **Cache Docker layers**: When building the production container, pre-run
  `npm run build:tooling` to compile TypeScript tooling binaries. The Dockerfile
  can then copy the prebuilt artifacts instead of recompiling on each build.
- **Use `scripts/npm-safe.mjs` in CI**: This wrapper injects the correct
  workspace and reproduces local behavior. Calling workspace scripts directly
  inside CI can break symlinked dependencies.

## 5. Monitoring & Feedback Loops

- **Track bundle metrics over time**: Export the analyzer JSON into
  `_static/metrics/` (ignored from deployment) and compare diffs during code
  review. Significant jumps signal code splitting opportunities.
- **Collect perf telemetry from the Mini App**: Hook `@vercel/otel` custom
  traces into user-critical flows (deposit creation, KYC upload) and monitor P95
  latencies. Use the insights to prioritize optimization work.
- **Review cron job durations**: The automation scripts under `scripts/` often
  target Supabase and TON APIs. Add logging around start/end times and route
  them to the existing monitoring stack so regressions are caught quickly.

---

Maintaining efficiency is continuous work. Pair these practices with routine
retrospectives on the build pipeline, and document any deviations inside `docs/`
so the team stays aligned.
