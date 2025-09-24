# Workflow reference

This repository standardises its automation around a small set of reusable building blocks located in `.github/actions/`. The table below summarises each active workflow, its purpose, triggers, required checks, and noteworthy artifacts.

| Workflow | Purpose | Triggers | Required check name | Key jobs / outputs | Artifacts |
| --- | --- | --- | --- | --- | --- |
| [`tests.yml`](../.github/workflows/tests.yml) | Runs lint, typecheck, unit tests, build, and migration verification across protected branches. | `push`/`pull_request` on `dev`, `main`, `release/**`, `hotfix/**`. | `tests` | Single `tests` job using the shared Node/Deno setup composite. | None |
| [`env-validate.yml`](../.github/workflows/env-validate.yml) | Ensures the environment map is up to date by running `npm run env:validate`. | `push`, `pull_request` | `env-validate` | `env-validate` job. | None |
| [`migrations-check.yml`](../.github/workflows/migrations-check.yml) | Validates drizzle migrations (or the project fallback command). | `push`, `pull_request` | `migrations-check` | `migrations-check` job. | None |
| [`preview-and-screenshots.yml`](../.github/workflows/preview-and-screenshots.yml) | Builds Vercel previews for the web and landing apps, captures Playwright screenshots, and comments on PRs. | `pull_request` (opened/synchronize/reopened) | – | Jobs: `preview-web`, `preview-landing`, `screenshots`, `comment`. Screenshots job outputs preview artifact URL. | `playwright-screenshots` artifact retained for 3 days |
| [`release.yml`](../.github/workflows/release.yml) | Runs semantic-release on pushes to `main`. | `push` on `main` | (optional) `release` | `release` job (skipped on forks). | None |
| [`go-live.yml`](../.github/workflows/go-live.yml) | Manual production promotion pipeline covering Supabase, Vercel, DigitalOcean, bridge restart, and verification loop. | `workflow_dispatch` | – | Jobs execute sequentially with reusable composites and final health verification. | None |

## Reusable composites

| Composite action | Purpose |
| --- | --- |
| [`setup-node-pnpm`](../.github/actions/setup-node-pnpm/action.yml) | Detects workspace package manager, installs dependencies with caching, and optionally installs Deno. |
| [`supabase-deploy`](../.github/actions/supabase-deploy/action.yml) | Installs Supabase CLI, deploys functions, and applies migrations when credentials are present. |
| [`vercel-deploy`](../.github/actions/vercel-deploy/action.yml) | Deploys preview or production environments with guardrails around missing tokens and production events. |
| [`do-app-deploy`](../.github/actions/do-app-deploy/action.yml) | Authenticates with doctl and triggers App Platform deployments by ID or name. |
| [`bridge-restart`](../.github/actions/bridge-restart/action.yml) | Uses SSH to refresh remote bridge services and optionally verify healthchecks. |
| [`playwright-screenshots`](../.github/actions/playwright-screenshots/action.yml) | Runs Playwright-based screenshot capture and publishes artifacts for review. |

## Required status checks

Branch protection should target the following check names:

- `tests`
- `env-validate`
- `migrations-check`

## Triggering workflows

- **tests**: push or PR touching protected branches.
- **env-validate**: any push/PR event.
- **migrations-check**: any push/PR event.
- **preview-and-screenshots**: automatically for repository PRs (skips forked PRs).
- **release**: push to `main` (skips when repository is marked as a fork).
- **go-live**: manual `workflow_dispatch` invocation from the Actions tab.

Each workflow is idempotent: reruns reuse caches and guard against missing deployment credentials. Preview deployments will comment with Vercel URLs and screenshot artifact links for quick QA. Production deploys should ensure requisite secrets (`PROD_*`, `DO_*`, `BRIDGE_*`, etc.) are configured prior to triggering `go-live`.
