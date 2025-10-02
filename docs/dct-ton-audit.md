# Dynamic Capital TON Coin Technical Audit

## Executive Summary

- **Deployment stack is implementation-ready:** Smart contracts, config
  manifests, and TON network parameters are present and aligned (token cap,
  treasury splits, timelocks, theme pass metadata), indicating the chain layer
  can be deployed with minimal
  modification.【F:dynamic-capital-ton/config.yaml†L1-L37】【F:dynamic-capital-ton/contracts/pool_allocator.tact†L1-L198】【F:dynamic-capital-ton/global.config.json†L1-L80】
- **Off-chain services are wired for user onboarding:** Supabase schema,
  wallet-linking and subscription processing functions, and Telegram Mini App
  documentation provide a clear flow from user acquisition to treasury routing
  with automated
  guards.【F:dynamic-capital-ton/supabase/schema.sql†L1-L74】【F:dynamic-capital-ton/supabase/functions/link-wallet/index.ts†L1-L113】【F:dynamic-capital-ton/supabase/functions/process-subscription/index.ts†L1-L120】【F:dynamic-capital-ton/apps/miniapp/README.md†L1-L52】
- **Quality gates are documented but require routine evidence capture:**
  Allocator parsing fixes and Supabase flows remain covered by Deno-based unit
  tests, and the implementation checklist plus quality-gate runbook now spell
  out the expected verification steps; the remaining gap is ensuring every run
  is recorded in CI or release notes for
  auditors.【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】【F:dynamic-capital-ton/supabase/functions/link-wallet/index.test.ts†L1-L96】【F:dynamic-capital-ton/supabase/functions/process-subscription/index.test.ts†L1-L120】【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L66-L103】【F:docs/dct-ton-quality-gates.md†L1-L74】

## Follow-Up Status (2025-02-14)

- The Ton Pool Allocator implementation plan now documents completed parsing,
  forwarding, and regression-test milestones, with contextual notes summarizing
  the associated
  evidence.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L66-L92】
- Routine formatting, linting, allocator, and Supabase regression commands are
  captured in a dedicated quality gate runbook to guide contributors and CI
  pipelines.【F:docs/dct-ton-quality-gates.md†L1-L74】

## Governance, Tokenomics, and Treasury Controls

- The on-chain configuration enforces a 100 M DCT hard cap, 9 decimals, and
  treasury split guardrails (60/30/10 default with explicit bounds) matching the
  whitepaper distribution schedule, supporting predictable emissions and
  treasury
  discipline.【F:dynamic-capital-ton/config.yaml†L1-L25】【F:docs/dynamic-capital-ton-whitepaper.md†L31-L66】
- Staking locks and multipliers are codified (3/6/12 month tiers with 1.2×–2.0×
  boosts), aligning with the staking narrative in the whitepaper, while theme
  pass governance addresses and royalty sinks are preset for DAO-managed NFT
  drops.【F:dynamic-capital-ton/config.yaml†L16-L49】【F:docs/dynamic-capital-ton-whitepaper.md†L97-L133】
- Supabase defaults replicate the treasury boundaries on the off-chain side,
  seeding operations, auto-invest, and buyback percentages along with
  authoritative wallet addresses, minimizing drift between database state and
  contract configuration.【F:dynamic-capital-ton/supabase/schema.sql†L41-L74】

## Smart Contract Review

- The allocator contract validates TIP-3 transfers end-to-end: it enforces
  jetton wallet provenance, reads all canonical fields, requires the declared
  forward TON amount, and emits structured `DepositEvent`s for analytics.
  Forward payload parsing confirms the `POOL` opcode and guards zero-value
  deposits.【F:dynamic-capital-ton/contracts/pool_allocator.tact†L66-L170】
- Governance functions include timelocked router/treasury updates and pause
  toggles, ensuring administrative actions require queued execution and base
  workchain validation to prevent cross-chain
  misconfigurations.【F:dynamic-capital-ton/contracts/pool_allocator.tact†L1-L128】【F:dynamic-capital-ton/contracts/pool_allocator.tact†L170-L218】
- Contract documentation covers deployment prerequisites for the jetton
  master/wallets, theme pass collection operations, and DNS integrations,
  providing concrete instructions for ops teams and indexers to track governance
  events.【F:dynamic-capital-ton/contracts/README.md†L1-L88】

## Testing and Verification Coverage

