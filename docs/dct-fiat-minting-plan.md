# DCT Minting for Fiat & USDT Settlements — Implementation Plan

## Objective

Ensure bank-transfer (MVR) and USDT subscription settlements mint and persist
Dynamic Capital Token (DCT) awards so off-chain payments stay in lockstep with
the 1 USD ↔ 1 DCT peg established for TON flows.

## Current gaps

- The `finalize_completed_payment` stored procedure only activates subscriptions
  and writes audit logs; it never translates fiat/USDT payment totals into DCT,
  leaving downstream automation blind to the tokens owed for those
  subscriptions.【F:supabase/migrations/20250816000000_set_updated_at_trigger.sql†L33-L88】
- Supabase clients that surface subscription metadata
  (`supabase/functions/_shared/subscriptions.ts`, web/bot syncs) have no field
  to consume fiat-minted DCT totals, so rewards dashboards and treasury
  automation cannot reconcile
  them.【F:supabase/functions/_shared/subscriptions.ts†L1-L56】

## Proposed changes

1. **Schema augmentation**
   - Create a reversible migration that adds `dct_awarded NUMERIC(18,6)` and
     `usd_mvr_rate NUMERIC(10,4)` columns to `public.payments` with sensible
     defaults (NULL) and indexes if reporting queries demand them.
   - Backfill historical rows via the migration using available payment data
     where possible (e.g., infer USD totals from plan pricing for completed
     records without partial refunds) to minimize gaps in analytics.

2. **Stored procedure enhancements**
   - Extend `finalize_completed_payment` to:
     1. Determine the USD notional using `payments.amount` when provided,
        otherwise default to the plan’s USD price.
     2. Detect MVR settlements and convert them using the active `usd_mvr_rate`
        content configuration at settlement time.
     3. Persist both the resolved exchange rate and the computed `dct_awarded`
        (1 USD = 1 DCT) back onto the payment row inside the same transaction.
     4. Raise explicit errors when content entries or plan pricing data are
        missing to keep reconciliation safe.

3. **Function layer updates**
   - Update `_shared/subscriptions.activateSubscription` (and any other
     consumers) to read the new fields so bot/web layers can display and sync
     awarded DCT totals.
   - Confirm no other Supabase Edge Functions need mirrored logic; if they do,
     route all fiat/USDT completions through `finalize_completed_payment` to
     centralize conversions.

4. **Observability & documentation**
   - Add admin log annotations or a dedicated audit table capturing the USD ↔
     DCT resolution for traceability.
   - Document the conversion flow and monitoring hooks in the runbooks covering
     treasury automation and subscription settlement.

## Step-by-step implementation checklist

### 1. Pre-migration analysis

- [ ] Pull the latest production schema to confirm the current shape of
      `public.payments` and identify any triggers or dependent views that could
      be affected by new columns.
- [ ] Audit historical fiat and USDT payment rows to determine which records
      have enough data to backfill `dct_awarded` values automatically.

### 2. Migration authoring & deployment

- [ ] Draft a reversible migration that introduces `dct_awarded` and
      `usd_mvr_rate` on `public.payments`, including sensible defaults and
      comments describing their purpose.
- [ ] Implement a safe backfill routine inside the migration that derives USD
      totals from existing payment data when possible, and document any records
      left null for manual reconciliation.
- [ ] Run the migration locally (`supabase db reset` or targeted commands) to
      verify it applies cleanly before scheduling production deployment.

### 3. Stored procedure enhancements

- [ ] Update `finalize_completed_payment` to resolve the USD notional from the
      payment amount or plan price and to convert MVR amounts using the live
      `usd_mvr_rate` content entry.
- [ ] Persist both the resolved exchange rate and computed `dct_awarded` inside
      the same transaction, ensuring rollbacks cover the new writes if any step
      fails.
- [ ] Add defensive errors when the content configuration or plan pricing data
      is missing so settlements cannot finalize with incomplete information.

### 4. Function and client propagation

- [ ] Surface the new payment fields through
      `_shared/subscriptions.activateSubscription` and any other Supabase edge
      functions that expose subscription metadata.
- [ ] Update downstream consumers (web app, bots, analytics jobs) to read and
      display the awarded DCT totals where relevant.

### 5. Observability updates

- [ ] Extend admin logs or introduce a dedicated audit table that captures the
      USD-to-DCT conversion details for each settlement.
- [ ] Document the new telemetry in treasury and settlement runbooks so support
      teams know where to validate totals.

### 6. Validation & rollout

- [ ] Expand unit tests for fiat and USDT completion paths to assert the stored
      `dct_awarded` amounts respect the configured exchange rate.
- [ ] Execute staging checkouts for USDT and MVR flows, confirming DCT totals
      appear across dashboards and automations.
- [ ] Coordinate production deployment during a low-volume window, capture a
      database snapshot, and monitor post-launch parity between fiat/USDT and
      TON minting outputs.

## Validation strategy

- **Database**: Run `supabase db reset` (or targeted migration tests) locally to
  ensure the new columns and backfill succeed without breaking existing
  triggers.
- **Unit tests**: Expand Supabase Edge Function tests (crypto, bank receipts) to
  assert USD and MVR payments write expected `dct_awarded` values when the
  `usd_mvr_rate` content record varies.
- **Integration**: Execute a sandbox subscription checkout (USDT + bank) against
  staging, verifying DCT totals appear in admin dashboards and downstream
  automation.

## Rollout considerations

- Coordinate migration deploy during a low-volume window;
  `finalize_completed_payment` is hot-path code for settlements, so capture a DB
  backup first.
- Announce the new reporting fields to analytics and finance teams so they can
  incorporate them into existing dashboards.
- Monitor minted DCT totals versus TON path outputs for parity after launch;
  trigger a rollback (remove columns + revert function) if discrepancies arise.
