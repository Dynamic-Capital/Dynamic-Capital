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
  dynamic price, display price, TON/DCT conversion, adjustment breakdown, the
  pricing formula summary that was persisted, and a performance snapshot.
- **Service catalog**: Each run now emits a `service_pricing` block containing a
  mentorship pricing ladder, promo incentives, and live education package
  pricing. The blueprint is persisted to `kv_config` under
  `pricing:service-blueprint` so web, Telegram, and mini app clients can render
  consistent price cards.
- **Formula**:
  - `reliabilityMultiplier = clamp(log10(sampleSize + 1) / log10(5001), 0.25, 1)`
  - `winRateAdjustment = clamp((winRate - 55%) * 0.6, -20%, +25%) * reliabilityMultiplier`
  - `momentumAdjustment = clamp((recentWinRate - winRate) * 0.4, -10%, +12%) * reliabilityMultiplier`
  - `volumeAdjustment = clamp(log1p(totalTrades) * 1%, 0%, +10%)`
  - `cancellationPenalty = clamp(-(cancellations / trades) * 10%, -10%, 0%)`
  - `marketAdjustment = clamp(-0.5 * tonRateDeltaPct, -6%, +6%)` where
    `tonRateDeltaPct` is the percentage change vs the previous snapshot.
  - `consistencyAdjustment` rewards healthy sample sizes and faster average
    holds: `clamp(sampleComponent + holdComponent, -9%, +7%)`
  - `totalAdjustment = clamp(sum(adjustments), -30%, +40%)`
  - `dynamicPrice = basePrice * (1 + totalAdjustment)`
  - TON amounts are derived via [tonapi.io](https://tonapi.io) (override with
    `TON_USD_OVERRIDE`). DCT is pegged 1:1 with the USD display price.
- **Persistence**: Updates the following columns on `subscription_plans` in a
  single upsert call per recalculation run:
  - `dynamic_price_usdt`
  - `pricing_formula`
  - `last_priced_at`
  - `performance_snapshot` (JSON payload with metrics, adjustments, TON/DCT
    amounts, delta vs the previous dynamic price, market drift, and the
    reliability multiplier applied).
  - `kv_config.pricing:service-blueprint` (JSON payload containing VIP,
    mentorship, and promo pricing summaries plus active education packages).

## Mentorship & Education Pricing Blueprint

Every recalculation composes a deterministic mentorship ladder and promo slate
alongside the VIP tiers:

- **Mentorship packages**: Pricing adjusts from the average VIP plan, recent win
  rate momentum, and trade cadence to recommend 2–4 tiers with session counts,
  async support commitments, and unique promo codes.
- **Promo incentives**: Urgency, loyalty, and cancellation pressure combine to
  emit short-lived offers with controlled discount bands.
- **Education packages**: Active `education_packages` rows are re-valued with
  the live TON/USD rate so course cards in the web app and Telegram bot never
  drift from checkout totals.

Clients can read the cached blueprint via the public `plans` function which now
returns `service_pricing` alongside the standard plan list.

## TON Subscription Flow

The TON edge function
(`dynamic-capital-ton/supabase/functions/process-subscription`) now:

- Fetches live plan pricing via Supabase instead of static TON constants.
- Recomputes the TON amount from the same TON/USD rate as the pricing service.
- Persists metadata in the response so TON clients can display the USD, TON, and
  DCT amounts consistently.

## Telegram & Mini App Sync

- The Telegram `/start` and `/plans` commands now pull the latest VIP pricing
  directly from `subscription_plans`, presenting the USD, TON, and DCT amounts
  that match the most recent dynamic pricing snapshot.
- Mini App fallback plan cards no longer embed static TON prices. When Supabase
  data is temporarily unavailable the UI shows placeholder pricing while it
  retries, ensuring hardcoded values never drift from live pricing.

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
