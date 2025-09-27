# Coding Efficiency Checklist

Use this checklist to stay aligned with the existing automation, docs, and
workflows in the Dynamic Capital repo. Copy it into your issue or PR description
and tick items as you complete a feature branch or maintenance task.

## 0. Align on the Work

- [ ] Confirm the acceptance criteria, dependencies, and success metrics from
      the issue, spec, or stakeholder conversation.
- [ ] Identify which packages or services will change (Next.js dashboard,
      landing page, Supabase functions, Go services, etc.) by reviewing the
      [root README](../README.md) and [repo summary](./REPO_SUMMARY.md).
- [ ] Search the repo (`rg`, code navigation) and docs such as the
      [linkage checklist](./LINKAGE_CHECKLIST.md) or
      [best practices](./BEST_PRACTICES.md) for existing patterns you can reuse.
- [ ] Capture clarifying questions, risks, or implementation notes in the
      issue/PR before writing code so you avoid rework.

## 1. Orient Yourself

- [ ] Skim the latest [root README](../README.md) for workspace layout, scripts,
      and deployment targets.
- [ ] Review the [Development Workflow guide](./DEVELOPMENT_WORKFLOW.md) to
      refresh the recommended sequence for setup, builds, and smoke tests.
- [ ] Consult architecture guides that map the areas you will touch, such as the
      [code structure guide](./code-structure.md),
      [flow overview](./FLOW_OVERVIEW.md), or domain-specific runbooks in
      `docs/`.
- [ ] Draft a lightweight implementation plan that lists the modules/functions
      you expect to change and how they integrate.

## 2. Prepare the Environment

- [ ] Duplicate `.env.example` to `.env` and `.env.local` (or the relevant
      workspace file).
- [ ] Run `npm run sync-env` to populate required variables.
- [ ] Start local dependencies as needed: `npm run supabase:start`,
      `supabase functions serve telegram-bot --no-verify-jwt`, or other commands
      from the workflow guide.
- [ ] When prototyping with Dynamic, launch `npm run dev:lovable` to backfill
      origins, validate env keys, and ping Supabase for early configuration
      issues.
- [ ] Start any background watchers relevant to your work (for example,
      `npm run upload-assets:watch` when editing landing-page assets).

## 3. Plan Implementation & Tests

- [ ] Identify shared utilities or components to reuse and note their file paths
      before you start coding.
- [ ] List the automated tests that will need updates or additions (unit,
      integration, mini-app, Supabase function checks, etc.).
- [ ] Gather fixtures or sample payloads from existing tests or docs like
      [api-documentation.md](./api-documentation.md) and
      [MAKE_INITDATA.md](./MAKE_INITDATA.md) if you need seed data.
- [ ] Decide whether configuration changes, database migrations, or feature
      flags are required and document the plan.

## 4. Build With Shared Tooling

- [ ] Use `npm run dev` (or workspace-specific scripts) instead of ad-hoc
      commands so hot reloading and watchers stay consistent.
- [ ] For landing page work, rely on `npm run build:landing` and
      `npm run upload-assets:watch` for automated bundling and asset syncing.
- [ ] For monorepo builds (Next.js dashboard, mini app, etc.), run
      `npm run build`, `npm run build:miniapp`, and other task-specific npm
      scripts listed in the README.
- [ ] Consult the [code structure guide](./code-structure.md) when editing large
      files to jump directly to the relevant section and maintain the existing
      numbering/comments.
- [ ] Keep domain-specific runbooks (for example,
      [WRAPPERS_INTEGRATION.md](./WRAPPERS_INTEGRATION.md) or
      [MINI_APP_FLOW.md](./MINI_APP_FLOW.md)) nearby to avoid reimplementing
      solved problems.

## 5. Manage Config & Secret Consistency

- [ ] Cross-check the [configuration matrix](./CONFIG.md) and
      [CONFIG_SECRETS.md](./CONFIG_SECRETS.md) when adding or updating
      environment variables to ensure parity across local, Supabase, and CI
      contexts.
- [ ] Update [`docs/env.md`](./env.md) and, when relevant, the
      [variables and links checklist](./VARIABLES_AND_LINKS_CHECKLIST.md) with
      any new keys, URLs, or external service notes.
- [ ] Re-run `npm run sync-env` after edits and share new secrets securely with
      the rest of the team.

## 6. Safeguard Code Quality

- [ ] Update or add automated tests and run targeted commands such as
      `npm run test` or `deno test -A` for Supabase functions.
- [ ] Execute `bash scripts/fix_and_check.sh` to auto-apply repo-specific fixes
      and rerun Deno format/lint/type checks until clean.
- [ ] Run `npm run verify` to execute the aggregated static, deployed-function,
      runtime wiring, and mini-app safety checks.
- [ ] If you changed Supabase functions, hit the local/version endpoints (see
      [VERIFY_INITDATA.md](./VERIFY_INITDATA.md)) or run manual flows to ensure
      they respond correctly.
- [ ] Capture manual QA notes (screenshots, curl outputs, console logs) for
      scenarios that are not covered by automation.

## 7. Document, Demo & Share Context

- [ ] Update any impacted docs, runbooks, or README sections as part of the
      change set.
- [ ] Collect screenshots or short recordings for UI or UX changes so reviewers
      can validate them quickly.
- [ ] Summarize key implementation decisions, trade-offs, and coverage in your
      PR description.
- [ ] Attach output from verification commands (for example, `npm run verify`)
      to your PR so reviewers see passing evidence.
- [ ] Link to the docs or dashboards that provide additional context for your
      change.

## 8. Handoff & Follow Through

- [ ] Rebase or merge `main` to ensure your branch is up to date and
      `git status` is clean.
- [ ] Push your branch, open the PR with the completed checklist, and request
      reviews from the relevant owners.
- [ ] Monitor CI or preview deployments and fix failures promptly.
- [ ] After merge, close the associated issue, stop local services
      (`npm run supabase:stop`), and delete the feature branch when appropriate.

Keep this checklist close during each iteration so you spend more time shipping
features and less time rediscovering the project’s established tooling.
