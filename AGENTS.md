# Agent Guidelines

These conventions apply across the entire repository unless a subdirectory
defines its own `AGENTS.md`.

## Repo-wide

- Favor TypeScript/TSX for new source files. Mirror the existing module system
  (ESM) and avoid introducing CommonJS modules.
- Keep type-safety high: prefer explicit interfaces/types instead of `any`, and
  only use `@ts-ignore` as a last resort with a short justification.
- Format code with `npm run format` (which runs `deno fmt` on the relevant
  directories) before committing.
- When changing application logic, run the focused quality gates for the areas
  you touched. At minimum run `npm run lint`, `npm run typecheck`, and any
  affected tests (for example `npm run test`).
- Do not commit secrets or environment-specific values; use `.env.example`
  patterns when configuration updates are required.

## React & Next.js apps (`apps/web`, `apps/landing`)

- Write components as function components in PascalCase files. Include the
  `"use client";` directive at the top whenever a component relies on React
  hooks or browser APIs.
- Use the existing absolute import aliases (e.g. `@/components/...`) instead of
  deep relative paths when referencing shared modules.
- Keep Tailwind CSS utility classes organized semantically (layout → spacing →
  typography → visual). Split long `className` strings across multiple lines for
  readability when necessary.
- Prefer composition over inheritance: factor reusable UI into smaller
  components under `components/shared` or `components/ui` before duplicating
  markup.

## Scripts & Tooling (`scripts`, `tools`, `supabase`, `db`)

- These folders rely on Deno and modern Node tooling. Stick to ESM syntax and
  use top-level `await` only where Deno supports it.
- Ensure scripts are idempotent and safe to re-run. Handle filesystem and
  network errors gracefully.

## Documentation (`docs`, Markdown files)

- Organize documents with meaningful headings (`##`, `###`) and use
  ordered/unordered lists for checklists or procedures.
- Wrap code snippets in fenced code blocks with the appropriate language tag to
  enable syntax highlighting.

When in doubt, review nearby files and follow the existing patterns to maintain
consistency.
