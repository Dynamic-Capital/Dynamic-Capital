# Project Status Overview

## Executive Summary

**Go-live readiness remains blocked until automation sweeps and manual checklist evidence land.** The table below highlights the current remediation owners and next steps.

<!-- deno-fmt-ignore -->
| Area | Status | Evidence | Follow-up |
| --- | --- | --- | --- |
| Protocol design & tokenomics | ✅ Ready | Multi-layer scope and hard-cap locked.[^proto-evidence] | Keep emissions dashboard post-launch.[^proto-followup] |
| Treasury configuration & guardrails | ✅ Ready | Config enforces cap, routing, and staking rules.[^treasury-evidence] | Match Supabase settings to on-chain refs.[^treasury-followup] |
| Allocator contract & regression coverage | 🟠 Blocked | Allocator guarded and regression-tested, but automation sweeps still failing.[^allocator-evidence] | Close outstanding checklist tasks after `fix_and_check` sweep stabilizes.[^allocator-followup] |
| Off-chain onboarding flows | 🟠 Blocked | Onboarding flows production-ready, awaiting refreshed webhook verification.[^offchain-evidence] | Restore webhook secrets, rerun verification, and attach wallet/subscription outputs to the release notes.[^offchain-followup] |
| Operational runbooks | 🔴 Not ready | Go-live dry runs captured, but manual checklist artifacts are missing.[^runbook-evidence] | File dry-run transcripts, payment/crypto logs, and admin outputs before marking complete.[^runbook-followup] |

[^proto-evidence]: Whitepaper codifies the intelligence/execution/liquidity
    layers and the DCT hard-cap
    policy.【F:docs/dynamic-capital-ton-whitepaper.md†L6-L73】

[^proto-followup]: Audit notes keep the emissions dashboard in scope for
    post-launch monitoring updates.【F:docs/dct-ton-audit.md†L94-L120】

[^treasury-evidence]: Configuration locks the 100 M cap, routes 60/30/10 flows,
    and encodes staking multipliers plus theme governance
    data.【F:dynamic-capital-ton/config.yaml†L1-L51】

[^treasury-followup]: Release QA should confirm Supabase settings match the
    production addresses.【F:docs/dct-ton-audit.md†L105-L116】

[^allocator-evidence]: Tact allocator validates TIP-3 transfers, timelocks admin
    actions, forwards declared TON, and emits events covered by Deno regression
    tests.【F:dynamic-capital-ton/contracts/pool_allocator.tact†L32-L218】【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】

[^allocator-followup]: Implementation checklist still needs the parsing,
    forwarding, and regression items marked
    complete.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L47-L99】

[^offchain-evidence]: Supabase wallet linking, subscription processing, and the
    Mini App runbook document deterministic onboarding paths for
    operators.【F:dynamic-capital-ton/supabase/functions/link-wallet/index.ts†L1-L118】【F:dynamic-capital-ton/supabase/functions/process-subscription/index.ts†L1-L158】【F:dynamic-capital-ton/apps/miniapp/README.md†L1-L52】

[^offchain-followup]: Attach wallet link and subscription suite outputs to
    release notes per audit guidance.【F:docs/dct-ton-audit.md†L15-L113】

[^runbook-evidence]: Go-Live Validation Playbook and Go Live Checklist include
    completed webhook, banking, duplicate, crypto, and admin checks for
    handover.【F:docs/go-live-validation-playbook.md†L1-L185】【F:docs/GO_LIVE_CHECKLIST.md†L17-L45】

[^runbook-followup]: File dry-run transcripts and API logs with each release
    package to keep the checklist
    audit-ready.【F:docs/GO_LIVE_CHECKLIST.md†L17-L45】

## Protocol & Product Snapshot

- **Multi-layer utility is locked in.** The whitepaper positions DCT as the
  proof-of-contribution asset across intelligence, execution, and liquidity
  layers while detailing supply cap, distribution, and treasury controls that
  match shipped configuration
  files.【F:docs/dynamic-capital-ton-whitepaper.md†L6-L99】【F:dynamic-capital-ton/config.yaml†L1-L31】
- **Allocator governance paths are enforced.** Timelocked router/treasury
  updates, pause toggles, and strict TIP-3 parsing guard the pool allocator so
  deposits route correctly and admin changes require queued
  execution.【F:dynamic-capital-ton/contracts/pool_allocator.tact†L32-L208】
- **Off-chain entry points are productionized.** Wallet linking, subscription
  processing, and Telegram Mini App guidance give operators deterministic flows
  for onboarding, billing, and support escalations ahead of liquidity
  activation.【F:dynamic-capital-ton/supabase/functions/link-wallet/index.ts†L1-L118】【F:dynamic-capital-ton/supabase/functions/process-subscription/index.ts†L1-L158】【F:dynamic-capital-ton/apps/miniapp/README.md†L1-L52】

## Engineering Health

### Automated Coverage & Evidence

- **Allocator regression tests** cover timelock scheduling, swap math, compliant
  TIP-3 transfers, withdrawal limits, and router forwarding to lock in recent
  fixes.【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】
- **Supabase function suites** assert wallet conflict handling and subscription
  path validation, mirroring audit expectations that off-chain services stay
  deterministic.【F:dynamic-capital-ton/supabase/functions/link-wallet/index.test.ts†L1-L133】【F:docs/dct-ton-audit.md†L12-L36】
