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
  `target_dct`, `reference_code`, `status`, and `expires_at` fields so locks
  can safely time out.
- **Pricing Engine:** Quote DCT prices using a USDT peg with a configurable
  spread and a short-term lock window. Cache each quote hash on the order so
  later reconciliation can confirm that the delivered DCT matches the quote.
- **Reference Allocation:** Generate a unique `reference_code` per order and
  reserve it inside a `payment_references` table to prevent reuse or collisions.

### Bank Payment Capture

- **Unique Reference:** Display a distinctive memo/reference string for every
  transfer request. Keep the reference visible across web, mobile, and email
  confirmations to reduce user error.
- **Proof Upload:** Allow users to attach receipts (PDF or image) tied to the
  order record and store the uploaded asset metadata in a `receipt_uploads`
  table with checksum fields for tamper detection.
- **Webhook or Manual Review:** Match payments via bank webhooks when available
  or queue them for expedited manual verification. The webhook handler should
  insert raw payloads into a `bank_events_raw` table before any parsing to
  provide a defensible audit trail.

### Verification and Settlement

- **Edge Function Validation:** Confirm amount, payer identity (name/IBAN),
  timestamp tolerances, and check for duplicate submissions. Write evaluation
  results to `verification_logs` with fields for rule outcomes and reviewer ID.
- **Mint/Transfer:** Trigger the DCT treasury or market-maker wallet to transfer
  tokens on-chain to the user's address. Persist the transaction hash and
  signer public key in a `treasury_transfers` table.
- **Finalize:** Update order status to `settled` and record immutable audit
  entries. Post a corresponding ledger entry into `accounting_ledger` so fiat
  and token balances reconcile end-to-end.

### USDT Fallback Bridge

- **Wallet Detection:** If a user prefers crypto, bypass bank flows and provide
  a direct "Buy USDT → Swap to DCT" option.
- **Automated Swap:** Use edge functions to coordinate swaps, monitor slippage,
  and capture fee data.

## Data Architecture

```sql
-- orders placed by end users
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_fiat numeric(18,2) not null,
  target_dct numeric(36,8) not null,
  status text check (status in ('pending', 'awaiting_payment', 'verifying', 'settled', 'failed')),
  reference_code text unique not null,
  quote_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table payment_references (
  reference_code text primary key,
  order_id uuid references orders(id),
  status text check (status in ('reserved', 'assigned', 'expired', 'consumed')),
  created_at timestamptz default now()
);

create table receipt_uploads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  storage_path text not null,
  checksum_sha256 text not null,
  uploaded_by uuid not null,
  created_at timestamptz default now()
);

create table verification_logs (
  id bigint generated always as identity primary key,
  order_id uuid references orders(id),
  rule_name text not null,
  result text check (result in ('pass', 'fail', 'manual_review')),
  reviewer_id uuid,
  notes text,
  created_at timestamptz default now()
);

create table treasury_transfers (
  id bigint generated always as identity primary key,
  order_id uuid references orders(id),
  tx_hash text unique not null,
  signer_public_key text not null,
  amount_dct numeric(36,8) not null,
  network text not null,
  created_at timestamptz default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor text not null,
  payload jsonb,
  created_at timestamptz default now()
);
```

The schema favors append-only tables for forensic analysis. Do not mutate raw
bank events or verification logs; instead, layer derived views for reporting.

## Edge Functions and Automation

- **`create-order` Function:** Validates user tiers, computes the quote, reserves
  a payment reference, and inserts the order. Returns signed payment
  instructions plus expiry metadata for the UI.
- **`ingest-bank-event` Function:** Receives webhook payloads, validates source
  signatures, stores raw JSON, and emits a Supabase Realtime event for the
  reconciliation worker queue.
- **`verify-payment` Function:** Runs deterministic rules (amount tolerance,
  payer name similarity, duplicate reference detection) and schedules manual
  review tasks when thresholds are exceeded.
- **`settle-order` Function:** On successful verification, orchestrates the TON
  transaction, logs the transfer, updates the order status, and writes ledger
  entries. Emits metrics for settlement latency and hedging cost variance.
- **`expire-orders` Task:** Cron-triggered process that marks orders past
  `expires_at` as expired, releases reserved references, and notifies users to
  initiate a fresh quote.

## Reconciliation Workflow

1. **Daily Bank Match:** Compare `orders` and confirmed `bank_events_raw`
   entries by amount, reference code, and settlement date. Export mismatches to
   the issue register for remediation.
2. **Ledger Triangulation:** Ensure each settled order has matching ledger,
   treasury transfer, and on-chain transaction hash. Trigger alerts when any
   leg is missing for more than 30 minutes.
3. **FX & Hedge Review:** Re-run the pricing engine with actual FX rates to
   quantify slippage and hedge costs; feed results into the metric dashboard.
4. **Access Review:** Weekly, confirm that only authorized operators have
   ability to approve manual verifications or trigger settlements.

## Security and Compliance Automation

- **KYC Synchronization:** Sync KYC status from the provider nightly. Orders
  auto-expire if KYC downgrades below Tier 1 mid-process.
- **AML Orchestration:** Chain name-screening APIs with on-chain analytics and
  store scored results in `verification_logs`. Require dual approval when scores
  exceed defined thresholds.
- **Retention Policies:** Configure row-level security (RLS) so users access
  only their own orders and receipts, while compliance officers have full audit
  visibility.
- **Key Management:** Store TON signer keys inside an HSM or custodial service.
  Edge functions should request signatures via a short-lived session token
  rather than handling raw keys.

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
  audit cycle to ensure findings translate into implemented controls. Each sprint
  should produce an implementation memo that references the originating audit
  issue IDs and documents the deployed change.
- **Continuous Tuning:** Prioritize fixes that reduce manual touch time, shrink
  settlement latency, or lower hedging costs. Deploy improvements in small
  batches and monitor their effect on the next audit run. Track win/loss ratios
  for experiments to inform future prioritization.

## Incident Response Playbooks

- **Payment Received, Order Missing:** Auto-create a critical incident, freeze
  associated references, and alert on-call operations. Provide a runbook to
  insert the missing order while preserving the original payment timestamp.
- **Verification Rule Failure Spike:** If failure rate exceeds baseline by 3×
  within an hour, pause automated settlements, escalate to compliance, and
  initiate a ruleset review before resuming.
- **TON Transfer Delays:** After 10 minutes without on-chain confirmation,
  trigger a fallback signer or reroute through a backup liquidity provider and
  record the event for the next optimization sprint.

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
