# Dynamic Codex Integration Checklist

Use this checklist to track the work required to fold the Dynamic Codex project
into the Dynamic Capital monorepo without fragmenting tooling or deployments.

> **Status:** Complete. The standalone Vite workspace has been removed and the
> Telegram dashboard now lives at `apps/web/app/telegram/` inside the Next.js
> build.

## 1. Repository Preparation

- [x] Review Dynamic Codex repo and capture versions of dependencies,
      environment variables, and Supabase migrations.
- [x] Confirm no conflicting AGENTS or repo-wide conventions apply to affected
      directories in this monorepo.
- [x] Document any credentials in Codex history that must be rotated before
      importing code.

## 2. Frontend Integration (Next.js App)

- [x] Decide the route namespace (e.g., `/telegram` or `/codex`) under
      `apps/web/app/` for the Codex dashboard.
- [x] Migrate shared providers (theme, Supabase, React Query) to ensure the new
      pages render inside existing layout shells.
- [x] Port key pages/components (dashboard shell, messages view, bot status
      cards, EA reports UI) into the Next.js app router.
- [x] Replace Codex-specific environment lookups (`import.meta.env`) with the
      appropriate `NEXT_PUBLIC_` helpers.
- [x] Align styling with existing design tokens, typography, and Radix component
      usage.
- [x] Set up Supabase real-time subscriptions for message updates within React
      Query or existing hooks.
- [x] Validate that routing, navigation breadcrumbs, and auth guards match the
      rest of the dashboard experience.

## 3. Supabase Schema & Policies

- [x] Translate Codex SQL migrations for `messages`, `ea_reports`, and related
      indexes into new files under `supabase/migrations`.
- [x] Review for table/column name collisions or required foreign keys to
      existing entities (users, chats, receipts, etc.).
- [x] Add or update Row Level Security (RLS) policies to match monorepo
      standards and restrict access appropriately.
- [x] Extend Supabase type generation / client definitions if new tables are
      queried from the frontend.
- [x] Update schema documentation and ER diagrams if maintained.

## 4. Edge Functions & Backend Logic

- [x] Audit existing edge functions in `supabase/functions` for overlapping
      responsibilities (e.g., current Telegram webhook).
- [x] Merge Codex webhook logic (message persistence, command replies, admin
      notifications) without breaking existing flows.
- [x] Port the EA report ingestion function, ensuring consistent error handling,
      logging, and CORS headers.
- [x] Centralize shared Telegram helpers (signature validation, message parsing)
      to prevent duplication.
- [x] Add tests (unit/integration) for new or modified edge functions in line
      with repo standards.

## 5. Environment & Configuration

- [x] Map Codex environment variables (`VITE_SUPABASE_*`,
      `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `ADMIN_USER_ID`, etc.)
      to the monorepo convention (`NEXT_PUBLIC_*`, secrets manager entries,
      Supabase config files).
- [x] Update `.env.example`, Supabase config, and deployment docs with new
      variables and their purpose.
- [x] Ensure secrets are stored in the correct environment targets (Vercel,
      Supabase, worker queues, etc.).
- [x] Rotate any imported secrets that were ever committed in the Codex
      repository.

## 6. Dev Workflow & Tooling

- [x] Integrate any Codex-specific npm scripts or tooling into the root
      workspace commands.
- [x] Verify linting, type-checking, and testing commands cover the new code
      paths.
- [x] Update CI pipelines (GitHub Actions, Vercel checks) to run necessary
      build/test jobs.
- [x] Remove redundant Vite-specific configs once the Next.js port is stable, or
      archive them under documentation.

## 7. QA, Staging & Rollout

- [x] Deploy schema changes to a staging Supabase project and run migrations.
- [x] Smoke-test Telegram webhook flows (existing receipt automation + new Codex
      features) in staging.
- [x] Validate EA report ingestion and admin notifications end-to-end.
- [x] Confirm the dashboard renders and updates real-time data in staging.
- [x] Prepare rollback procedures and feature flags/toggles for gradual rollout.

## 8. Documentation & Knowledge Transfer

- [x] Update README / internal docs to describe the new dashboard features,
      schema, and operational playbooks.
- [x] Record onboarding notes for developers (local setup, env vars, testing
      steps).
- [x] Announce integration plan and completion to stakeholders (engineering,
      operations, admins).
- [x] Archive or decommission the standalone Codex repo usage instructions after
      successful migration.

Maintain this checklist throughout the integration project to ensure no critical
steps are missed.
