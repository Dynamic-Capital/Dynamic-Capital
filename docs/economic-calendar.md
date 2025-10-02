# Economic Calendar Pipeline

## Overview

The economic calendar feature aggregates macroeconomic events, trader sentiment,
and Commitments of Traders (COT) positioning data into Supabase so the web
application and edge functions can serve consistent dashboards.

By default the web client hydrates upcoming events from the public Forex Factory
feed (`https://nfs.faireconomy.media/ff_calendar_thisweek.json`). You can swap
in a private provider by overriding `NEXT_PUBLIC_ECONOMIC_CALENDAR_URL` and, if
needed, `NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY`.

## Database Tables

The following tables are provisioned via the
`20251020090000_market_intelligence_tables.sql` migration:

- **`market_news`** – Stores fundamentals and calendar events with scheduling
  metadata.
- **`sentiment`** – Captures long/short positioning data from sentiment
  providers.
- **`cot_reports`** – Tracks weekly COT snapshots for futures markets.

Each table enables Row Level Security and grants full access to the Supabase
service role, ensuring ingestion scripts and edge functions can read/write data
while keeping anonymous clients isolated.

## Supabase Edge Function

The `economic-calendar` edge function exposes normalized calendar events to the
front-end. Key details:

- Accepts `GET` requests with optional `limit`, `from`, `to`, and `source` query
  parameters.
- Pulls upcoming rows from `market_news`, normalizes forecast/actual commentary,
  and returns an `{ events: [...] }` payload matching
  `FetchEconomicEventsOptions` expectations.
- Supports CORS preflight requests and surfaces structured error responses.

Deploy the function after running migrations:

```bash
supabase migration up
supabase functions deploy economic-calendar \
  --project-ref $SUPABASE_PROJECT_REF \
  --password $SUPABASE_DB_PASSWORD
```

## Testing

Run repository quality gates after updating the pipeline:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
```

These commands format TypeScript/SQL, validate lint rules, ensure type safety,
and execute both Node and Deno test suites (including
`supabase/functions/_tests/economic-calendar.test.ts`).
