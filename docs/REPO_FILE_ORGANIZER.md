# Repository File Organizer — Dynamic-Capital

**Generated:** Thu, 25 Sep 2025 00:38:52 GMT **Repo root:** Dynamic-Capital

This organizer groups top-level files and directories into logical domains so
contributors can quickly locate the right surface when shipping changes.

Run `npm run docs:organize` whenever the repository layout changes to refresh
this document.

## Applications & Runtime Surfaces

_Entry points that serve the marketing site, admin console, automation workers,
and exported landing snapshot._

| Path          | Type      | Summary                                                                                                  |
| ------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `_static/`    | Directory | Pre-rendered landing snapshot served by `server.js` for CDN delivery.                                    |
| `algorithms/` | Directory | Trading automation workspace spanning Pine Script strategies, webhook ingestion, and MT5 bridge tooling. |
| `apps/`       | Directory | Next.js monorepo powering the marketing landing page and Telegram operations console.                    |
| `broadcast/`  | Directory | Standalone broadcast planner used for scheduled outbound Telegram messages.                              |
| `go-service/` | Directory | Minimal Go HTTP service exposing `/healthz` for uptime monitoring.                                       |
| `index.html`  | File      | Static shell used by the Lovable/Vite harness to proxy into the Next.js application.                     |
| `queue/`      | Directory | Background worker harness that processes queued jobs outside the webhook request lifecycle.              |
| `server.js`   | File      | Hardened Node server that serves the `_static` snapshot with security headers and health checks.         |
| `src/`        | Directory | Lovable/Vite development harness and stubs that proxy into the Next.js app during local development.     |

## Data Layer & Platform Services

_Supabase assets, database clients, and supporting automation that power
persistence and RPC flows._

| Path        | Type      | Summary                                                                                                    |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `content/`  | Directory | Structured marketing content (bios, quotes) that keeps dynamic branding assets consistent across surfaces. |
| `db/`       | Directory | TypeScript client helpers and schema utilities for Supabase/Postgres access outside edge functions.        |
| `supabase/` | Directory | Supabase migrations, edge functions, and configuration powering Telegram bot flows and analytics.          |

## Infrastructure & Deployment

_Deployment manifests, container assets, DNS automation, and platform-specific
helpers._

| Path          | Type      | Summary                                                                                        |
| ------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `.do/`        | Directory | DigitalOcean app specification and deployment metadata.                                        |
| `dns/`        | Directory | DigitalOcean DNS exports and automation descriptors used for reproducing external records.     |
| `docker/`     | Directory | Dockerfiles, Compose definitions, and Nginx configuration for running the stack in containers. |
| `Procfile`    | File      | Process definition for platform-as-a-service deployments of the Node server.                   |
| `vercel.json` | File      | Vercel project configuration toggling headers and rewrites for the Next.js app.                |

## Tooling & Developer Experience

_Scripts and utilities that streamline builds, local workflows, and developer
ergonomics._

| Path               | Type      | Summary                                                                                        |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| `.github/`         | Directory | GitHub Actions workflows and repository configuration.                                         |
| `lovable-build.js` | File      | Lovable automation helper that orchestrates production builds across app surfaces.             |
| `lovable-dev.js`   | File      | Lovable development bootstrapper for local preview flows.                                      |
| `scripts/`         | Directory | Operational scripts for builds, environment sync, Telegram automation, and verification tasks. |
| `tools/`           | Directory | Developer utilities such as the AlgoKit-inspired scaffolding CLI.                              |

## Quality & Testing

_Automated test suites and helper scaffolding that protect critical flows._

| Path         | Type      | Summary                                                                                     |
| ------------ | --------- | ------------------------------------------------------------------------------------------- |
| `functions/` | Directory | Legacy Deno test harnesses for Supabase edge functions.                                     |
| `tests/`     | Directory | Deno-based test suites and stubs covering API endpoints, Telegram flows, and payment logic. |

## Documentation & Knowledge Base

_Reference material, runbooks, and contributor onboarding resources._

| Path          | Type      | Summary                                                                                       |
| ------------- | --------- | --------------------------------------------------------------------------------------------- |
| `AGENTS.md`   | File      | Repo-wide agent guidelines outlining formatting, testing, and branding expectations.          |
| `CODEOWNERS`  | File      | Ownership matrix ensuring brand-critical surfaces always have reviewers from the right teams. |
| `docs/`       | Directory | Knowledge base containing runbooks, checklists, and compliance artefacts.                     |
| `LICENSE`     | File      | Licensing terms governing repository usage.                                                   |
| `README.md`   | File      | Project overview, setup instructions, and architecture summary.                               |
| `SECURITY.md` | File      | Security policy and responsible disclosure process.                                           |

## Configuration & Project Settings

_Workspace manifests, environment samples, and build system configuration
files._

| Path                 | Type      | Summary                                                                                                      |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `.denoignore`        | File      | Deno task exclusions for generated or irrelevant paths.                                                      |
| `.dockerignore`      | File      | Docker build context exclusions aligned with `.gitignore`.                                                   |
| `.editorconfig`      | File      | Editor configuration enforcing shared formatting conventions.                                                |
| `.env.example`       | File      | Sample environment variables for local development and onboarding.                                           |
| `.gitignore`         | File      | Git ignore rules for generated or local-only files.                                                          |
| `.nvmrc`             | File      | Node.js version pin for contributors using `nvm`.                                                            |
| `codex.json`         | File      | Lovable Codex metadata that wires automated workspace curation for branding-centric builds.                  |
| `deno.json`          | File      | Deno configuration and task runner definitions.                                                              |
| `deno.lock`          | File      | Deno module lockfile capturing remote dependencies.                                                          |
| `env/`               | Directory | Derived environment mapping artifacts shared across workspaces to align branding-aware runtime settings.     |
| `go.work`            | File      | Go workspace file linking Go-based services and shared modules.                                              |
| `package-lock.json`  | File      | Lockfile for npm dependencies to ensure reproducible installs.                                               |
| `package.json`       | File      | npm workspace manifest defining scripts and dependencies.                                                    |
| `postcss.config.js`  | File      | PostCSS pipeline configuration.                                                                              |
| `project.toml`       | File      | Lovable project manifest describing workspace metadata.                                                      |
| `tag-ruleset.json`   | File      | Lovable tagging automation rules that route dynamic branding initiatives to the correct workspace reviewers. |
| `tailwind.config.ts` | File      | Tailwind CSS configuration for the Next.js surfaces.                                                         |
| `tsconfig.json`      | File      | TypeScript compiler configuration shared across the monorepo.                                                |
| `vite.config.ts`     | File      | Vite proxy configuration used during Lovable-driven development.                                             |

## Generated Artifacts

_Dependency caches or build outputs that live in the repository tree but are
produced by tooling._

| Path            | Type      | Summary                                                                 |
| --------------- | --------- | ----------------------------------------------------------------------- |
| `node_modules/` | Directory | Installed npm dependencies (excluded from version control in practice). |

## Unclassified Items

_Entries that still need manual categorisation. Update
`scripts/repo-file-organizer.ts` when these appear._

- _No entries tracked in this category yet._
