---
title: "Dynamic Capital TON Technical Paper"
version: "v1.1.0"
date: "2024-05-10"
status: "Draft for contributor review"
---

# Dynamic Capital TON Technical Paper

## Abstract / TL;DR
Dynamic Capital fuses education, trading intelligence, and coordinated capital on The Open Network (TON) through the DCT Jetton. DCT unlocks premium learning plans, governs treasury policy, coordinates staking incentives, and underpins outside investor participation in on-chain fund structures. Controlled burns, buybacks, and emission pacing limit supply growth while modular contracts and transparent reporting provide verifiable trust. This document formalizes the design, economics, governance, and operational policies for the Dynamic Capital ecosystem.

## Contacts & Repositories
- **Website**: https://dynamic.capital
- **Telegram**: https://t.me/DynamicCapital
- **GitHub (contracts)**: https://github.com/dynamic-capital/ton-contracts
- **GitHub (apps & docs)**: https://github.com/dynamic-capital/platform
- **TON Explorer (DCT Jetton)**: https://tonviewer.com/<dct_jetton_address>
- **TON Explorer (DAO Multisig)**: https://tonviewer.com/<dao_multisig_address>

## Change Log (Versioning Policy)
| Version | Date       | Summary                                            |
| ------- | ---------- | -------------------------------------------------- |
| v1.1.0  | 2024-05-10 | Optimized structure, expanded economics, clarified guardrails. |
| v1.0.0  | 2024-05-08 | Initial release of the Dynamic Capital TON paper. |

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. Vision & Market Context](#2-vision--market-context)
- [3. System Overview](#3-system-overview)
- [4. Token Design (DCT Utility)](#4-token-design-dct-utility)
- [5. Tokenomics](#5-tokenomics)
- [6. Monetary Policy](#6-monetary-policy)
- [7. Subscriptions & Access](#7-subscriptions--access)
- [8. Staking & Rewards](#8-staking--rewards)
- [9. Governance](#9-governance)
- [10. Outside Investor Participation](#10-outside-investor-participation)
- [11. Transparency & Reporting](#11-transparency--reporting)
- [12. Risk Management & Operations](#12-risk-management--operations)
- [13. Security](#13-security)
- [14. Compliance (Non-Legal Guidance)](#14-compliance-non-legal-guidance)
- [15. Roadmap & Milestones](#15-roadmap--milestones)
- [16. Economics & Scenario Analysis](#16-economics--scenario-analysis)
- [17. Implementation Details (Developer Appendix)](#17-implementation-details-developer-appendix)
- [18. Glossary](#18-glossary)
- [19. Handy Equations](#19-handy-equations)
- [References](#references)

## 1. Executive Summary

### 1.1 Problem & Opportunity
Retail and professional participants on TON lack a unified source for credible education, actionable signals, and professionally managed pooled capital. Fragmented resources slow onboarding, while off-chain coordination erodes transparency and scalability. Dynamic Capital addresses the gap by combining human and AI expertise with on-chain accountability.

### 1.2 Dynamic Capital & Why TON
Dynamic Capital integrates AI-curated education, automated signals, and fund management into a cohesive TON-native platform. TON’s Jetton (TIP-3) standard, Telegram-native distribution, and low-fee settlement stack make it the optimal network for rapid retail adoption and composable on-chain finance.

### 1.3 Token & Ecosystem Snapshot
| Metric | Value |
| ------ | ----- |
| Total Supply | Fixed 1,000,000 DCT minted at genesis |
| Core Utilities | Subscription payments, staking boosts, governance voting, fee discounts, referral routing |
| Deflationary Levers | Default 10% subscription burn, early unlock penalties, monthly buyback-and-burn program |
| Governance | DAO-managed parameters with quorum-based voting, timelocks, and registry-managed upgrades |

### 1.4 Key Risks Disclaimer
DCT is a utility/governance token with no guarantee of financial returns. Trading strategies and fund products carry market risk, smart contracts may contain vulnerabilities, and regulatory obligations can change. Participants must perform independent diligence and consult legal or financial advisors as needed.

## 2. Vision & Market Context
- **Audience Segments**: Learners seeking structured curricula, active traders requiring signal automation, and outside investors seeking professionally managed TON strategies.
- **Hybrid Model Rationale**: Education builds trust, signals deliver immediate utility, and pooled capital scales successful strategies. The closed feedback loop—learning drives adoption, adoption grows TVL, TVL funds richer content—maximizes network effects.
- **Why TON**: Jetton/TIP-3 interoperability, Telegram-native distribution channels, and low transaction fees enable seamless onboarding, recurring micro-payments, and composable integrations across TON DeFi venues.

## 3. System Overview
Dynamic Capital operates a modular contract stack deployed on TON. Telegram Mini Apps and ton-connect enabled web clients orchestrate user flows by calling these contracts.

### 3.1 Components & Roles
| Component | Role |
| --------- | ---- |
| **DCT Jetton** | Utility/governance token minted once and distributed per tokenomics. |
| **SubscriptionManager** | Processes DCT payments, enforces burns/splits, and updates access entitlements. |
| **StakingVault** | Receives stakes, tracks lock boosts, and streams incentives. |
| **Treasury Multisig** | DAO-controlled reserves funding operations, buybacks, and grants. |
| **FundPool** | Aggregates subscription-derived capital earmarked for trading strategies. |
| **InvestmentVault** | Accepts USDT-Jetton or TON from KYC-cleared investors, issuing FST fungible shares or FSN fractionalized NFTs. |
| **NAVRegistry & Oracle** | Stores signed NAV and key metrics; oracle signers publish attestations. |
| **RedemptionQueue** | Batches investor exits and enforces gating rules. |
| **BuybackRegistry** | Logs treasury buybacks with transaction proofs and router metadata. |
| **DAO Multisig + Timelock + Registry** | Governs critical parameters via staged execution and upgradeable address indirection. |
| **Frontends** | Telegram Mini App and ton-connect dashboards guiding subscriptions, staking, and investment flows. |

## 4. Token Design (DCT Utility)
- **Core Roles**: Payment instrument for access plans, staking collateral for rewards and boosts, governance voting weight, fee discount mechanism, and deflationary sink through burns.
- **Non-Security Stance**: DCT conveys utility and governance only—no revenue or profit entitlement. Treasury distributions require DAO approval and avoid dividend mechanics.
- **Interoperability**: Implements TIP-3 Jetton standards with metadata for cross-app compatibility. Router allowlists and guardrails mitigate malicious routing or spoofed transfers.

## 5. Tokenomics

### 5.1 Total Supply
Fixed 1,000,000 DCT minted at genesis with no mint function, guaranteeing a capped supply.

### 5.2 Allocation
| Allocation | Percent | Amount (DCT) | Notes |
| ---------- | ------- | ------------ | ----- |
| Community Programs | 50% | 500,000 | Incentives, partnerships, liquidity provisioning |
| Treasury Reserve | 20% | 200,000 | DAO-controlled operations and runway |
| Staking & Incentives Pool | 15% | 150,000 | Emissions for staking rewards |
| Team | 10% | 100,000 | Contributor compensation with cliffs |
| Advisors | 5% | 50,000 | Strategic advisory grants |

### 5.3 Vesting & Locks
- **Team**: 12-month cliff, followed by linear monthly vesting over 24 months via timelocked vaults.
- **Advisors**: 6-month cliff, then linear monthly vesting over 18 months.
- **Treasury & Staking Wallets**: Governed via DAO timelock; outbound transfers require queued proposals and on-chain execution.

### 5.4 Emissions Schedule (Staking Incentives Pool)
| Year | Emission (DCT) | Notes |
| ---- | -------------- | ----- |
| 1 | 60,000 | Initial boost to bootstrap staking TVL |
| 2 | 45,000 | Gradual taper as organic demand strengthens |
| 3 | 30,000 | Sustains rewards as treasury buybacks scale |
| 4 | 15,000 | Long-tail incentives with optional DAO reallocation |
Unallocated incentives roll forward subject to DAO oversight.

### 5.5 Circulating Supply Methodology
Circulating supply excludes timelocked team/advisor tokens, DAO reserves not queued for release, and unstreamed staking emissions. NAV dashboards calculate circulating supply as total minted minus locked allocations and cumulative burns, publishing both figures on-chain for verifiability.

## 6. Monetary Policy

### 6.1 Point-of-Use Burns & Splits
Default split on subscription payments:
- **Burn**: 10%
- **FundPool**: 30%
- **Treasury**: 60%
Governance may adjust percentages within guardrails of 5–20% burn, 20–40% FundPool, and the remainder to Treasury. Adjustments require quorum approval and a timelocked execution window.

### 6.2 Periodic Buyback-and-Burn
- **Cadence**: Monthly windows aligned with treasury reporting.
- **Budget**: ≤20% of liquid USDT/TON reserves per window.
- **Execution**: DAO authorizes router allowlists and slippage caps; executed trades and burned amounts are logged in the BuybackRegistry with transaction hashes and proof documents.

### 6.3 Transfer Tax (Optional)
Transfer tax is disabled by default. If activated, it is capped at 1% with whitelists for liquidity pools, bridges, and system contracts to avoid circular burns. Any activation or parameter change must pass DAO quorum and include transparent rationale.

## 7. Subscriptions & Access

### 7.1 Plans
| Plan | Price (DCT) | Duration | Notes |
| ---- | ----------- | -------- | ----- |
| VIP | 250 | 30 days | Signals, analytics, community channels |
| Mentorship | 750 | 30 days | Includes VIP benefits plus 1:1 expert sessions |
Renewals can occur within a five-day grace period without losing streak multipliers or loyalty eligibility.

### 7.2 Payment Flow
1. The user transfers DCT via the SubscriptionManager contract.
2. The contract executes burns and splits per active parameters, forwarding shares to FundPool and Treasury.
3. The subscriber’s access timestamp is updated on-chain; frontends surface status through ton-connect wallet calls.

### 7.3 Fiat Relay (MVR)
- **Peg**: 1 USDT = 20 MVR stored per invoice ID for predictable quoting.
- **Gateway**: Whitelisted off-chain processors call `payFor(beneficiary)` with payment proofs, ensuring burns and splits still settle on-chain.
- **Reconciliation**: Treasury maintains a ledger that reconciles fiat receipts against on-chain burns, with variance alerts and audit logs.

### 7.4 Refund & Chargeback Policy
Tokens burned on payment are irreversible. In exceptional support cases, the Treasury may issue discretionary credits or DCT transfers after DAO-approved review; all adjustments are logged for auditability.

## 8. Staking & Rewards
- **Mechanics**: Users stake DCT with optional lock durations providing boost multipliers—1 month ×1.1, 3 months ×1.2, 6 months ×1.35, and 12 months ×1.6.
- **Reward Source**: Emissions from the staking incentives pool streamed to the StakingVault per epoch.
- **Early Unlock Penalty**: 20% of principal; 50% burned and 50% sent to Treasury.

### 8.1 Reward Formulas
```
reward_rate = yearly_emission / seconds_in_year
effective_stake_user = amount * boost
user_rewards_per_sec = reward_rate * (effective_stake_user / Σ effective_stake)
```

### 8.2 Loyalty Rebates & Referrals
- **Loyalty Rebates**: Treasury earmarks 2% of gross subscription DCT for monthly rebates to users with ≥6-month locks, distributed pro-rata by effective stake.
- **Referral Rewards**: 5% of the Treasury subscription share supports referrers for the first three months of each referred user—paid in existing DCT without minting.

## 9. Governance
- **Structure**: DAO multisig with timelock manages subscription basis points, buyback budgets, router allowlists, emissions pacing, and treasury disbursements.
- **Quorum & Process**: Minimum participation of 10% of circulating DCT. Proposals undergo a three-day voting window followed by a 48-hour execution delay.
- **Upgradeability**: Registry pattern allows modules to be upgraded while preserving state. Upgrades follow a pause–upgrade–verify playbook with regression testing.
- **Voter Incentives**: 0.2% of the Treasury subscription share is streamed to participating voters on proposals that meet quorum, balancing engagement without distorting outcomes.

## 10. Outside Investor Participation
- **KYC-Pass NFT**: Non-transferable TIP-4 token gating InvestmentVault deposits and redemptions. Issuance requires approved KYC and jurisdiction checks.
- **Deposits**: InvestmentVault accepts USDT Jetton and TON, minting FST fungible shares at current NAV or FSN fractionalized NFTs for larger tranches.
- **Fees**: 2% annual management fee accrued block-by-block and a 20% performance fee above the high-water mark (HWM) crystallized quarterly.
- **Redemptions**: Monthly windows with a three-month initial lock and a 15% AUM gate. Oversubscribed requests are filled pro-rata with the remainder queued.
- **NAV Methodology**: NAV combines broker statements, MT5 exports, and on-chain balances. Oracle signers post signed NAV updates to the NAVRegistry at least weekly and after material market events.
- **Transparency**: Each NAV epoch stores the hash of attested documents (IPFS/S3) alongside timestamps and signer metadata.

## 11. Transparency & Reporting
- On-chain counters expose `total_burned`, subscription splits, staking TVL, and buyback rounds.
- Oracle signer sets rotate quarterly with dual-control key ceremonies and revocation procedures.
- Public dashboards surface burn rate, subscription growth, staking participation, buybacks, and NAV history, combining on-chain and attested off-chain data.
- Data retention ensures immutable logs for audits; archives are stored in decentralized storage with encrypted cold backups.

## 12. Risk Management & Operations
- **Trading Risk**: Daily loss limit of 3% of NAV, maximum drawdown of 12%, and automated circuit breakers halting strategies upon breach.
- **Counterparty Risk**: Segregated accounts, restricted access controls, and periodic broker due diligence with rotation policies.
- **Smart-Contract Risk**: Independent audits precede mainnet deployment; staged testnet releases and public bug bounties incentivize disclosure.
- **Treasury Policy**: Maintain ≥12 months of runway in stable assets, diversify across custodians, and enforce spend caps via timelock approvals.

## 13. Security
- **Key Management**: Hardware security modules and multisig signers safeguard treasury keys; threshold signatures authenticate high-value actions.
- **Pausable Modules**: SubscriptionManager, BuybackRegistry, and InvestmentVault include emergency pause functions callable by the DAO multisig.
- **Allowlists & Caps**: Router allowlists, spend caps, and reentrancy guards are enforced across contracts to prevent exploitation.
- **Audit Roadmap**: Engage two independent firms pre-launch; publish full reports and remediation steps. Bug bounty payouts scale by severity and remain in continuous scope.

## 14. Compliance (Non-Legal Guidance)
- Enforce KYC/AML for outside investors and geofence sanctioned jurisdictions via frontend gating and NFT issuance policies.
- Communicate DCT strictly as a utility/governance token distinct from fund share entitlements.
- Provide clear disclosures: no investment advice, highlight market and smart-contract risks, and outline data privacy commitments.
- Retain compliance records per jurisdictional requirements while respecting user privacy and GDPR-style norms.

## 15. Roadmap & Milestones
| Phase | Milestones | KPIs |
| ----- | ---------- | ---- |
| Launch Core Contracts | Deploy DCT, SubscriptionManager, StakingVault, Treasury timelock | Successful audits; ≥1,000 DCT staked |
| Investor Vault | Release InvestmentVault, NAVRegistry, and KYC-Pass issuance | $1M TVL; <1% NAV tracking error |
| Oracle & Reporting | Automate NAV oracle and launch transparency dashboards | Weekly NAV posts; 99% uptime |
| Advanced Analytics | Roll out AI-enhanced signals and mentorship tooling | 20% MoM subscription growth |
| Multi-Share Classes | Introduce differentiated FST/FSN offerings | Two share classes live; investor retention >85% |

## 16. Economics & Scenario Analysis
- **Subscription Sensitivity**: Model monthly subscription counts against burn rate to forecast supply contraction; annualized burn rate approximated from rolling 30-day data.
- **Buyback Policy Effects**: Treasury-funded buybacks reduce float; guardrails align spending with liquidity to avoid treasury depletion.
- **Staking Participation**: APY curves inversely correlate with total effective stake; dashboards illustrate ranges for governance calibration.
- **Stress Cases**: Low revenue or high churn scenarios simulate treasury runway, enabling pre-emptive incentive adjustments and cost controls.

## 17. Implementation Details (Developer Appendix)
- **Contract Interfaces**: TIP-3 Jetton for DCT; SubscriptionManager with burn/split events; Vault interfaces exposing deposit/withdraw functions; BuybackRegistry events capturing router IDs and spend caps.
- **Events**: `SubscriptionPaid`, `BurnExecuted`, `StakeLocked`, `RewardsStreamed`, `BuybackRecorded`, `NAVUpdated`, `RedemptionQueued`.
- **Parameter JSON**: `tokenomics.json` stores configurable values (burn basis points, buyback caps, emission rates) tracked via version-controlled registry.
- **Addresses & Registry Keys**: Maintain testnet/mainnet tables with registry keys such as `subscription_manager`, `staking_vault`, and `buyback_registry` for deterministic discovery.
- **Testing**: Unit tests cover split math, staking boosts, and fee accrual; integration tests simulate subscription, staking, and redemption flows with coverage targets ≥85%.
- **Upgrades**: Follow pause–upgrade–verify playbooks; migration scripts move balances safely and include post-upgrade verification checklists.

## 18. Glossary
- **Basis Points (bps)**: One hundredth of a percent (0.01%).
- **Burn Rate (30-day)**: Rolling metric estimating annualized supply reduction based on the last 30 days of burns.
- **HWM**: High-Water Mark for performance fee calculations.
- **KYC-Pass**: Soulbound NFT verifying investor compliance status.
- **NAV**: Net Asset Value, the per-share valuation of fund assets.
- **TIP-3 / Jetton**: TON fungible token standard supporting metadata and wallet interoperability.
- **TIP-4 / NFT**: TON standard for non-fungible tokens used for KYC-Pass and FSN tranches.

## 19. Handy Equations
```
burn = gross * burn_bp / 10_000
fund = gross * fund_bp / 10_000
treasury = gross - burn - fund

burn_30d = Σ burns over last 30 days
burn_rate_annualized ≈ (burn_30d * 12) / total_supply

reward_rate = yearly_emission / seconds_in_year
user_rewards_per_sec = reward_rate * (effective_stake_user / Σ effective_stake)

perf_fee = max(0, NAV_current - HWM) * perf_rate
HWM_next = max(HWM, NAV_current)
```

## References
- The Open Network (TON) Docs: https://docs.ton.org/
- TIP-3 Jetton Specification: https://docs.ton.org/develop/dapps/jetton
- TIP-4 NFT Specification: https://docs.ton.org/develop/dapps/nft
- Dynamic Capital Roadmap (internal): https://dynamic.capital/roadmap
