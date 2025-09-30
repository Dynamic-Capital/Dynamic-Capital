# Bank-to-DCT Conversion Strategy

## Overview

This document outlines the recommended architecture for converting fiat deposits
in Maldivian bank accounts into on-chain DCT tokens. It prioritizes compliance,
operational resilience, and a consistent user experience across the Dynamic
Capital ecosystem.

## Conversion Lanes

1. **Direct On-Ramp (Gateway):** Integrate with a fiat-to-crypto payment
   processor capable of settling in TON or USDT, then execute a market-maker
   swap into DCT.
2. **Exchange Bridge:** Route users through a centralized exchange (CEX) flow
   where they deposit fiat, purchase USDT, transfer to TON, and swap to DCT from
   within the mini app.
3. **OTC/P2P with Escrow:** Authorize OTC dealers to receive bank transfers and
   programmatically release DCT through an escrow smart contract upon
   confirmation.
4. **Bank Transfer with Invoice Reconciliation:** Accept local bank transfers
   tagged with unique references, verify receipts in Supabase, and mint or
   transfer DCT after confirmation.

## Primary and Fallback Paths

### Primary: Bank Transfer with Automated Reconciliation

- **Rationale:** Minimal integration effort, support for local banking partners,
  and full control within the Dynamic Capital stack.
- **Implementation:** Issue a unique payment memo for each order, collect proof
  of payment, and validate via Supabase edge functions before authorizing a DCT
  transfer.

### Fallback: USDT Bridge via Exchange

- **Rationale:** Delegates fiat handling to trusted exchanges and reduces
  exposure to chargeback or recall risk.
- **Implementation:** Provide guided flows for purchasing USDT, initiating TON
  transfers, and executing an automated DCT swap through the mini app.

## Operational Flow

### Purchase Initiation

- **Order Record:** Insert `orders` entries with `user_id`, `amount_fiat`,
  `target_dct`, `reference_code`, and `status` fields.
- **Pricing Engine:** Quote DCT prices using a USDT peg with a configurable
  spread and a short-term lock window.

### Bank Payment Capture

- **Unique Reference:** Display a distinctive memo/reference string for every
  transfer request.
- **Proof Upload:** Allow users to attach receipts (PDF or image) tied to the
  order record.
- **Webhook or Manual Review:** Match payments via bank webhooks when available
  or queue them for expedited manual verification.

### Verification and Settlement

- **Edge Function Validation:** Confirm amount, payer identity (name/IBAN),
  timestamp tolerances, and check for duplicate submissions.
- **Mint/Transfer:** Trigger the DCT treasury or market-maker wallet to transfer
  tokens on-chain to the user's address.
- **Finalize:** Update order status to `settled` and record immutable audit
  entries.

### USDT Fallback Bridge

- **Wallet Detection:** If a user prefers crypto, bypass bank flows and provide
  a direct "Buy USDT → Swap to DCT" option.
- **Automated Swap:** Use edge functions to coordinate swaps, monitor slippage,
  and capture fee data.

## Compliance and Risk Controls

### KYC Tiers

- **Tier 0:** Wallet-verified users with low purchase limits.
- **Tier 1:** Requires photo ID and selfie verification for higher limits.
- **Tier 2:** Adds proof of address or business documentation for institutional
  access.

### AML Controls

- **Sanctions Screening:** Screen bank transfer names and on-chain wallets
  against sanctions and risk databases.
- **Velocity and Amount Rules:** Flag suspicious transaction patterns for manual
  review.

### Chargeback and Recall Mitigation

- **Delay Window:** Introduce a 1–3 hour hold on large orders or new users
  before releasing DCT.
- **Escrow Option:** Employ on-chain escrow contracts for OTC transactions,
  releasing funds only after bank confirmation.

### Pricing and Volatility Management

- **USDT Peg:** Use a USDT reference rate, convert fiat to USDT via FX feeds,
  and price DCT accordingly.
- **Spread and Fees:** Maintain a transparent fee schedule displayed within the
  application.

### Audit Trail

- **Immutable Logs:** Hash receipt artifacts and anchor them on-chain or within
  notarized Supabase tables.
- **Reconciliation Reports:** Generate daily reconciliations across orders, bank
  statements, and blockchain transfers.

### Optimization Feedback Loop

- **Issue Register:** During each reconciliation cycle, log mismatches, manual
  overrides, or settlement delays into a shared Supabase table with owner,
  severity, and remediation deadline fields.
- **Root-Cause Reviews:** Within 24 hours of a flagged incident, document the
  underlying process, data, or partner failure and propose a preventive control
  change.
- **Metric Dashboard:** Plot daily settlement latency, reconciliation error
  counts, and hedge cost variance so optimization effects are measurable.
- **Back-to-Back Cadence:** Schedule optimization sprints immediately after each
  audit cycle to ensure findings translate into implemented controls.
- **Continuous Tuning:** Prioritize fixes that reduce manual touch time, shrink
  settlement latency, or lower hedging costs. Deploy improvements in small
  batches and monitor their effect on the next audit run.

## Tokenomics and Market Operations

- **Treasury Policy:** Define clear mint allowances and prefer governed minting
  or market-maker inventory over ad-hoc issuance.
- **Buybacks:** Allocate a portion of fiat inflows to scheduled USDT buybacks to
  maintain price stability.
- **Burn Mechanics:** Burn a fixed DCT percentage linked to mentorship or oracle
  services and publish burn events.
- **Liquidity:** Maintain healthy DCT/USDT pools on TON with enforced slippage
  bounds for automated swaps.
- **Oracle Integrity:** Aggregate prices from multiple sources, apply medians,
  and trigger circuit breakers on abnormal deviations.

## User Experience Guidelines

- **Calls to Action:** Offer "Pay by bank (fast)" with the reference code and
  settlement ETA, plus "Pay by USDT (instant)" for crypto-native users.
- **Status Updates:** Use Supabase real-time channels to broadcast status
  changes—Received, Verifying, Settled.
- **Receipts:** Send email or Telegram confirmations containing order IDs and
  on-chain transaction links.
- **Localized Trust:** Highlight Maldivian banking partners and clearly explain
  the memo/reference step.
- **Support:** Provide a one-tap contact option for payment disputes or
  assistance.

## Open Questions

To finalize the build, provide:

- **Banking Scope:** Target Maldivian banks and preferred transfer methods for
  initial support.
- **KYC Provider:** Preferred vendor or appetite for an in-house verification
  workflow.
- **Treasury Rules:** Desired mint allowances, burn percentages, and buyback
  cadence.
