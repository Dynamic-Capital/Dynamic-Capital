# Next.js Toolchain Cleanup Checklist

This checklist guides the removal of the legacy root-level Vite build pipeline while keeping the Next.js workspace (`apps/web`) and the Supabase Mini App (still on Vite) healthy. Work through each section in order to ensure the migration is smooth and well-documented.

> [!TIP] Pair this list with the existing discovery plan so stakeholders know **why** the cleanup is happening and how it affects their workflows.

## 1. Discovery & Alignment

- [ ] Confirm with maintainers that the root Vite proxy is no longer required for Lovable automation or CI/CD.
- [ ] Document the agreement (issue comment or internal note) so contributors know the single source of truth is the Next.js build.
- [ ] Audit CI pipelines, deployment configs, and helper scripts for `npm run build:dev` or other Vite-specific invocations.
- [ ] Capture any dependencies on those commands and plan replacements before removing them.

## 2. Retire the Root Vite Toolchain

- [ ] Delete `vite.config.ts` at the repo root.
- [ ] Remove the `build:dev` script (and any other Vite-specific entries) from the root `package.json`.
- [ ] Prune root-level dev dependencies that only serve the Vite proxy (e.g., `vite`, `@vitejs/plugin-react`).
- [ ] Re-run `npm install` to refresh the lockfile without the Vite tooling.
- [ ] Double-check Lovable helpers (`lovable-build.js`, `lovable-dev.js`) still invoke the Next.js scripts directly.

## 3. Slim the Next.js Workspace (`apps/web`)

- [ ] Drop `vite` and `@vitejs/plugin-react` from `apps/web/package.json` (if they remain).
- [ ] Review workspace-specific configs (`tsconfig.json`, ESLint) and remove Vite aliases or plugins.
- [ ] Ensure the Next.js `paths` settings cover any aliases previously provided by Vite (e.g., `@` → `apps/web/src`).
- [ ] Replace Vite-only linting rules or scripts with Next.js-native alternatives when necessary.

## 4. Tidy Supporting Code & References

- [ ] Search the repository for `vite` to uncover lingering comments, docs, or build steps.
- [ ] Update bundler-specific pragmas (e.g., replace `/* @vite-ignore */` with neutral directives like `/* webpackIgnore: true */` or `/* bundlerIgnore: true */`).
- [ ] Clarify in documentation that Vite remains only within the Supabase Mini App workspace.
- [ ] Remove stale onboarding or README instructions that mention dual Vite/Next.js builds.

## 5. Validation & Quality Gates

- [ ] Install dependencies from a clean slate (`rm -rf node_modules && npm install`).
- [ ] Run primary quality gates: `npm run lint`, `npm test`, `npm run build`, and `npm run build:landing`.
- [ ] Execute Lovable helper commands (`npm run dev:lovable`, `npm run build:lovable` if applicable) to ensure they still function.
- [ ] Confirm the Supabase Mini App workspace continues to build with its Vite pipeline.

## 6. Documentation & Communication

- [ ] Update README and onboarding docs to emphasize the single Next.js pipeline for the main web experience.
- [ ] Note in the changelog or release notes that the redundant Vite build path was removed.
- [ ] Announce the change in team channels (Slack, email, standup) so local tooling aliases can be cleaned up.
- [ ] Record any follow-up tech debt created during the migration.

## 7. Optional Follow-Ups

- [ ] Evaluate whether the Supabase Mini App should remain on Vite or be migrated to Next.js in a future phase.
- [ ] Consider adding automation to the checklist runner (`npm run checklists`) for repeated validation tasks.
- [ ] Schedule a post-migration review after one iteration to collect feedback from contributors.
