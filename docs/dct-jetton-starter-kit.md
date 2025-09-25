# Dynamic Capital Token (DCT) Starter Kit

## Overview

This starter kit captures the core smart-contract, data, and backend flows for
launching the Dynamic Capital Token (DCT) ecosystem on TON. It distills the
design objectives into actionable checklists, a relational schema for Supabase,
and a TypeScript Edge Function that automates the subscription → buyback → burn
→ auto-invest pipeline.

## Jetton Contract Checklist

### Core Properties

- [ ] `maxSupply()` returns `100,000,000 * 10^9` and is immutable after
      deployment.
- [ ] `decimals()` returns `9`.
- [ ] `name()` and `symbol()` are hard-coded as "Dynamic Capital Token" and
      "DCT".
- [ ] `mint()` is callable **only** during genesis by the deployer wallet and
      permanently disabled afterward.
- [ ] `burn(amount)` is public and reduces the tracked `totalSupply`.

### Allocation Enforcement

- [ ] Genesis transactions mint the following fixed amounts to controlled
      wallets:
  | Allocation                | Amount (DCT) | Notes                                |
  | ------------------------- | ------------ | ------------------------------------ |
  | Community & Rewards       | 50,000,000   | Streamed via emissions controller    |
  | Treasury / Operations     | 20,000,000   | Liquidity, partnerships, incentives  |
  | Team & Advisors (Vested)  | 15,000,000   | 12-month cliff, 36-month linear vest |
  | Liquidity & Market Making | 10,000,000   | Initial DEX & market making          |
  | Ecosystem Grants          | 5,000,000    | Grants and ecosystem growth          |
- [ ] After genesis, no account (including multisig) can mint additional tokens.

### Governance & Safety Controls

- [ ] `pauseTransfers(true|false)` is protected by the operations multisig and a
      48-hour timelock.
- [ ] `setTransferTax(bps)` is optional, capped between `0` and `100`, and
      guarded by the same multisig + timelock.
- [ ] `setController(address)` or equivalent hooks require multisig
      authorization with timelock to avoid rogue upgrades.
- [ ] Emergency functions (`pauseTransfers`, `pauseEmissions`) emit events for
      off-chain monitoring.

### Controller Interfaces

- [ ] **Treasury Router:** `setSplits`, `collectPayment`, `setDEXRouter`,
      `setTreasury` — enforce split bounds (Ops 40–75%, Invest 15–45%, Burn
      5–20%) and apply timelock + rate limits.
- [ ] **Emissions Controller:** `setEpochCap`, `setDecayParams`,
      `distributeRewards`, `pauseEmissions`.
- [ ] **Staking Vault (optional at launch):** `stake`, `unstake`,
      `claimRewards`, lock-tier multipliers, and early-exit penalty that routes
      to `burn()`.

### Multisig Configuration

- [ ] Operations multisig is 4/7 (upgradeable to 5/9) and is the sole owner of
      sensitive functions.
- [ ] Timelock delays are enforced on-chain; queued transactions must emit
      `TimelockQueued` events with ETA.
- [ ] A `maxDCVotingSharePct` guard (≤25%) is enforced when counting votes (via
      token snapshots or controller logic).

### Monitoring & Audits

- [ ] Index all governance/timelock events for real-time dashboards.
- [ ] Unit tests cover mint/burn caps, split bounds, and timelock execution
      paths.
- [ ] External audit report stored and referenced in repository docs before
      mainnet launch.

## Supabase Schema (SQL)

The `supabase/migrations/202409081200_dct_foundation.sql` migration creates the
persistence layer for subscriptions, staking balances, and emissions snapshots.

Key tables:

- `dct_users` — links Telegram identity, TON wallet, and creation metadata.
- `dct_subscriptions` — immutable payment log capturing TON inflows, swap
  output, and burn metrics per subscription cycle.
- `dct_stakes` — tracks off-chain staking balances with lock windows, weights,
  and status transitions.
- `dct_emissions` — ledger for epoch rewards distributed from the Community &
  Rewards allocation.

Each table enforces referential integrity and retains operational metadata
(created/updated timestamps, webhook trace IDs, etc.). Numeric columns use
`numeric(30,9)` to match TON/Jetton precision.

## Edge Function: `dct-auto-invest`

Located at `supabase/functions/dct-auto-invest/index.ts`, this function
orchestrates the subscription pipeline once a TON payment is confirmed via the
Mini App.

### Responsibilities

1. Validate the request payload, enforce split bounds, and compute TON amounts
   per bucket.
2. Verify the TON transaction against an indexer (`TON_INDEXER_URL`) and ensure
   funds landed in the intake wallet.
3. Call the configured DEX router to buy DCT for auto-invest and burn buckets,
   respecting slippage/price overrides.
4. Trigger the Jetton burn (if amount > 0) and record external transaction
   hashes for auditability.
5. Upsert the user, insert subscription records, and create/update staking
   ledgers with VIP lock multipliers.
6. Emit a JSON response summarizing ton spent, DCT acquired, burn totals, and
   next renewal date (if provided by the caller).

### Environment Configuration

Add the following keys to your Supabase Edge environment
(`supabase secrets set ...`):

- `OPERATIONS_TREASURY_WALLET` — TON wallet receiving the operations split.
- `INTAKE_WALLET` — TON wallet monitored for subscription inflows.
- `DCT_JETTON_MASTER` — Jetton master address used for burns.
- `DEX_ROUTER_URL` — HTTP endpoint for swaps (wrap STON.fi or your router
  abstraction).
- `TON_INDEXER_URL` — Optional; skips verification if omitted (use during local
  testing).
- `DCT_PRICE_OVERRIDE` — Optional decimal (DCT per TON) for deterministic
  testing.

Optional automation hooks:

- `BURN_WEBHOOK_URL` — If set, the function will `POST` burn instructions after
  swaps.
- `BOT_WEBHOOK_URL` — Receives subscription summaries to notify the Telegram
  bot.

### Testing Notes

- Mock the router and indexer endpoints when running `deno test` or integration
  suites.
- Use the `DCT_PRICE_OVERRIDE` to run deterministic local tests without touching
  mainnet/testnet liquidity.
- Pair with the schema migration to ensure the necessary tables exist before
  deploying the function.

---

With these pieces in place you can progress through Phase 1 of the rollout
roadmap: launch the hard-capped Jetton, wire subscriptions to buyback/burn
automation, and expose VIP staking multipliers via the Mini App.
