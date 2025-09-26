# Improvement Opportunities

## Add observability to live plan sync

The new real-time flows in the web dashboard and the Telegram Mini App rely on
Supabase Realtime events to refresh subscription plans, but failures currently
fall back to console errors and user-facing banners. Instrumenting these code
paths with metrics or structured logging would make it easier to detect stale
pricing across surfaces and alert the team when Supabase connectivity degrades.
Relevant touchpoints are the `live-subscription-plans` channel handler in the
web app and the matching `miniapp-subscription-plans` listener in the Mini App.

## Expand automated coverage for subscription plans

Neither surface has test coverage for the live plan synchronisation logic. Unit
and integration tests around the `fetchSubscriptionPlans` refresh loop and the
Mini App plan loader would guard against regressions in the Supabase payloads,
Edge Function responses, and UI fallbacks. Consider covering both the success
path and the degraded cases that display cached pricing.

## Consolidate plan metadata

The Mini App now maintains a richer fallback catalogue for VIP plans with
additional metadata (TON and DCT amounts). Extracting those defaults into a
shared module would allow the marketing site, admin console, and Telegram
surfaces to consume the same descriptive copy and baseline pricing without
duplicating constants.

## Harden the Mini App proxy route

The `/api/plans` proxy simply forwards Supabase errors to the client. Adding
basic caching (e.g. revalidating every few seconds) and structured error
responses would reduce the user-facing noise when the Edge Function hiccups and
keeps the app responsive even if Supabase returns transient failures.
