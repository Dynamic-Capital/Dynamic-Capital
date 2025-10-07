# Dynamic Capital Engineering Onboarding Checklist

> Use this checklist during your first week to ensure access, tooling, and
> workflows are configured correctly. Track completion in your preferred task
> manager and link to artifacts (screenshots, issue numbers) where relevant.

## Day 0 — Access & Accounts

- [ ] Request GitHub membership in the `@dynamic-capital` organization.
- [ ] Accept invites to the following teams (if applicable):
  - `@dynamic-capital/maintainers`
  - `@dynamic-capital/web-experience`
  - `@dynamic-capital/supabase-ops`
- [ ] Enroll your hardware security key with the SSO provider and GitHub.
- [ ] Obtain credentials for the shared 1Password vault and Supabase dashboard.

## Day 1 — Local Environment

- [ ] Install Node.js 20.x (see `.nvmrc`) and npm 11.4.2 or newer.
- [ ] Clone the repository and run `npm install` from the workspace root.
- [ ] Run `npm run format` to confirm Deno is available locally.
- [ ] Execute `npm run lint`, `npm run typecheck`, and `npm run test` to verify
      the core verification toolchain.
- [ ] Configure the Supabase CLI (`supabase login`).
- [ ] Install Playwright browsers via `npm run screenshot:install` if you work
      on front-end features.

## Day 2 — Project Knowledge

- [ ] Review `docs/project-audit.md` and the latest ton upgrade plan in
      `docs/ton-upgrade-plan.md`.
- [ ] Read `docs/phoenix-log-event-guide.md` to understand operational logging
      patterns.
- [ ] Skim the `apps/web` README (if present) and identify critical routes or
      dashboards relevant to your squad.
- [ ] Explore the `scripts/` directory; note the automation relevant to your
      domain (e.g., `scripts/verify`, `scripts/project`).

## Day 3 — Ownership Alignment

- [ ] Confirm your team's domain in `docs/dynamic-subproject-ownership.md`.
- [ ] Add yourself to the CODEOWNERS entry covering your area (or open a PR
      requesting updates).
- [ ] Identify at least one open issue tagged with your squad's label and leave
      a triage comment or solution proposal.

## Day 4 — Operations & Reliability

- [ ] Run `npm audit --omit=dev` locally and review outstanding vulnerabilities.
- [ ] Execute `npm run checklists -- --target ops` to familiarize yourself with
      operational guardrails.
- [ ] Shadow the on-call engineer for a deploy or incident review.

## Day 5 — Retrospective

- [ ] Share onboarding feedback in the #engineering Slack channel.
- [ ] Document one improvement idea (docs, tooling, or automation) and file an
      issue or pull request.
- [ ] Schedule a follow-up pairing session with your onboarding buddy.

## Resources

- `npm run docs:summary` — regenerate the repository knowledge base overview.
- `scripts/run-checklists.js` — execute automated checklists.
- `docs/dynamic-capital-playbook.md` — core governance playbook.
