# Dynamic Capital TON Coin Whitepaper

## Abstract

Dynamic Capital TON Coin (DCT) is the on-chain utility token that powers the
Dynamic Capital ecosystem on The Open Network (TON). The asset enables
permissionless access to quantitative trading signals, liquidity coordination,
and governance. DCT is engineered to align incentives between strategy
contributors, capital providers, and the treasury so that protocol growth
directly benefits active participants. This document outlines the economic
model, supply schedule, and token utilities that underpin the Dynamic Capital
flywheel.

## Protocol Overview

Dynamic Capital delivers AI-assisted trading intelligence, execution
infrastructure, and liquidity programs designed for traders operating across TON
and connected Layer 2 venues. Key components include:

- **Intelligence Layer** – Quantitative models and AI copilots that curate
  actionable strategies, risk dashboards, and automated alerts.
- **Execution Layer** – Routing, portfolio automation, and settlement tooling
  integrated with TON wallets and DEX venues.
- **Liquidity Layer** – Smart vaults and structured pools that coordinate
  capital across market-making, yield, and hedging strategies.

DCT serves as the cohesive utility for these layers by enforcing access
controls, coordinating incentives, and providing settlement guarantees for
protocol participants.

## Total Supply and Tokenomics

DCT tokenomics are meticulously designed to balance protocol liquidity with
long-run alignment between traders, contributors, and the treasury. The supply
is hard capped at 100,000,000 DCT under a time-locked multi-signature
controller; any future adjustments require an on-chain governance vote with
delayed execution safeguards. This mirrors the deployment configuration for the
jetton, anchoring monetary policy in auditable on-chain parameters.

At launch, circulating supply is constrained to programmatic emissions from the
Community & Rewards stream alongside the dedicated Liquidity & Market Making
buffer. Treasury, team, advisor, and grant allocations are escrowed in TON
vesting contracts with transparent cliffs and drip schedules that mirror the
table below. Unlock schedules are published ahead of time, and governance can
pause or re-sequence emissions if security or market stability concerns arise.

Treasury policies route a governed share of protocol fees toward buybacks and
liquidity programs, reinforcing price stability while re-circulating value to
active contributors. Additional sink mechanics—staking lock-ups, vault fees
denominated in DCT, and programmatic burns triggered by slashing or
inactivity—offset new issuance and anchor a deflationary bias over time.
Circulating supply dashboards provide real-time unlock calendars and burn totals
to maintain transparency.

## Price Structure Strategy

### Launch Pricing Mechanics

- **Listing Venues** – Dual list on STON.fi (TON AMM) and a curated DeDust
  order-book pair within the first 24 hours to capture both retail and
  professional flow.
- **Discovery Method** – Conduct a 72-hour Dutch auction with a price band of
  0.08 to 0.12 TON per DCT, seeding 5% of supply; clearing price sets the
  initial AMM pool ratios.
- **Liquidity Buffer Split** – Allocate the 5,000,000 DCT liquidity buffer 60%
  to TON:DCT on STON.fi, 30% to USDT:DCT on DeDust, and retain 10% in treasury
  for post-launch volatility absorption.
- **Slippage Guardrails** – Cap auction wallet orders at 1% of circulating
  supply per transaction and configure AMM pool weights to limit impact to <1%
  for 250,000 TON trades during the first week.

### Secondary-Market Support

- **Target Pairs** – Maintain deep TON:DCT (STON.fi) and USDT:DCT (DeDust)
  liquidity with a minimum combined depth of 1,000,000 TON or equivalent within
  ±2% of the mid-price.
- **Treasury Depth Goals** – Rebalance positions daily to keep at least 65% of
  treasury-managed liquidity in-range and ready for two-sided quotes.
- **Market-Maker Incentives** – Offer 6% annualized DCT incentives for verified
  market-making desks that sustain >90% uptime and <50 bps quoted spreads on
  whitelisted venues.
- **Peg & Volatility Guardrails** – Trigger review if the 7-day moving average
  deviates ±15% from auction VWAP or if intraday volatility exceeds 40%
  annualized.

### Long-Term Stabilization Levers

- **Buyback Cadence** – Deploy up to 20% of monthly net protocol fees toward
  on-chain buybacks, prioritizing periods where price trades below the 90-day
  moving average.
- **Staking Lock Adjustments** – Increase or decrease lock multipliers by 10%
  increments to modulate staking participation when circulating float exceeds or
  falls below target bands.
- **Burn Triggers** – Route 50% of all penalty fees and redeemed buybacks to
  permanent burns once treasury coverage exceeds 24 months of runway.
- **Emission Throttles** – Allow governance to throttle scheduled emissions by
  up to 25% per quarter when liquidity coverage or volatility metrics breach
  risk thresholds.

### Governance Oversight

The DAO Multisig proposes parameter updates, which require a Token Assembly vote
with a 48-hour timelock before execution. Emergency guardrails empower the Risk
Council to impose temporary trading halts or rebalance liquidity within 12 hours
when volatility triggers are breached, subject to post-event ratification.