- Deno-based allocator tests simulate timelock behavior, swaps, withdrawals, and
  compliant TIP-3 transfers, asserting router forwarding, payload decoding, and
  rejection paths for malformed
  inputs.【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】
- Supabase edge functions are unit tested: wallet linking checks address
  ownership conflicts and update paths, while subscription processing stubs
  Supabase, pricing helpers, and TON indexer responses to validate config
  loading and payment verification
  logic.【F:dynamic-capital-ton/supabase/functions/link-wallet/index.test.ts†L1-L96】【F:dynamic-capital-ton/supabase/functions/process-subscription/index.test.ts†L1-L120】
- Telegram Mini App documentation prescribes manual verification steps (proxy
  guards, env setup) complementing automated tests, ensuring developers can
  reproduce end-to-end flows during
  audits.【F:dynamic-capital-ton/apps/miniapp/README.md†L1-L52】

## Infrastructure and Off-Chain Services

- TON global configuration ships with a populated static node list, enabling
  validators and liteservers to bootstrap connectivity immediately after
  deployment.【F:dynamic-capital-ton/global.config.json†L1-L80】
- Supabase schema models users, wallets, subscriptions, staking, emissions,
  config, and transaction logs with uniqueness constraints and seeded treasury
  endpoints, providing traceable accounting and emission
  reporting.【F:dynamic-capital-ton/supabase/schema.sql†L1-L74】
- Subscription processing integrates shared pricing helpers for TON/USD
  calculations, expects Telegram bot credentials for confirmations, and verifies
  TON payments against a configurable indexer endpoint, aligning treasury
  reconciliation with market data
  inputs.【F:dynamic-capital-ton/supabase/functions/process-subscription/index.ts†L1-L158】

## Outstanding Risks and Recommendations

1. **Sustain implementation checklist evidence:** The allocator plan now marks
   parsing, forwarding, and regression milestones complete, but each release
   should continue linking to command output or audit trails so future reviews
   can confirm the fixes remain
   intact.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L66-L110】
2. **Automate quality gate execution:** The runbook enumerates formatting,
   linting, allocator, and Supabase regression commands; promote these into CI
   workflows (or require attached logs in pull requests) to guarantee the
   documented expectations are consistently
   applied.【F:docs/dct-ton-quality-gates.md†L1-L74】【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】【F:dynamic-capital-ton/supabase/functions/link-wallet/index.test.ts†L1-L96】
3. **Extend monitoring playbooks:** While the whitepaper outlines analytics
   expectations, add operational runbooks tying on-chain events (DepositEvent,
   ThemeContentEvent) to observability dashboards to close the loop between
   contracts and
   reporting.【F:docs/dynamic-capital-ton-whitepaper.md†L108-L146】【F:dynamic-capital-ton/contracts/README.md†L54-L88】
4. **Validate environment secrets management:** Supabase functions throw on
   missing credentials; ensure deployment tooling references secure secret
   storage (e.g., Doppler, Supabase config) and document rotation procedures
   alongside the Mini App setup
   guide.【F:dynamic-capital-ton/supabase/functions/link-wallet/index.ts†L1-L56】【F:dynamic-capital-ton/apps/miniapp/README.md†L1-L35】

## Next Steps for Launch Readiness

- Update the implementation plan to reflect completed allocator milestones and
  track any remaining governance or analytics tasks prior to mainnet
  launch.【F:dynamic-capital-ton/IMPLEMENTATION_PLAN.md†L47-L96】
- Run and record allocator and Supabase function tests as part of a release
  candidate checklist, ensuring reproducible evidence for stakeholders and
  external
  auditors.【F:dynamic-capital-ton/apps/tests/pool_allocator.test.ts†L1-L194】【F:dynamic-capital-ton/supabase/functions/process-subscription/index.test.ts†L1-L120】
- Align Supabase configuration with on-chain treasury addresses by verifying
  staged values match the final deployment accounts before flipping production
  traffic.【F:dynamic-capital-ton/supabase/schema.sql†L41-L74】
- Expand documentation to include dashboard wiring for DepositEvent analytics,
  ensuring governance can monitor swap inflows, theme pass updates, and staking
  participation
  post-launch.【F:dynamic-capital-ton/contracts/pool_allocator.tact†L114-L170】【F:dynamic-capital-ton/contracts/README.md†L54-L88】
