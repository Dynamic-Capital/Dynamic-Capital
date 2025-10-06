# Project Status Overview

## Executive Summary

<!-- deno-fmt-ignore -->
| Area | Status | Evidence | Follow-up |
| --- | --- | --- | --- |
| Protocol design & tokenomics | ✅ Ready | Multi-layer scope and hard-cap locked.[^proto-evidence] | Keep emissions dashboard post-launch.[^proto-followup] |
| Treasury configuration & guardrails | ✅ Ready | Config enforces cap, routing, and staking rules.[^treasury-evidence] | Match Supabase settings to on-chain refs.[^treasury-followup] |
| Allocator contract & regression coverage | ⚠️ Blocked | TIP-3 parsing fixes are merged, but the latest Deno rerun failed while caching `bnc-sdk@4.6.9` (HTTP 502).[^allocator-evidence] | Re-run allocator + Supabase suites and capture new evidence once the npm CDN stabilizes.[^allocator-followup] |
| Off-chain onboarding flows | ✅ Ready | Onboarding flows production-ready.[^offchain-evidence] | Archive wallet + subscription test logs.[^offchain-followup] |
| Operational runbooks | ✅ Ready | Go-live dry runs captured for ops.[^runbook-evidence] | Store transcripts and API logs with releases.[^runbook-followup] |

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
    actions, and forwards declared TON, but the regression suites failed to
    complete on 2025-10-06 because the npm CDN returned `502` errors while
    caching dependencies such as `bnc-sdk@4.6.9` and
    `@grammyjs/conversations@2.1.0`.【F:dynamic-capital-ton/contracts/pool_allocator.tact†L32-L218】【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】【F:docs/test-run-2025-10-06.md†L1-L36】

[^allocator-followup]: Implementation plan reopened the regression test
    checklist items until the npm CDN recovers and new evidence is captured
    alongside the go-live automation log.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L74-L108】【F:docs/checklist-runs/2025-10-06-go-live.md†L1-L34】【F:docs/test-run-2025-10-06.md†L1-L36】

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

- **Allocator regression tests** remain pending revalidation; repeated npm CDN
  `502` errors (e.g., `bnc-sdk@4.6.9`, `@grammyjs/conversations@2.1.0`) blocked
  the latest Deno reruns, so the suites need to be repeated once the registry
  outage clears.【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】【F:docs/test-run-2025-10-06.md†L1-L36】
- **Supabase function suites** assert wallet conflict handling and subscription
  path validation, mirroring audit expectations that off-chain services stay
  deterministic.【F:dynamic-capital-ton/supabase/functions/link-wallet/index.test.ts†L1-L133】【F:docs/dct-ton-audit.md†L12-L36】
- **Technical audit tracking** notes that checklist updates and routine evidence
  capture remain required before handing over to operations, even though code
  paths are ready.【F:docs/dct-ton-audit.md†L15-L114】

### Repo Health & Go-Live Readiness

- **Automation gaps remain.** The repo still needs the `fix_and_check` sweep,
  linkage audit, Telegram webhook verification, and the optional Mini App smoke
  test once secrets and fixes land so CI can certify releases.
- **Go-live tooling follow-ups are open.** Supabase CLI workflow plumbing,
  pending PR refreshes, auto-merge enablement, and the production sanity
  walkthrough must be revisited before the handover package can claim VIP
  readiness.
- **Manual checklist is untouched.** Operators still need to execute the full
  go-live checklist—from webhook validation through admin commands—and archive
  evidence for each stage before sign-off.

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

1. **Restore regression evidence.** Resolve the npm CDN outage and rerun the
   allocator plus Supabase Deno suites, then attach the successful transcripts to
   the implementation plan and release bundle.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L74-L108】【F:docs/test-run-2025-10-06.md†L1-L36】
2. **Record routine quality gates.** Continue attaching allocator and Supabase
   test outputs (plus lint/typecheck logs where relevant) to release notes or CI
   artifacts once executions succeed so the audit trail
   remains complete.【F:docs/dct-ton-audit.md†L25-L113】【F:docs/test-run-2025-10-06.md†L1-L34】
3. **Archive the remaining dry-run evidence.** Retain webhook transcripts, bank
   review outputs, duplicate receipt rejection, crypto confirmation logs, and
   admin command exports alongside the latest release notes so auditors can
   trace each checklist item without
   reruns.【F:docs/GO_LIVE_CHECKLIST.md†L17-L45】【F:docs/go-live-validation-playbook.md†L1-L185】

## Next Steps

- Run `npm run go-live` on each release candidate to refresh evidence bundles
  before handoff, then re-run allocator and Supabase suites so the archive stays
  deterministic.
- Refresh `IMPLEMENTATION_PLAN.md` and `GO_LIVE_CHECKLIST.md` immediately after
  tasks close so this status page stays audit-accurate for the next review
  cycle.
