# Dependency Update Review

_Last refreshed: `npm outdated` on 2025-09-30 07:53 UTC_

## Snapshot
- **Total packages flagged:** 47 (includes duplicates across workspaces).
- **Major-version gaps:** `@sentry/nextjs`, `react-router-dom`, `tailwind-merge`, `three`, and the OpenTelemetry stack all trail by at least one major release.
- **Tooling drift:** Node type definitions, Playwright, Supabase tooling, and the Vite/Vitest ecosystem have minor or patch updates available.

Use the tables below to triage upgrades by impact and required effort.

## Immediate attention (major / breaking changes)
| Package | Current → Latest | Key considerations |
| --- | --- | --- |
| `@sentry/nextjs` | 8.55.0 → 10.16.0 | Review Sentry v9/v10 migration notes, especially the unified browser/server SDK changes and next-gen replay pipeline requirements. |
| `react-router-dom` | 6.30.1 → 7.9.3 | v7 promotes data routers and changes lazy-loading defaults. Audit custom routing utilities before upgrading. |
| `tailwind-merge` | 2.6.0 → 3.3.1 | v3 rewrites conflict resolution; snapshot key UI surfaces to detect styling regressions. |
| `@hookform/resolvers` | 3.10.0 → 5.2.2 | Aligns with `react-hook-form` v7+. Review custom resolver logic and async validation flows. |
| `react-resizable-panels` | 2.1.9 → 3.0.6 | Breaking API changes around layout persistence—verify dashboard editors and design tooling. |
| `three` | 0.165.0 → 0.180.0 | Large rendering engine leap. Test WebGL features and shader pipelines before rollout. |
| `zod` | 3.25.76 → 4.1.11 | v4 defaults to `passthrough` and alters transform behavior. Update validation logic across `apps/web` and `apps/landing`. |
| OpenTelemetry packages (`@opentelemetry/*`, `@vercel/otel`) | 0.57.x → 0.205.0 / 2.0.0 | Coordinate SDK, instrumentation, and resource upgrades. Expect configuration changes to tracing/metrics setup. |

