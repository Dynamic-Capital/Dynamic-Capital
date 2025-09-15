# Dynamic Capital Checklist

This tracker documents the outstanding work required across the Dynamic Capital project. Check items off as they are completed.

### Automation helper

Run `npm run checklists -- --list` to see automation-friendly tasks mapped to this document and related checklists. When you
need to execute the scripted steps for a section, call the helper with the relevant key, for example `npm run checklists --
--checklist dynamic-capital`. Optional items (long-running builds or smoke tests) are skipped by default; include them with
`--include-optional`. You can also target individual tasks with `--only <task-id>` or exclude steps with `--skip <task-id>`.

## Repo-Level Action Items
- [x] Add default exports to all Edge Functions.
- [x] Build out integration tests for payment and webhook flows.
- [x] Document expected environment variables and values.
- [x] Consolidate duplicate Supabase client creation.
- [x] Automate generation of repository summary docs.
- [x] Prune unused scripts.
- [x] Expand the README with setup guidance.

## Setup Follow-Ups
- [ ] Complete the Supabase CLI workflow (`npx supabase login && supabase link && supabase db push`).
- [ ] Refresh or open the pending PR ensuring CI checks pass.
- [ ] Enable auto-merge with the required branch protections.
- [ ] Run the production sanity test (`/start`, `/plans`, approve test payment) to confirm `current_vip.is_vip`.

## Coding Efficiency Checklist
### Alignment
- [ ] Confirm acceptance criteria.
- [ ] Identify impacted packages and services.
- [ ] Research existing patterns.
- [ ] Log questions and risks.

### Orientation
- [ ] Review the README.
- [ ] Review the development workflow.
- [ ] Review architecture guides.
- [ ] Draft an implementation plan.

### Environment Preparation
- [ ] Copy `.env`.
- [ ] Run `npm run sync-env`.
- [ ] Start local dependencies.
- [ ] Run the Lovable dev server.
- [ ] Start relevant watchers.

### Implementation Planning
- [ ] Reuse shared utilities.
- [ ] List needed tests.
- [ ] Gather fixtures.
- [ ] Decide on configuration, migration, or flag changes.

### Shared Tooling Practices
- [ ] Use standard development and build scripts.
- [ ] Rely on landing-page tooling.
- [ ] Run monorepo builds.
- [ ] Consult code-structure and domain runbooks.

### Configuration Hygiene
- [ ] Cross-check configuration documentation.
- [ ] Update `docs/env.md` and the variables checklist.
- [ ] Rerun `npm run sync-env`.

### Quality Safeguards
- [ ] Update tests.
- [ ] Run fix-and-check scripts.
- [ ] Execute `npm run verify`.
- [ ] Hit Supabase endpoints after changes.
- [ ] Capture manual QA evidence.

### Documentation and Handoff
- [ ] Update documentation.
- [ ] Capture UI artifacts.
- [ ] Summarize PR decisions with verification output and references.
- [ ] Rebase, open PR, and monitor CI.
- [ ] Close out services and branches post-merge.

## Automated Trading System Build Checklist
### TradingView Signal Groundwork
- [ ] Finalize Pine Script logic.
- [ ] Add alert payloads.
- [ ] Upgrade plan.
- [ ] Create alerts.
- [ ] Set webhook URL.
- [ ] Secure secrets.

### Vercel Webhook Receiver
- [ ] Scaffold the project.
- [ ] Implement validation.
- [ ] Parse payloads.
- [ ] Map to Supabase inserts.
- [ ] Handle duplicates.
- [ ] Add logging.
- [ ] Configure environment variables.
- [ ] Deploy to production.

### Supabase Backend
- [ ] Design the schema.
- [ ] Apply migrations.
- [ ] Enable Realtime.
- [ ] Configure policies.
- [ ] Test inserts.
- [ ] Document API usage.

### MT5 Expert Advisor
- [ ] Set up the development environment.
- [ ] Watch for signals.
- [ ] Parse signals.
- [ ] Implement execution and risk controls.
- [ ] Write back results.
- [ ] Add error handling.
- [ ] Backtest and forward-test with Supabase data.

### Hosting and Infrastructure
- [ ] Provision a VPS.
- [ ] Harden the server.
- [ ] Install MT5 and deploy the EA.
- [ ] Configure monitoring and auto-restart.
- [ ] Monitor system metrics and logs.

### GitHub and CI/CD Setup
- [ ] Organize repository artifacts.
- [ ] Configure CI.
- [ ] Add deployment workflows.
- [ ] Establish branch protections and secret management.
- [ ] Document contribution guidelines.

### End-to-End Validation
- [ ] Dry-run TradingView → Supabase → MT5.
- [ ] Verify execution logging.
- [ ] Set up alerting.
- [ ] Review latency.
- [ ] Schedule performance audits.

## Go-Live Checklist
- [ ] Verify the webhook.
- [ ] Validate bank approval and manual review paths.
- [ ] Ensure duplicate receipts are blocked.
- [ ] Confirm crypto confirmation handling.
- [ ] Test admin commands.

## Variables and Links Checklist
- [ ] Confirm required secrets and production values.
- [ ] Validate bot handles.
- [ ] Remove placeholders.
- [ ] Ensure `MINI_APP_URL` and other links point to production.
- [ ] Run edge host and linkage audits.
- [ ] Double-check Mini App external links.
