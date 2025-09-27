# Dynamic Capital Token Glossary

This glossary centralizes precise language for the Dynamic Capital Token (DCT)
ecosystem. Consult it when modeling supply mechanics, structuring sale rounds,
auditing treasury activity, or preparing governance proposals so teams, DAO
members, and external partners share the same definitions and numerical
assumptions.

## Core Token Concepts

- **Dynamic Capital Token (DCT)** — Primary utility and governance jetton on The
  Open Network (TON); required for product access, fee settlement, and incentive
  payouts across Dynamic Capital services.
- **Jetton Standard** — TON-compliant fungible token interface that governs how
  DCT balances are minted, transferred, and queried across wallets and smart
  contracts.
- **Jetton Minter** — Multi-signature controlled contract that mints or burns
  DCT, enforces policy limits, and schedules vesting transactions.
- **Supply Cap** — Hard ceiling of 100,000,000 DCT (100M) that may only change
  through Token Assembly ratification and subsequent minter updates.
- **Circulating Supply** — Freely transferable DCT after excluding escrowed,
  vested, or timelocked balances held by treasury programs or contractual
  obligations.
- **Treasury Wallets** — Multi-sig TON addresses that custody undistributed
  allocations, market operations inventory, and liquidity reserves.

## Distribution & Vesting

- **Token Generation Event (TGE)** — Timestamp when DCT becomes transferable,
  activating initial unlocks, investor distributions, and automated vesting
  contracts.
- **Cliff** — Fixed duration after TGE (e.g., 6–12 months) when specific
  allocations remain locked before linear vesting begins.
- **Linear Vesting** — Release schedule that emits a constant amount of DCT per
  block or per day following the cliff, commonly applied to team and advisor
  tranches.
- **Emission Schedule** — Governance-approved calendar detailing cliffs, release
  rates, pause rights, and total allocation sizes for every tranche.
- **Treasury Emissions Pause** — Emergency control that temporarily halts
  scheduled vesting when predefined risk thresholds (volatility, drawdown,
  liquidity coverage) are breached.

## Sale Rounds & Pricing

- **Private Sale** — Pre-launch allocation sold to strategic investors at
  discounted pricing in exchange for lockups, information rights, and support
  commitments.
- **Community Sale** — Public campaign denominated in TON or stablecoins that
  delivers immediate unlocks and may award staking multipliers for voluntary
  lock periods.
- **Liquidity Bootstrap Pool** — Dedicated tranche (often 5–10% of circulating
  supply) seeded on TON DEX venues such as STON.fi or DeDust to establish
  two-sided liquidity at launch.
- **Dutch Auction** — Sale mechanism where the price decays from a ceiling to a
  floor until bids clear; the clearing price anchors secondary-market
  valuations.
- **Price Band** — Governance-defined min–max price corridor that constrains
  auction parameters or market-making orders during launch windows.

## Utility & Incentive Programs

- **Access Staking** — Locking DCT for a predetermined term (30, 90, or 180
  days) to unlock premium analytics, AI trading signals, or liquidity desks.
- **Staking Multiplier** — Bonus factor applied to staked DCT that scales with
  the lock duration; e.g., 1.2× for 90-day locks, 1.5× for 180-day locks.
- **Liquidity Mining** — Reward program distributing DCT proportional to
  provided liquidity depth, uptime, and spread quality on approved TON DEX
  pools.
- **Penalty Burns** — Automated destruction of DCT collected from penalties once
  treasury runway exceeds the 18-month target, reinforcing scarcity.
- **Treasury Buybacks** — Market operations where treasury deploys protocol
  revenue to repurchase DCT, stabilize pricing, and recycle value to long-term
  contributors.

## Governance & Risk Controls

- **DAO Multisig** — Core signer set empowered to submit parameter updates,
  execute treasury transactions, and trigger emergency measures subject to
  on-chain accountability.
- **Token Assembly** — Community-wide voting process that ratifies DAO multisig
  proposals and enforces a mandatory execution timelock.
- **Risk Council** — Specialized committee authorized to apply temporary
  volatility controls, such as pausing liquidity mining or tightening price
  bands, with post-event reporting obligations.
- **Timelock** — Waiting period (typically 24–72 hours) between proposal
  approval and execution that grants stakeholders time to review or contest
  changes.
- **Guardrail Metrics** — Quantitative triggers—liquidity depth, treasury
  coverage, volatility percentile—that mandate governance review or automated
  responses when breached.

## Market Operations & Reporting

- **STON.fi Pool** — Primary TON automated market maker (AMM) pair (DCT/TON)
  targeted to maintain ≥250,000 TON of depth within ±2% of mid-price.
- **DeDust Order Book** — Complementary DCT market offering limit order books
  suited for institutional flows and cross-venue arbitrage.
- **Liquidity Buffer** — Inventory of DCT earmarked for market makers and
  off-chain desks to backstop spreads during volatility events.
- **Depth Target** — Governance baseline of 1,000,000 TON aggregate depth across
  approved venues to support block trades without excessive slippage.
- **Market-Ops Report** — Weekly transparency digest summarizing buybacks,
  staking utilization, guardrail status, and liquidity rotations.
- **Transparency Stack** — Public dashboards and explorers (STON.fi Analytics,
  DeDust Scanner, TONviewer, DexScreener) that publish real-time DCT metrics for
  stakeholders.

## Compliance & Integrations

- **Circulating Supply Dashboard** — Public tracker aggregating unlocks,
  buybacks, and burn totals for oversight by the DAO and external partners.
- **Treasury Accounting** — Finance-led reconciliation process mapping on-chain
  DCT movements to fiat settlements, staking payouts, and custody statements.
- **Integration Checkpoints** — Pre-launch reviews ensuring bots, apps, and API
  clients reference canonical token metrics and abide by rate limits.
- **Glossary Compliance** — Requirement that documentation, prompts, and
  automated messaging adopt the definitions in this glossary to prevent drift.

Keep this document version-controlled alongside the whitepaper and treasury
runbooks, and update entries whenever governance introduces new programs or
refines token mechanics.
