# Public Roadmap

The roadmap tracks major initiatives and now reflects the repository status
verified during the May 28, 2026 project refresh. The project updater can still
append release-derived items, but this file should remain a readable product
status snapshot.

## Backlog

- Refresh release automation so `docs/FEATURES.md`, release notes, and project
  board updates are generated from the same source of truth.
- Complete an operations pass for production TON/DCT launch readiness, including
  final treasury/router confirmation, gateway monitoring, and dashboard wiring
  for allocator events.
- Decide how to remediate the current dependency audit backlog before the next
  production release.

## In Progress

- Stabilize Telegram bot and Mini App callback flows so menu navigation edits
  the existing message and test imports do not start duplicate local servers.
- Keep Supabase receipt, payment, Mini App, and Telegram verification tests
  aligned with the current internal-secret requirements.
- Consolidate status documentation after the fresh lint/typecheck/test pass.

## Shipped

- Telegram-first onboarding surface with Next.js web/Mini App routes, Supabase
  edge functions, bot workflows, receipt/OCR handling, and admin operations.
- TON/DCT implementation package with token configuration, pool allocator
  regression coverage, theme collection tests, and deployment/audit docs.
- Dynamic AI and hedging automation surfaces covering multi-LLM workflows,
  strategy telemetry, and Supabase-backed orchestration.
