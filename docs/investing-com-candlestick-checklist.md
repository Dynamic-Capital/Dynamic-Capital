# Investing.com Candlestick Signal Integration Checklist

Use this checklist when building the Investing.com candlestick signal pipeline
so the data ingestion, alerting, and Mini App surfaces stay aligned with Dynamic
Capital's existing automation stack.

## 1. Source ingestion & normalization

- [ ] Confirm legal/ToS compliance for polling Investing.com data and record
      retention limits.
- [ ] Document the exact API or scraping strategy (URL patterns, query params,
      rate limits, auth requirements).
- [ ] Build a fetcher (cron job, Supabase Edge Function, or queue worker) that
      downloads the latest candlestick pattern payloads per symbol/timeframe.
- [ ] Normalize raw fields (symbol, timeframe, reliability score, detection
      timestamps) into consistent enums and UTC timestamps.
- [ ] Implement retries, exponential backoff, and failure logging so transient
      network issues do not drop signals.
- [ ] Write unit tests covering parser edge cases (missing fields, new pattern
      names, malformed timestamps).

## 2. Supabase schema & data retention

- [ ] Design/extend a Supabase table (e.g., `public.candlestick_signals`) with
      indexes on symbol, timeframe, detected_at.
- [ ] Define enum or lookup tables for pattern names and reliability tiers to
      avoid typos.
- [ ] Add RLS policies or service-role usage notes documenting how ingestion
      writes bypass end-user restrictions.
- [ ] Create a data retention strategy (e.g., automatic pruning or archival
      after N days) to manage table growth.
- [ ] Expose a Supabase view or RPC that joins signals with relevant pricing
      metadata for downstream consumers.
- [ ] Verify ingestion writes via local Supabase tests and record migrations in
      `supabase/migrations`.

## 3. Queue processing & alert curation

- [ ] Register a queue job that reacts to newly stored signals and applies
      internal risk filters (reliability score, overlapping patterns, price
      context).
- [ ] Deduplicate signals (symbol + timeframe + pattern) within a configurable
      window to avoid double alerts.
- [ ] Implement escalation logic that tags VIP or depositor segments using
      existing queue helpers.
- [ ] Add feature flags/config toggles so ops can pause or adjust alert cadence
      without redeploying code.
- [ ] Log outcomes (skipped, queued, broadcast) with sufficient metadata for
      audit trails.

## 4. Telegram broadcast workflow

- [ ] Map curated signals into the Telegram broadcast planner payload (title,
      body, CTA, segmentation tags).
- [ ] Blend market context with deposit messaging (e.g., highlight funding
      windows or risk reminders).
- [ ] Respect Telegram rate limits using the existing chunking helper and queue
      retries.
- [ ] Provide localized or templated message variants if multilingual support is
      required.
- [ ] Update runbooks documenting how to enable/disable the new signal campaign.

## 5. Mini App market pulse module

- [ ] Define UX for displaying latest/high-confidence patterns within the
      Next.js Mini App dashboard.
- [ ] Implement a Supabase query hook or realtime subscription that surfaces
      fresh signals with timestamps and reliability badges.
- [ ] Add UI states for "no recent signals" and loading/error conditions to
      prevent empty panels.
- [ ] Ensure formatting matches Dynamic UI/Tailwind conventions (spacing,
      typography, color usage).
- [ ] Write integration tests or Storybook stories to validate rendering against
      mock signal data.

## 6. Analytics, monitoring & QA

- [ ] Track ingestion counts, queue throughput, and Telegram delivery metrics
      via existing observability stack (logs, Supabase metrics, Telegram
      response codes).
- [ ] Configure alerts for sustained ingestion failures or queue backlogs.
- [ ] Set up a QA playbook covering end-to-end verification (force-ingest sample
      data, confirm queue job execution, validate Telegram preview, and Mini App
      rendering).
- [ ] Schedule periodic audits to reassess pattern reliability and adjust
      filters accordingly.
- [ ] Document manual rollback steps (disable feature flags, purge recent
      signals, halt queue jobs) for operational incidents.
