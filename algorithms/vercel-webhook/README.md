# TradingView Webhook Receiver

This package contains a self-contained Vercel serverless function for ingesting
TradingView alerts and persisting them to Supabase. The function performs
signature validation, payload normalization, idempotent storage, and structured
logging so it can be deployed safely as a webhook endpoint.

## Project Layout

```
vercel-webhook/
├── api/tradingview-alerts.ts   # Primary Vercel function handler
├── lib/                        # Normalization, logging, and persistence helpers
├── tests/                      # Vitest unit tests
├── package.json                # Local dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel routing/runtime settings
└── README.md                   # Deployment and runbook notes
```

## Prerequisites

- Node.js 18+
- A Supabase project with a service role key
- A Vercel account (or compatible serverless environment) with access to project
  level environment variables
- A TradingView alert configured to send JSON payloads that include an alert ID,
  symbol/ticker, and timestamp

## Environment Variables

Configure the following variables in Vercel (Project Settings → Environment
Variables) and in your local shell when running tests:

| Variable                     | Description                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `TRADINGVIEW_WEBHOOK_SECRET` | Shared secret sent in the `x-tradingview-secret` header of every TradingView alert. |
| `SUPABASE_URL`               | Supabase project URL.                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase service role key with insert/upsert permissions.                           |
| `SUPABASE_ALERTS_TABLE`      | Optional. Overrides the default `tradingview_alerts` table name.                    |

### Suggested Table Definition

Create a table named `tradingview_alerts` (or the name configured in
`SUPABASE_ALERTS_TABLE`) with columns similar to:

| Column         | Type                       | Notes                                                        |
| -------------- | -------------------------- | ------------------------------------------------------------ |
| `alert_uuid`   | `uuid`                     | Primary key used for idempotency (`on conflict do update`).  |
| `symbol`       | `text`                     | Uppercase ticker symbol.                                     |
| `exchange`     | `text`                     | Optional exchange extracted from the alert (e.g. `BINANCE`). |
| `triggered_at` | `timestamp with time zone` | ISO8601 timestamp derived from the alert payload.            |
| `price`        | `numeric`                  | Optional price point.                                        |
| `action`       | `text`                     | Optional TradingView strategy action (buy/sell/etc.).        |
| `comment`      | `text`                     | Optional strategy comment text.                              |
| `payload`      | `jsonb`                    | Raw TradingView payload for debugging.                       |
| `ingested_at`  | `timestamp with time zone` | Default `now()` to record ingestion time.                    |

## Local Development

```bash
cd algorithms/vercel-webhook
npm install
npm test
```

The Vitest suite covers happy-path ingestion, malformed payload handling, and
secret validation. TypeScript type checking is available via `npm run lint`.

## Deployment (Vercel)

1. Push this directory to your repository and connect the repo to Vercel.
2. In the Vercel project settings, add the environment variables listed above to
   the desired environments (Production, Preview, Development).
3. Deploy. Vercel automatically builds the TypeScript function located at
   `api/tradingview-alerts.ts` using the configuration from `vercel.json`.
4. Configure your TradingView alert to send HTTP POST requests to the deployed
   endpoint: `https://<your-vercel-app>.vercel.app/api/tradingview-alerts` with
   the shared secret in the `x-tradingview-secret` header.

### Testing in Production

Structured JSON logs emitted by the handler contain keys for the alert UUID,
normalized symbol, and Supabase table. This makes it easy to create log-based
alerts or dashboards in Vercel, Datadog, or other observability tooling.

Because the upsert uses the `alert_uuid` primary key, repeated alerts with the
same identifier are safe to replay—the handler performs idempotent writes and
updates the existing row rather than creating duplicates.
