# Decision Record: Retire Root-Level Vite Proxy

**Status:** Accepted

## Context

The repository historically kept a root `vite.config.ts` proxy to forward
Lovable preview traffic into the Next.js dev server. The production build path
has been fully Next.js since the Dynamic Codex merge, and Lovable helper scripts
(`lovable-dev.js`, `lovable-build.js`) already shell into the Next.js workspace.
The team confirmed no CI or deployment workflows rely on the old `npm run build:dev`
command and agreed to decommission the extra toolchain so contributors see a
single source of truth.

## Decision

- Remove the root `vite.config.ts` file and the unused `build:dev` package
  script.
- Drop Vite-specific dev dependencies from `apps/web` and tidy ESLint configs
  so they reference only Next.js-native plugins.
- Replace test-time dynamic import pragmas with bundler-neutral equivalents to
  keep the suites portable.
- Keep the Supabase Mini App workspace on Vite until a separate migration is
  scheduled.

## Consequences

- Running `npm install` no longer pulls Vite into the main workspace lockfile,
  clarifying that `npm run build` is the canonical production bundle.
- Documentation reflects that the main dashboard is 100% Next.js while the
  mini app remains the lone Vite consumer.
- Contributors no longer see duplicate build commands or Vite terminology when
  working on the primary web app, reducing onboarding confusion.
