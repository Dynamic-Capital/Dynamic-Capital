# Project Health Audit — 2025-10-06

## Executive Summary

- The Dynamic Capital monorepo remains operational with a passing quality gate
  sweep (`lint`, `typecheck`, and 149 Deno/Vitest checks).
- No known production vulnerabilities were detected via
  `npm audit --production`.
- Dependency drift is accumulating across key runtime and observability
  packages, especially the OpenTelemetry stack and integration SDKs.

## Codebase Signals

- **Runtime & Tooling:** Node.js 20 workspace with Next.js app in `apps/web` and
  extensive Deno-based scripting. Shared scripts (e.g., `scripts/npm-safe.mjs`)
  guard environment defaults for local runs.
- **Quality Gates:** Project relies on ESLint, TypeScript strictness, and
  Deno/Vitest suites (`npm run test`) for regression coverage. The test suite
  exercises Telegram bot logic, Supabase integrations, TON smart-contract
  simulators, and HTTP hardening scenarios.
- **Operational Support:** README documents multi-surface deployment
  (DigitalOcean, TON gateway) and emphasizes codified workflows for mini app +
  bot parity.

## Recent Validation Results (2025-10-06)

| Check          | Command                  | Result                                      | Notes                                                                                                              |
| -------------- | ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Lint           | `npm run lint`           | ✅ Pass                                     | Observed npm warning about deprecated `http-proxy` config key.                                                     |
| Typecheck      | `npm run typecheck`      | ✅ Pass                                     | Same npm warning surfaced; execution completed successfully.                                                       |
| Tests          | `npm run test`           | ✅ Pass (149 passed / 0 failed / 1 ignored) | Deno pulled dependencies on first run; suite covers bots, APIs, TON contracts, Supabase fallbacks, and UI helpers. |
| Security Audit | `npm audit --production` | ✅ Pass                                     | No vulnerabilities found; `npm` recommends switching to `--omit=dev` in the future.                                |

## Dependency Risk Snapshot

- **Observability stack lagging:** OpenTelemetry family (`@opentelemetry/*`,
  `@vercel/otel`) remains on 0.57.x / 1.13.x while the ecosystem has advanced to
  0.206.x / 2.x. Expect breaking changes; plan a coordinated upgrade to align
  telemetry semantics and exporter compatibility.
- **Core platform SDKs outdated:** `@supabase/supabase-js@2.58.0` and
  `@ton/ton@15.3.1` are behind their latest minor revisions, potentially missing
  bug fixes and API improvements.
- **AI/LLM dependencies drifting:** `@langchain/openai` and `openai` packages
  trail their rapid release cadence. Evaluate upgrade impact on prompt pipelines
  and request adapters.
- **Front-end ecosystem:** Major version gaps exist for `react-router-dom`
  (7.x), `tailwind-merge` (3.x), `vite` (7.x), and `zod` (4.x). Introduce
  upgrade spikes to keep tooling aligned with community standards while watching
  for breaking API changes.

## Operational Opportunities

1. **Proxy configuration cleanup:** Replace deprecated `http-proxy` npm config
   with canonical `proxy` / `https-proxy` keys to silence warnings and ensure
   future compatibility.
2. **Telemetry modernization:** Schedule an OpenTelemetry upgrade sprint to
   adopt 2.x SDKs, verify metric exporters, and adjust instrumentation glue in
   `apps/web`.
3. **SDK regression plan:** Create upgrade playbooks for Supabase and TON
   libraries, including contract/client compatibility tests, before bumping
   versions.
4. **Automated dependency monitoring:** Wire `npm outdated` and Deno module
   freshness checks into CI reporting to surface drift earlier.

## Suggested Next Steps

- Prioritize telemetry + Supabase SDK upgrades with targeted regression coverage
  for bot webhooks, analytics endpoints, and TON operations.
- Continue weekly execution of `npm run lint`, `npm run typecheck`, and
  `npm run test` to guard against regression, ideally through scheduled CI
  workflows.
- Maintain the zero-vulnerability posture by integrating `npm audit --omit=dev`
  into CI and reviewing new advisories promptly.
