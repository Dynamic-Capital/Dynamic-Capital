# Dynamic Capital TON Quality Gates

## Overview

This checklist codifies the routine commands that must be executed and recorded
whenever the TON allocator, treasury routing, or Supabase edge functions are
modified. Running these gates keeps the smart-contract and off-chain surfaces
aligned with the expectations captured in the technical audit and implementation
plan.

## Prerequisites

- Install Node.js 20 and Deno 2.5 or later (the repository scripts bundle a
  helper shim at `scripts/deno_bin.sh`).
- Run `npm install` at the repository root to ensure workspaces and shared
  tooling are available.
- Export any Supabase service credentials needed by the edge-function tests
  (they fall back to stubs for unit execution but should be present in CI).

## Formatting and Static Analysis

1. `npm run format`
2. `npm run lint`
3. `npm run typecheck`

These commands are run from the repository root and validate the shared
TypeScript/React surfaces alongside formatting for docs, scripts, and Supabase
code.

## Allocator Contract Suite

Run the dedicated allocator regression tests with the repository's bundled Deno
binary to avoid version drift:

```
$(bash scripts/deno_bin.sh) test -A dynamic-capital-ton/apps/tests/pool_allocator.test.ts
```

Record the resulting summary in release notes or pull-request checklists so
auditors can confirm the TIP-3 parsing and router forwarding behaviors were
exercised.

## Supabase Edge Functions

Execute the Supabase wallet-linking and subscription suites together to ensure
both guardrails remain synchronized with the allocator configuration:

```
$(bash scripts/deno_bin.sh) test -A \
  dynamic-capital-ton/supabase/functions/link-wallet/index.test.ts \
  dynamic-capital-ton/supabase/functions/process-subscription/index.test.ts
```

Capture the command output or attach artifacts that document the stubbed
Supabase interactions and TON indexer validations.

## Evidence Checklist

- Attach terminal output for each command above when submitting deployment
  readiness packages.
- Update
  [`dynamic-capital-ton/IMPLEMENTATION_PLAN.md`](../dynamic-capital-ton/IMPLEMENTATION_PLAN.md)
  when allocator milestones are completed, referencing the command runs as
  verification evidence.
- Mirror the same commands in CI workflows or release candidate scripts to
  guarantee parity between local validation and automated pipelines.