### Monitoring & Reporting

- Publish real-time dashboards tracking price bands, AMM depth, circulating
  supply, and cumulative burn totals.
- Release weekly market-ops reports summarizing treasury interventions, buyback
  executions, and market-maker performance.
- Conduct a formal governance review of price structure levers every 30 days,
  with quarterly deep dives that audit performance against guardrail metrics.

## Token Supply & Emissions

| Allocation                | Amount (DCT) | Percent of Supply | Vesting / Unlock Schedule                               |
| ------------------------- | ------------ | ----------------- | -------------------------------------------------------- |
| Community & Rewards       | 50,000,000   | 50%               | 48-month emissions with halving every 12 months          |
| Treasury / Operations     | 20,000,000   | 20%               | Governance-gated deployments; quarterly reporting        |
| Team & Advisors (Vested)  | 15,000,000   | 15%               | 12-month cliff followed by 36-month linear vesting       |
| Liquidity & Market Making | 10,000,000   | 10%               | STON.fi & DeDust pools managed by multisig rebalancing   |
| Ecosystem Grants          | 5,000,000    | 5%                | Milestone-based releases with governance approval        |

Emission events are orchestrated via audited TON smart contracts.
Treasury-controlled mint functions are time-locked and require multi-signature
authorization to protect against supply shocks.

## Utility

DCT underpins multiple protocol incentives:

- **Access Tiers** – Staking DCT unlocks progressively advanced trading tools,
  signal bandwidth, and AI copilots. Tier requirements adjust dynamically using
  governance-approved parameters.
- **Fee Reductions** – Holding or staking DCT grants rebates on execution fees,
  vault performance fees, and data subscription costs.
- **Liquidity Mining** – Market makers and vault depositors earn DCT rewards
  proportional to depth, uptime, and risk-adjusted returns.
- **Governance Collateral** – Delegators stake DCT to participate in parameter
  updates, treasury proposals, and compliance policies.
- **Network Credits** – Protocol services such as strategy backtesting, API
  calls, and bot orchestration consume DCT as metered credits.

## Governance

Dynamic Capital Governance (DCG) is a two-house model combining token-weighted
voting with contributor councils:

1. **Token Assembly** – DCT holders delegate voting power to representatives who
   vote on parameter changes, treasury distributions, and product roadmaps.
2. **Contributor Council** – Technical and risk experts review proposals for
   compliance and soundness before escalating to the Token Assembly.

Governance proposals flow through ideation, temperature check, and on-chain
voting stages. Quorum thresholds scale with the total DCT staked in governance
contracts, ensuring that participation grows alongside protocol adoption.

## Treasury Management

The treasury safeguards protocol runway, liquidity provisioning, and strategic
partnerships. Capital is diversified across:

- TON-native stable assets to fund operations and grants.
- Yield-generating vaults with conservative risk scores.
- Liquidity positions backing DCT trading pairs.

Treasury deployments require dual approval from the Contributor Council and
Token Assembly. Reporting dashboards publish monthly transparency updates
detailing inflows, outflows, and performance.

| Operations Treasury Wallet | Address | Explorer Links |
| -------------------------- | ------- | -------------- |
| Multisig (Ops runway)      | `EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD` | [tonviewer](https://tonviewer.com/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD) · [tonscan](https://tonscan.org/address/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD) |

The operations treasury wallet aggregates subscription inflows before routing
governance-approved splits to auto-invest, burn, and working-capital buckets. A
rotation into a new multisig requires synchronized updates across Supabase
`app_config`, DNS resolver records, and the runbooks maintained in
`docs/on-chain-flows.md` to keep the resolver graph consistent.

## Compliance & Risk Controls

Dynamic Capital integrates programmatic KYC/KYB checks for institutional
participants while preserving permissionless access for compliant geographies.
Smart contracts undergo independent security audits and continuous monitoring
for anomaly detection. Risk parameters (leverage caps, vault concentration
limits, circuit breakers) are enforced on-chain to protect against systemic
shocks.

## Roadmap

1. **Phase 1 – Liquidity Bootstrap**: Launch staking tiers, governance portal,
   and market-making incentives for TON DEX pairs.
2. **Phase 2 – Intelligence Expansion**: Release AI trading copilots,
   cross-venue order routing, and dynamic risk dashboards.
3. **Phase 3 – Institutional Onboarding**: Integrate custodial partners,
   structured products, and compliance tooling for regulated entities.
4. **Phase 4 – Cross-Chain Utility**: Extend DCT utility to EVM bridges and L2
   ecosystems with unified staking and fee credits.

## Conclusion

Dynamic Capital TON Coin is the coordination layer connecting intelligence,
liquidity, and governance across the Dynamic Capital stack. The token aligns
incentives for contributors and capital providers while maintaining strict risk
oversight. By combining programmable emissions, utility-driven demand, and
transparent governance, DCT is positioned to catalyze sustainable growth of the
Dynamic Capital ecosystem.
