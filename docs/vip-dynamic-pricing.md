# VIP Dynamic Pricing & Promo Automation

## Overview

Dynamic pricing for VIP subscription plans is now calculated by the
`vip-dynamic-pricing` Supabase Edge Function. The function consumes recent
trading telemetry and market rates, stores the computed price alongside metadata
on the `subscription_plans` table, and exposes the updated values to every
client (web, mini app, Telegram, TON processor).

Promo codes can now be generated automatically through the `promo-auto-generate`
function, which evaluates engagement and revenue analytics to issue time-bound
incentives without manual intervention.

## Pricing Function

- **Endpoint**: `supabase/functions/vip-dynamic-pricing`
- **Auth**: Optional bearer or `x-api-key` header. When `VIP_PRICING_SECRET` is
  set the header must match the secret.
- **Lookback**: Defaults to the last 30 days (`VIP_PRICING_LOOKBACK_DAYS` can
  override; minimum 7).
- **Inputs**: Optional `planIds: string[]` filter and a `preview` flag.
- **Outputs**: For each plan the function returns the base price, the computed
  dynamic price, display price, TON/DCT conversion, adjustment breakdown, and a
  performance snapshot.
- **Formula**:
  - `winRateAdjustment = clamp((winRate - 55%) * 0.6, -20%, +25%)`
  - `momentumAdjustment = clamp((recentWinRate - winRate) * 0.4, -10%, +12%)`
  - `volumeAdjustment = clamp(log1p(totalTrades) * 1%, 0%, +10%)`
  - `cancellationPenalty = clamp(-(cancellations / trades) * 10%, -10%, 0%)`
  - `totalAdjustment = clamp(sum(adjustments), -25%, +35%)`
  - `dynamicPrice = basePrice * (1 + totalAdjustment)`
  - TON amounts are derived via [tonapi.io](https://tonapi.io) (override with
    `TON_USD_OVERRIDE`). DCT is pegged 1:1 with the USD display price.
- **Persistence**: Updates the following columns on `subscription_plans`:
  - `dynamic_price_usdt`
  - `pricing_formula`
  - `last_priced_at`
  - `performance_snapshot` (JSON payload with metrics, adjustments, TON/DCT
    amounts and delta vs the previous dynamic price).

## TON Subscription Flow

The TON edge function
(`dynamic-capital-ton/supabase/functions/process-subscription`) now:

- Fetches live plan pricing via Supabase instead of static TON constants.
- Recomputes the TON amount from the same TON/USD rate as the pricing service.
- Persists metadata in the response so TON clients can display the USD, TON, and
  DCT amounts consistently.

## Promo Auto-Generation

- **Endpoint**: `supabase/functions/promo-auto-generate`
- **Auth**: Optional bearer or `x-api-key` header gated by
  `PROMO_AUTOGEN_SECRET`.
- **Logic**:
  - Pulls the last 7 days of `daily_analytics` rows.
  - Fires when either:
    - Average new users ≥ `PROMO_AUTOGEN_MIN_USERS` (default `25`), or
    - Total revenue ≥ `PROMO_AUTOGEN_MIN_REVENUE` (default `5000`).
  - Targets the highest-priced plan and issues a 20% (growth) or 15% (revenue)
    discount with a 5–7 day validity window.
  - Skips generation if an active auto-created promo is still valid unless the
    caller sets `force: true`.
- **Storage**: Inserts into `promotions` with `auto_created`, `generated_via`,
  and a `performance_snapshot` containing analytics context and thresholds.

## Telegram Admin Updates

- Promotions view shows whether a promo was auto-generated and what triggered
  it.
- A new "🤖 Auto Generate" button invokes the promo function directly from
  Telegram for on-demand runs.

## Scheduling & Operations

- **Recommended cadence**: schedule `vip-dynamic-pricing` hourly via Supabase
  cron (or any orchestrator) to keep prices current; nightly runs are the bare
  minimum.
- **Promo generator**: run daily after analytics ingestion. The function is
  idempotent and will refuse to create overlapping auto promos.
- **Environment variables**:
  - `VIP_PRICING_SECRET`, `VIP_PRICING_LOOKBACK_DAYS`
  - `TON_USD_OVERRIDE`
  - `PROMO_AUTOGEN_SECRET`, `PROMO_AUTOGEN_MIN_USERS`,
    `PROMO_AUTOGEN_MIN_REVENUE`

Adjustments and thresholds are encoded in the database snapshots to support
audits and rapid tuning without code changes.
