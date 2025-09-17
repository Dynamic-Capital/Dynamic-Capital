# Vercel Webhook Receiver Workspace

Place the TradingView webhook ingestion project in this directory. The goal is
to keep the serverless function isolated and reproducible so it can be deployed
independently of the rest of the app.

## Recommended Project Skeleton

```
vercel-webhook/
├── api/
│   └── tradingview-alerts.ts   # Primary Vercel function handler
├── lib/                        # Shared validation/normalization helpers
├── tests/                      # Unit/integration tests (Vitest, Jest, etc.)
├── vercel.json                 # Function routing configuration
└── README.md                   # Deployment/runbook notes
```

## Implementation Checklist

- Validate shared secret or signature headers before processing payloads.
- Normalize symbol names and map fields to Supabase inserts.
- Provide retry-safe idempotency handling for rapid alerts.
- Log structured events so downstream monitoring can parse them.

Document build commands, environment variables, and deployment steps once the
project is scaffolded.
