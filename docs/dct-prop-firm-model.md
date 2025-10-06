# Dynamic Capital Token (DCT) Prop Firm Blueprint on TON

## Purpose

This playbook translates the "Dynamic Capital Token" (DCT) proprietary trading
firm concept into an actionable architecture on The Open Network (TON). It
aligns engineering, product, and governance teams on how to launch a
transparent, community-driven prop trading ecosystem where capital efficiency,
risk controls, and on-chain verifiability are native capabilities.

## Core Design Pillars

| Pillar                       | Implementation Summary                                                                                          | Owner Roles                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Tokenized Funding Engine     | Deploy and manage the DCT jetton to coordinate capital, staking, and utility flows across the prop firm.        | Token engineering, treasury operations |
| Transparent Trader Lifecycle | Use Trading NFTs and soulbound credentials to codify evaluation outcomes, funded tiers, and revocation logic.   | Trading operations, compliance         |
| Smart-Contract Automation    | Automate capital allocation, profit sharing, and liquidation rules through audited TON contracts.               | Protocol engineering, security         |
| Telegram-Native UX           | Ship a Telegram Mini App that acts as the primary dashboard for onboarding, trading telemetry, and governance.  | Product, frontend engineering          |
| Community Governance         | Embed voting, parameter changes, and treasury proposals into the DCT governance module with verifiable records. | Governance council                     |

## Trader Lifecycle & NFTs

1. **Challenge Entry**
   - Users connect a TON wallet through the Telegram Mini App and mint a
     **Challenge NFT** that encodes evaluation tier, target profit, and max
     drawdown.
   - Smart contracts stream performance data to an on-chain ledger; API surfaces
     read-only metrics to the Mini App.
2. **Evaluation Analytics**
   - Drawdown, risk score, and rule violations are monitored in real time with
     automatic alerts to risk managers.
   - Passing criteria trigger an upgrade transaction that burns the Challenge
     NFT and mints a **Funded Trader soulbound token (SBT)**.
3. **Funded Operations**
   - SBT metadata references the trader's capital allocation bracket, profit
     split, and compliance attestations.
   - Capital adjustments (scale-up or scale-down) are executed via scheduled
     governance actions or automated policies.
4. **Revocation & Appeals**
   - Rule breaches invoke on-chain liquidation of open capital and freeze
     further allocations until governance review.
   - An appeals smart contract records disputes, evidence packets, and final
     resolutions.

## Capital Allocation & Staking Mechanics

| Component           | Mechanism                                                                                                          | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Staking Pool        | DCT holders stake to the liquidity vault; positions are tokenized and transferable with cooling-off windows.       | Rewards streamed in TON or stablecoins sourced from trading profits.                 |
| Capital Vaults      | Dedicated vaults per trader tier allocate capital to risk-isolated sub-accounts.                                   | Vault weights adjust based on aggregate performance and governance policies.         |
| Profit Distribution | Daily (or weekly) settlements split profits between traders, stakers, and treasury using programmable percentages. | Distribution executed in TON or stablecoins with optional auto-compounding into DCT. |
| Loss Absorption     | Drawdowns reduce trader-specific vault balances first, then communal insurance buffers.                            | Insurance buffer funded by a portion of staking rewards and platform fees.           |

## Telegram Mini App Experience

- **Onboarding Hub:** Wallet connection, Challenge NFT minting, KYC
  attestations, and tutorial flows.
- **Trading Dashboard:** Real-time P&L, rule compliance indicators, capital
  scale targets, and payout timers.
- **Staker Console:** Stake/unstake flows, projected APY, historical payouts,
  and governance proposal tracking.
- **Community Layer:** Integrated announcements, support ticketing, and
  governance voting interface.

## Smart Contract Stack on TON

| Module                  | Responsibilities                                                                                      | Hardening Actions                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **NFT & SBT Contracts** | Mint, upgrade, and revoke Challenge NFTs and Funded Trader SBTs with metadata-driven access controls. | Formal verification, unit fuzzing, incident simulation.                    |
| **Capital Vaults**      | Safeguard allocated capital, enforce drawdown thresholds, and coordinate payouts.                     | Multisig guardianship, time-locked upgrades, real-time monitoring hooks.   |
| **Staking Pool**        | Accept DCT stakes, track rewards, and manage cooling-off periods.                                     | Rate limit withdrawals, emergency pause, cross-contract integration tests. |
| **Governance Module**   | Manage proposals, quorum rules, and execution of parameter changes.                                   | Snapshot integration, on-chain audit logs, delegated voting support.       |

## Dynamic Tokenomics & Utility Extensions

- **Fee Utility:** Traders can pay platform and evaluation fees with DCT for
  tiered discounts.
- **Collateral Layer:** Approved traders may over-collateralize with DCT to
  unlock higher leverage brackets.
- **Trade2Earn Rewards:** Profit milestones and consistency streaks trigger DCT
  bonus drops.
- **Treasury Buybacks:** Allocate a percentage of protocol profits to automated
  DCT buyback-and-burn events.

## Risk Management Framework

| Risk Domain         | Controls                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market Risk         | Dynamic position limits, volatility-adjusted drawdown caps, auto-liquidation thresholds.                                                              |
| Operational Risk    | Dual-control admin actions, logging/alerting SLAs, incident runbooks stored in [`docs/team-operations-algorithm.md`](./team-operations-algorithm.md). |
| Regulatory Risk     | Jurisdiction screening, VASP licensing tracker, on-chain identity attestation via compliance partners.                                                |
| Smart Contract Risk | External security audits, bug bounty incentives, staged rollout with circuit breakers.                                                                |

## Governance & Community Engagement

- **Voting Rights:** Staked DCT balances determine voting power with delegation
  support for passive holders.
- **Proposal Pipeline:** Idea intake → forum discussion → on-chain vote →
  execution timelock → implementation.
- **Transparency Reports:** Publish quarterly treasury, staking, and performance
  metrics to maintain trust.
- **Community Rewards:** Host trading competitions, education bounties, and
  product feedback loops fueled by DCT grants.

## Implementation Roadmap (Indicative)

| Phase                 | Horizon   | Milestones                                                                                                   |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| Phase 0 — Foundations | Month 0-1 | Finalize legal structure, smart contract architecture, and risk policies.                                    |
| Phase 1 — Alpha       | Month 2-4 | Deploy staking pool, launch Challenge NFT evaluation, onboard initial cohort.                                |
| Phase 2 — Growth      | Month 5-8 | Scale funded trader tiers, activate automated profit sharing, publish governance charter.                    |
| Phase 3 — Expansion   | Month 9+  | Integrate advanced tokenomics, launch multi-asset trading support, expand to third-party strategy providers. |

## Key Dependencies & Open Questions

- Confirm regulatory positioning across priority jurisdictions before capital
  onboarding.
- Finalize integration path with TON-native brokers and execution venues.
- Scope incident response coverage for Telegram Mini App outages and API
  degradations.
- Determine insurance buffer sizing relative to staker capital and expected
  trader volatility.

## Recommended Next Steps

1. Run a technical design review aligning smart contract modules with existing
   DCT treasury infrastructure.
2. Commission a regulatory gap analysis covering prop trading,
   staking-as-a-service, and tokenized profit shares.
3. Prototype the Telegram Mini App UX with wallet connection, Challenge NFT
   minting, and governance voting flows.
4. Build simulation environments to stress-test capital vault and liquidation
   logic under extreme volatility.
