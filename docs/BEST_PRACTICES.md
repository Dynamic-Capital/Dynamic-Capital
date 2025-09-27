# Project Best Practices Plan

This document outlines a high-level plan for keeping the project organized and
maintainable. It focuses on serverless functions, build outputs, static files,
and root-level configuration.

## 1. Functions

- Keep all Edge and serverless functions in dedicated directories
  (`supabase/functions` and `functions`).
- Share common utilities through modules in `shared/` or `lib/` instead of
  duplicating code.
- Use environment variables from `.env` and avoid hard-coding secrets.
- Favor small, single-responsibility handlers and add tests under `tests/` when
  adding new endpoints.

## 2. Build Outputs

- Use the unified script `npm run build:all` to compile both the Next.js app and
  mini app functions.
- Ensure build artifacts (`.next`, `supabase/functions/*/dist`) are excluded
  from version control via `.gitignore`.
- Document any build steps that require additional tooling inside `docs/` so new
  contributors can reproduce them.

## 3. Static Files

- Place all user-facing static assets inside `public/`.
- For generated assets (e.g., favicons), include source files and describe
  regeneration steps in the documentation.
- Keep the `public/` directory free of unused or temporary files to reduce
  bundle size.

## 4. Root-Level Configuration

- Maintain clear root files such as `package.json`, `tsconfig.json`,
  `eslint.config.js`, and `README.md`.
- When adding tooling, document the purpose and default commands in `README.md`.
- Keep `.env` example files up to date with required environment variables.

## 5. Continuous Review

- Periodically review directory structure and build scripts for consistency.
- Run `npm test` and `npm run lint` before committing to catch regressions.
- Update this plan as the project evolves.
