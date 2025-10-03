# Project Status Overview

## Dynamic Capital TON Coin Snapshot

- **Protocol scope:** DCT powers intelligence, execution, and liquidity layers,
  aligning AI tooling access with treasury incentives.
- **Supply controls:** Config manifests enforce a 100 M cap with 60/30/10
  treasury routing, staking lock multipliers, and DAO-managed theme pass drops.
- **Contract readiness:** The pool allocator parses TIP-3 transfers, forwards
  TON value, and emits structured deposit events; deployment docs cover jetton
  master, wallets, timelocks, and NFT theme passes.
- **Application surface:** Telegram Mini App documentation explains environment
  setup and verification, while Supabase functions handle wallet linking and
  subscription intake with corresponding unit tests.
- **Quality focus:** Allocator and Supabase test suites provide regression
  coverage, though the implementation checklist still needs updates and routine
  CI gates must be documented.

## Validation Status

### Tests Executed

- `npm run lint` – ESLint clean for the web workspace, confirming no outstanding
  lint regressions.
- `npm run typecheck` – TypeScript `tsc --noEmit` passes, verifying shared types
  and contracts across the web codebase.
- `npm run test` – Deno integration and contract tests succeed across TON
  allocators, Supabase edge functions, Telegram bots, and public API routes.

### Outstanding QA Follow-Ups

- Regenerate the implementation checklist in
  [`docs/dynamic-capital-narrative-implementation-checklist.md`](./dynamic-capital-narrative-implementation-checklist.md)
  to capture the newest TON allocator tasks and Supabase regression coverage.
- Align the CI gate documentation in
  [`docs/go-live-validation-playbook.md`](./go-live-validation-playbook.md) with
  the executed commands above, including evidence capture for future reruns.

## Launch Readiness

- Run the full go-live checklist via [`npm run go-live`](../package.json) to
  export artifacts documented in
  [`docs/GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md).
- Stage liquidity operations following
  [`docs/tonstarter/liquidity-sop.md`](./tonstarter/liquidity-sop.md) and
  confirm allocator parameters against
  [`docs/tonstarter-launch-readiness.md`](./tonstarter-launch-readiness.md).
- Synchronize public comms and DAO governance queues using the cadence outlined
  in
  [`docs/tonstarter/transparency-cadence.md`](./tonstarter/transparency-cadence.md)
  and [`docs/dynamic-capital-milestones.md`](./dynamic-capital-milestones.md).

## Follow-Up

- See [`docs/dct-ton-audit.md`](./dct-ton-audit.md) for the complete technical
  audit, risk assessment, and launch-readiness recommendations.