- **Technical audit tracking** notes that checklist updates and routine evidence
  capture remain required before handing over to operations, even though code
  paths are ready.【F:docs/dct-ton-audit.md†L15-L114】

### Repo Health & Go-Live Readiness

#### Automation Sweeps

1. **`fix_and_check` lint + format sweep** — 🔴 Open
   - *Blocker:* Missing CI secrets and lingering formatting regressions.
   - *Start now:* Clean up local formatting, land fixes, inject required secrets, then rerun the sweep to unblock downstream jobs.
2. **Linkage audit** — 🔴 Open
   - *Blocker:* Audit module lacks a fresh dependency manifest.
   - *Start now:* Regenerate the manifest with `npm run linkage:audit`, attach it to the pipeline, and confirm the report stores in CI artifacts.
3. **Telegram webhook verification** — 🟠 Blocked
   - *Blocker:* Bot tokens unavailable in CI.
   - *Start now:* Coordinate with infra to supply the secrets, rerun the verification script, and log the transcript for the go-live bundle.
4. **Mini App smoke test (optional)** — 🟠 Blocked
   - *Blocker:* Depends on successful webhook verification.
   - *Start when unblocked:* After the webhook check passes, schedule the CI smoke test and archive screenshots plus logs alongside the transcript.

#### Workflow & Tooling Follow-ups

1. **Supabase CLI deployment workflow** — 🔴 Open
   - *Blocker:* Secrets and migration manifest still unsettled.
   - *Start now:* Finalize the migration manifest, add secrets to CI, and execute a dry run to confirm migrations replay cleanly.
2. **Pending PR refresh with full CI pass** — 🔴 Open
   - *Blocker:* Lint/typecheck failures persist until the automation sweep succeeds.
   - *Start next:* After the sweep stabilizes, rebase the PR, retrigger CI, and capture the passing logs for evidence.
3. **Auto-merge enablement** — 🟡 Pending
   - *Blocker:* Requires reliable green CI on the default branch.
   - *Start after CI is green:* Once tests and linting are stable, flip auto-merge in repo settings and document the change in ops notes.
4. **Production sanity walkthrough** — 🟠 Blocked
   - *Blocker:* Awaiting refreshed automation evidence.
   - *Start when evidence is ready:* Finish CI remediation, then rerun the walkthrough with the current commit and store the annotated checklist.

#### Manual Go-Live Checklist

1. **Webhook health validation** — 🔴 Not started
   - *Evidence gap:* No transcript archived.
   - *Start now:* Execute the validation script, capture output, and deposit logs in the release evidence folder.
2. **Payment flow exercises** — 🔴 Not started
   - *Evidence gap:* Banking and duplicate-handling logs missing.
   - *Start next:* Run both happy-path and exception scenarios, saving reviewer notes plus transaction traces.
3. **Crypto confirmations** — 🔴 Not started
   - *Evidence gap:* Confirmation logs absent.
   - *Start after payment checks:* Trigger the TON deposit cycle, export explorer and node evidence, and file it with the release package.
4. **Admin command verification** — 🔴 Not started
   - *Evidence gap:* Command outputs not filed.
   - *Start after crypto confirmation:* Run the admin suite, archive command transcripts, and link them back to the checklist.
5. **Evidence archival** — 🔴 Not started
   - *Evidence gap:* Consolidated bundle missing.
   - *Start last:* After collecting upstream artifacts, bundle them into the release evidence drive and tag with the RC identifier.

### Runbooks & Operational Readiness

- The Go-Live Validation Playbook walks operators through webhook checks, bank
  receipt handling, crypto confirmations, and admin commands with
  offline-friendly guidance so evidence can be collected in constrained
  environments.【F:docs/go-live-validation-playbook.md†L1-L185】
- The Go Live Checklist now shows every validation checked off—webhook,
  happy-path and near-miss banking, duplicate safeguards, crypto confirmations,
  and admin responses—so ops inherit a green runbook
  package.【F:docs/GO_LIVE_CHECKLIST.md†L17-L45】

## Outstanding Actions

1. **Update the allocator implementation checklist.** The parsing, forwarding,
   and regression tasks are complete in code/tests but remain unchecked; close
   them out or document residual work for
   auditors.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L47-L99】
2. **Record routine quality gates.** Attach allocator and Supabase test outputs
   (plus lint/typecheck logs where relevant) to release notes or CI artifacts to
   satisfy audit guidance on execution
   evidence.【F:docs/dct-ton-audit.md†L25-L113】
3. **Archive the completed dry-run evidence.** File the webhook transcripts,
   bank review outputs, duplicate receipt rejection, crypto confirmation logs,
   and admin command exports alongside the latest release notes so auditors can
   trace each checklist item without
   reruns.【F:docs/GO_LIVE_CHECKLIST.md†L17-L45】【F:docs/go-live-validation-playbook.md†L1-L185】

## Next Steps

- Run `npm run go-live` on each release candidate to refresh evidence bundles
  before handoff, then re-run allocator and Supabase suites so the archive stays
  deterministic.
- Refresh `IMPLEMENTATION_PLAN.md` and `GO_LIVE_CHECKLIST.md` immediately after
  tasks close so this status page stays audit-accurate for the next review
  cycle.