## Planned upgrades (minor / patch)
| Package | Current → Wanted | Latest | Notes |
| --- | --- | --- | --- |
| `@aws-sdk/client-s3` | 3.887.0 → 3.899.0 | 3.899.0 | Safe to pick up with the next deployment run after smoke testing S3 operations. |
| `@headlessui/react` | 2.2.8 → 2.2.9 | 2.2.9 | Patch upgrade; verify modal/focus management across supported browsers. |
| `@vitejs/plugin-react` | 4.7.0 → 4.7.0 | 5.0.4 | Investigate compatibility with the current Vite major before bumping. |
| `@playwright/test` | 1.55.0 → 1.55.1 | 1.55.1 | Patch release; run CI e2e suite post-upgrade. |
| `@supabase/supabase-js` | 2.57.4 → 2.58.0 | 2.58.0 | Minor features and fixes; confirm auth/session flows. |
| `@tailwindcss/typography` | 0.5.18 → 0.5.19 | 0.5.19 | Low risk patch. |
| `@tanstack/react-query` | 5.89.0 → 5.90.2 | 5.90.2 | Review deprecation warnings during local QA. |
| `dotenv` | 16.6.1 → 16.6.1 | 17.2.3 | Node 20 compatible—upgrade alongside other tooling patches. |
| `@types/node` | 22.18.3 → 22.18.7 | 24.6.0 | Keep in sync with runtime support; monitor for Node 20+ API additions. |
| `@types/react` | 19.1.13 → 19.1.16 | 19.1.16 | Update to capture the latest JSX typing refinements. |
| `framer-motion` | 12.23.16 → 12.23.22 | 12.23.22 | Animation bug fixes; validate marquee interactions. |
| `inngest` | 3.40.3 → 3.43.1 | 3.43.1 | Minor workflow engine updates. |
| `lovable-tagger` | 1.1.9 → 1.1.10 | 1.1.10 | Patch release. |
| `mime-types` | 2.1.35 → 2.1.35 | 3.0.1 | v3 technically major, but API is backwards compatible for most consumers. Confirm server bundlers before upgrading. |
| `posthog-js` | 1.266.2 → 1.268.8 | 1.268.8 | Collect regression metrics post-upgrade. |
| `react-day-picker` | 9.10.0 → 9.11.0 | 9.11.0 | Minor improvements. |
| `sass` | 1.93.0 → 1.93.2 | 1.93.2 | Patch update. |
| `supabase` (CLI) | 2.40.7 → 2.47.2 | 2.47.2 | Apply during next infra maintenance window. |
| `tsx` | 4.20.5 → 4.20.6 | 4.20.6 | Small bug fixes. |
| `typescript-eslint` | 8.44.0 → 8.45.0 | 8.45.0 | Run `npm run lint` and `npm run typecheck` after bump. |
| `vite` | 7.1.6 → 5.4.20 | 7.1.7 | The workspace constraint pins to 5.x; bump to 5.4.20 then evaluate the 7.x migration guide. |
| `vitest` | 2.1.9 → 2.1.9 | 3.2.4 | Blocked by breaking changes; schedule once Vite 7 strategy is set. |
| `date-fns` | 3.6.0 → 3.6.0 | 4.1.0 | Review breaking changes before opting into v4; calendar math is sensitive. |
| `drizzle-kit` | 0.31.4 → 0.31.5 | 0.31.5 | Patch-level CLI fixes; re-run migrations locally post-upgrade. |
| `eslint-plugin-react-refresh` | 0.4.20 → 0.4.22 | 0.4.22 | Keeps Fast Refresh diagnostics current. |
| `globals` | 15.15.0 → 15.15.0 | 16.4.0 | Jump to 16.x when lint tooling supports the updated browser globals list. |
| `jsdom` | 26.1.0 → 26.1.0 | 27.0.0 | Major release aligns with Node 20; run SSR/unit tests before adoption. |
| `lucide-react` | 0.462.0 → 0.462.0 | 0.544.0 | Coordinate with workspace root to avoid duplicate bundles. |
| `recharts` | 2.15.4 → 2.15.4 | 3.2.1 | Major release introduces tree-shaking and API tweaks—schedule after design QA. |
| `sonner` | 1.7.4 → 1.7.4 | 2.0.7 | v2 refactors toast API; pair with design review. |
| `tesseract.js` | 5.1.1 → 5.1.1 | 6.0.1 | Major upgrade bundling wasm improvements; validate OCR pipelines. |

_The workspace also reports duplicate entries for shared dependencies (`posthog-js`, `tsx`, etc.); upgrade them in lockstep to avoid version skew between the monorepo root and `apps/web`._

## Special cases & alignment tasks
- **`next-auth` beta vs stable:** Currently pinned to `5.0.0-beta.29` while `4.24.11` is the latest stable release. Decide whether to continue on the beta track or revert to the stable channel to reduce risk.
- **`lucide-react` divergence:** `apps/web` uses `0.462.0` whereas the workspace root references `0.544.0`. Align versions to prevent duplicate icon bundles.
- **Type definition drift:** `@types/node` (22.18.3 → 22.18.7) and `@types/react` (19.1.13 → 19.1.16) have small bumps available. Bundle these with the next lint/typecheck pass.
- **`deno` shim mismatch:** The npm shim reports `2.1.14` as latest even though the project depends on `^2.5.x`. Keep the current version until the shim catches up or we migrate to the official installer.
- **Observability stack:** When planning the OpenTelemetry major upgrade, include `@vercel/otel` and verify exporter compatibility with our current metrics pipeline.

## Recommended next steps
1. **Schedule a focused sprint** for the major upgrades listed above, pairing each with regression test plans (routing, telemetry, UI). 
2. **Batch the patch/minor updates** (Playwright, Supabase tooling, React Query, etc.) into a single PR and run `npm run lint`, `npm run typecheck`, and relevant test suites.
3. **Re-run `npm outdated`** after each batch lands to track remaining drift and catch any new releases.
