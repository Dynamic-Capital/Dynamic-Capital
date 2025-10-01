# Dependency Update Review

_Last refreshed: `npm outdated` on 2025-09-30 08:12 UTC_

## Snapshot

- **Total packages flagged:** 28 (includes duplicates across workspaces).
- **Major-version gaps:** `@sentry/nextjs`, `react-router-dom`,
  `tailwind-merge`, `three`, and the OpenTelemetry stack all trail by at least
  one major release.
- **Tooling drift:** Remaining patch upgrades are concentrated around Vite
  tooling (`@vitejs/plugin-react`), the npm `deno` shim, and `inngest` (blocked
  by Vite 6/7 peer requirements).

Use the tables below to triage upgrades by impact and required effort.

## Immediate attention (major / breaking changes)

| Package                                                     | Current → Latest         | Key considerations                                                                                                                 |
| ----------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@sentry/nextjs`                                            | 8.55.0 → 10.16.0         | Review Sentry v9/v10 migration notes, especially the unified browser/server SDK changes and next-gen replay pipeline requirements. |
| `react-router-dom`                                          | 6.30.1 → 7.9.3           | v7 promotes data routers and changes lazy-loading defaults. Audit custom routing utilities before upgrading.                       |
| `tailwind-merge`                                            | 2.6.0 → 3.3.1            | v3 rewrites conflict resolution; snapshot key UI surfaces to detect styling regressions.                                           |
| `@hookform/resolvers`                                       | 3.10.0 → 5.2.2           | Aligns with `react-hook-form` v7+. Review custom resolver logic and async validation flows.                                        |
| `react-resizable-panels`                                    | 2.1.9 → 3.0.6            | Breaking API changes around layout persistence—verify dashboard editors and design tooling.                                        |
| `three`                                                     | 0.165.0 → 0.180.0        | Large rendering engine leap. Test WebGL features and shader pipelines before rollout.                                              |
| `zod`                                                       | 3.25.76 → 4.1.11         | v4 defaults to `passthrough` and alters transform behavior. Update validation logic across `apps/web` and `apps/landing`.          |
| OpenTelemetry packages (`@opentelemetry/*`, `@vercel/otel`) | 0.57.x → 0.205.0 / 2.0.0 | Coordinate SDK, instrumentation, and resource upgrades. Expect configuration changes to tracing/metrics setup.                     |

## Completed minor / patch upgrades

| Package                       | Previous → Current  | Notes                                              |
| ----------------------------- | ------------------- | -------------------------------------------------- |
| `@aws-sdk/client-s3`          | 3.887.0 → 3.899.0   | Confirmed S3 helpers during regression tests.      |
| `@headlessui/react`           | 2.2.8 → 2.2.9       | Modal/focus QA unchanged.                          |
| `@playwright/test`            | 1.55.0 → 1.55.1     | `npm run test` covers the e2e smoke suite.         |
| `@supabase/supabase-js`       | 2.57.2 → 2.58.0     | Addressed type changes in shared Supabase helpers. |
| `@tailwindcss/typography`     | 0.5.15 → 0.5.19     | Applied across `apps/web`.                         |
| `@tanstack/react-query`       | 5.56.2 → 5.90.2     | No new deprecation warnings in local QA.           |
| `dotenv`                      | 16.6.1 → 17.2.3     | Keeps CLI alignment with Node 20.                  |
| `@types/node`                 | 22.5.5 → 22.18.7    | Synced with the supported runtime API surface.     |
| `@types/react`                | 19.1.12 → 19.1.16   | Captures the latest JSX type refinements.          |
| `drizzle-kit`                 | 0.31.4 → 0.31.5     | CLI patches applied; migrations validated locally. |
| `eslint-plugin-react-refresh` | 0.4.9 → 0.4.22      | Keeps Fast Refresh diagnostics current.            |
| `framer-motion`               | 12.23.16 → 12.23.22 | Animation regressions not observed.                |
| `globals`                     | 15.9.0 → 16.4.0     | Linting updated after the bump.                    |
| `lovable-tagger`              | 1.1.9 → 1.1.10      | Patch release absorbed at the repo root.           |
| `mime-types`                  | 2.1.35 → 3.0.1      | Verified bundler compatibility.                    |
| `posthog-js`                  | 1.262.0 → 1.268.8   | Telemetry dashboards checked for continuity.       |
| `react-day-picker`            | 9.9.0 → 9.11.0      | UI smoke tests pass.                               |
| `sass`                        | 1.80.4 → 1.93.2     | Build pipeline unaffected.                         |
| `sonner`                      | 1.5.0 → 2.0.7       | Toast API migration completed across `apps/web`.   |
| `supabase` (CLI)              | 2.40.7 → 2.47.2     | Ready for the next infra window.                   |
| `tsx`                         | 4.20.5 → 4.20.6     | Ensures alignment with script tooling.             |
| `lucide-react`                | 0.462.0 → 0.544.0   | Versions aligned between root and workspaces.      |

## Remaining planned upgrades (minor / patch)

| Package                | Current → Latest | Status                                                                                                                                       |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vitejs/plugin-react` | 4.7.0 → 5.0.4    | Requires validation against the current Vite 5 toolchain before adopting the new major.                                                      |
| `deno` (npm shim)      | 2.5.0 → 2.1.14   | Upstream publishes older shims than the version in use—hold until the shim catches up or migrate to the official installer.                  |
| `inngest`              | 3.40.3 → 3.43.1  | Blocked: the new release requires Vite ^6/^7 via optional `@sveltejs/kit` peer dependencies. Revisit once the Vite upgrade plan is in place. |
| `vitest`               | 2.1.9 → 3.2.4    | Continue to block until Vite 7 migration is scoped.                                                                                          |

## Special cases & alignment tasks

- **`next-auth` beta vs stable:** Currently pinned to `5.0.0-beta.29` while
  `4.24.11` is the latest stable release. Decide whether to continue on the beta
  track or revert to the stable channel to reduce risk.
- **`inngest` + Vite:** v3.43.1 introduces a peer dependency on
  `@sveltejs/kit@^2` which, in turn, expects Vite ^6/^7. Stay on 3.40.3 until
  the Vite upgrade path is settled.
- **Observability stack:** When planning the OpenTelemetry major upgrade,
  include `@vercel/otel` and verify exporter compatibility with our current
  metrics pipeline.

## Recommended next steps

1. **Schedule a focused sprint** for the major upgrades listed above, pairing
   each with regression test plans (routing, telemetry, UI).
2. **Plan the Vite 6/7 migration** so `@vitejs/plugin-react`, `inngest`, and
   `vitest` can advance together without tooling breakage.
3. **Re-run `npm outdated`** after the Vite/tooling work lands to verify no new
   drift has accumulated.
