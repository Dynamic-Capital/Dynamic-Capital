# Dynamic Capital Flow Chart

This document summarizes the production deployment flow for Dynamic Capital
across GitHub, Vercel, Supabase, DigitalOcean, and the TON blockchain.

## Architecture Overview

```text
        ┌───────────────┐
        │   GitHub Repo │
        └───────┬───────┘
                │ CI/CD
                ▼
┌───────────────────────────────────┐
│            Vercel (UI)            │
│  - Next.js / React frontend       │
│  - Calls Supabase APIs            │
│  - Served via .ton + .com domain  │
└───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│        Supabase (Core Hub)        │
│  - Postgres DB (users, signals)   │
│  - Auth (wallet/email login)      │
│  - Edge Functions (scoring, DCT)  │
│  - Realtime (live mentorship feed)│
└───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│   DigitalOcean (Heavy Backend)    │
│  - AI inference (GPU workloads)   │
│  - Trading models, pipelines      │
│  - Exposed via API → Supabase     │
└───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│        TON Blockchain Layer       │
│  - .ton domain DNS → Vercel       │
│  - Smart contracts (DCT burn, pay)│
│  - Events consumed by Supabase    │
└───────────────────────────────────┘
```

## Component Responsibilities

### GitHub Repository

- Source of truth for application code, infrastructure as code, and
  documentation.
- Drives automated CI/CD workflows that deploy updated frontends to Vercel and
  backend services to Supabase/DigitalOcean.

### Vercel (UI Layer)

- Hosts the Next.js/React web experience served from both `.ton` and `.com`
  domains.
- Performs client interactions, calling Supabase APIs for data access and
  authentication.
- Acts as the public entry point for the Telegram Mini App and investor
  dashboards.

### Supabase (Core Hub)

- Manages the Postgres database for users, trading signals, and mentorship
  content.
- Provides authentication via wallet and email flows.
- Runs edge functions that power scoring engines and Dynamic Capital Token (DCT)
  logic.
- Streams realtime mentorship and trading updates to the UI layer.

### DigitalOcean (Heavy Backend)

- Executes GPU-intensive inference, training pipelines, and quantitative trading
  models.
- Exposes REST and websocket APIs that Supabase edge functions invoke for
  advanced analytics.
- Scales independently from the UI to handle burst compute demand.

### TON Blockchain Layer

- Resolves `.ton` DNS entries to the Vercel-hosted frontend.
- Maintains smart contracts responsible for DCT mint/burn events and treasury
  payments.
- Emits on-chain events that Supabase ingests to keep the internal ledger
  synchronized.

## End-to-End Flow

1. Developers push changes to GitHub, triggering CI/CD pipelines.
2. Successful builds deploy the frontend to Vercel and update backend services
   via Supabase migrations or DigitalOcean rollouts.
3. End users access the app via `.ton` or `.com` domains, hitting the
   Vercel-hosted UI.
4. The UI calls Supabase for authentication, data retrieval, and edge function
   execution.
5. Supabase orchestrates heavy computations by calling DigitalOcean APIs and
   receives blockchain events from TON.
6. TON smart contracts finalize token operations while Supabase reconciles
   events and updates the UI in realtime.

This flow ensures a cohesive pipeline from code commits through on-chain
settlement, balancing developer velocity with operational resilience.
