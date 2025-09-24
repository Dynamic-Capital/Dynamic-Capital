# Branch Naming Guide

## Overview

Dynamic Capital uses service-scoped branches so each deployable surface can be
prepared, validated, and promoted independently before landing in `main`.
Reference this guide when cutting new branches, wiring CI filters, or auditing
deployment triggers.

## Long-lived service branches

| Branch            | Purpose                                                                                          | Owned directories & focus areas                                                                                                      | Deployment target                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `main`            | Integration trunk that aggregates the latest production-ready commits from every service branch. | Cross-cutting changes that span multiple services and shared packages.                                                               | Acts as the source of truth for staging and production promotions.   |
| `web/main`        | Baseline for the Next.js marketing site and admin dashboard.                                     | `apps/web/`, `_static/`, `docs/`, frontend-specific config (`tailwind.config.ts`, `postcss.config.js`, `vite.config.ts`).            | Vercel and DigitalOcean App Platform deployments serving the web UI. |
| `bot/main`        | Source of truth for Supabase Edge Functions powering the Telegram bot.                           | `supabase/functions/`, `scripts/telegram-*`, server-side shared libs under `supabase/functions/_shared/`.                            | Supabase functions deployments and BotFather webhook updates.        |
| `miniapp/main`    | Anchors the Telegram Mini App shell and supporting tooling.                                      | Mini App build scripts (`scripts/*miniapp*`), Mini App smoke tests under `tests/`, `_static/` assets exported for the Mini App host. | Supabase-hosted Mini App bundle and CDN snapshot refreshes.          |
| `broadcast/main`  | Coordinates broadcast workers that fan out notifications.                                        | `broadcast/`, relevant Supabase functions (`broadcast-*`), queue configuration that feeds broadcast events.                          | Scheduled broadcasts and cron-triggered deliveries.                  |
| `queue/main`      | Manages asynchronous job runners and queue health checks.                                        | `queue/`, queue-specific scripts under `scripts/queue*`, monitoring utilities in `scripts/verify/`.                                  | Worker containers and monitors that process queued jobs.             |
| `go-service/main` | Stabilizes the standalone Go HTTP service.                                                       | `go-service/`, shared Go modules, Docker artifacts for the Go runtime.                                                               | Deployed Go binaries or containers (e.g., health check endpoints).   |

> [!NOTE]
> Service branches always fork from the latest `main` commit. Promote validated
> changes by fast-forwarding the service branch, then open an integration PR
> from the service branch back into `main`.

## Short-lived branch patterns

| Pattern                         | When to use                                                                                                      | Example                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `<service>/feature/<slug>`      | Net-new functionality or UI surfaced by a single service.                                                        | `web/feature/multi-language-onboarding` |
| `<service>/fix/<slug>`          | Bug fixes that stay scoped to one service branch.                                                                | `bot/fix/receipt-validation`            |
| `<service>/chore/<slug>`        | Maintenance work, dependency upgrades, or automation tweaks.                                                     | `queue/chore/bump-worker-timeouts`      |
| `hotfix/<slug>`                 | Urgent fixes that need to bypass normal release cadence. Merge into the affected service branch and then `main`. | `hotfix/reset-webhook-secret`           |
| `integration/<service>-to-main` | Coordinated promotion from a service branch back into `main`. Use when multiple commits need a combined review.  | `integration/web-to-main`               |

### Additional guidelines

- Keep feature branches rebased on their target service branch to simplify
  fast-forward merges.
- Prefer descriptive slugs using lowercase letters and hyphens.
- Archive temporary investigative branches locally or under a personal fork;
  only push branches that follow these conventions to the canonical remote.
- Update automation filters (`web/*`, `bot/*`, etc.) and branch protections when
  introducing a new long-lived service branch.
