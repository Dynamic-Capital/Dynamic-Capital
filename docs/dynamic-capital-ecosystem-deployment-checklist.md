# Dynamic Capital Ecosystem Deployment Checklist

Coordinate Supabase, Vercel, DigitalOcean, Telegram, and TON deliverables when
launching or refreshing the Dynamic Capital ecosystem. Each section mirrors a
platform owner. Complete every checkbox before marking the deployment ready.

> **Automation:** Run `npm run checklists -- --checklist ecosystem-deployment`
> to generate a progress report for this checklist.

## Supabase Setup

### Project Initialization

- [ ] Create the Supabase project with the regional settings agreed on by the
      infrastructure team.
- [ ] Enable the managed Postgres database and Supabase Auth providers required
      for the launch.
- [ ] Configure row level security (RLS) policies so token-gated resources only
      accept wallets with the required DCT balances.

### Tables

- [ ] Provision the `users` table with columns for wallet address, email, role,
      and DCT balance.
- [ ] Provision the `payments` table with columns for `tx_hash`, wallet, amount,
      and `verified` status.
- [ ] Provision the `mentorship_scores` table with columns for `user_id`,
      `score`, and `timestamp`.
- [ ] Provision the `signals` table with columns for asset, direction,
      confidence, and timestamp.

### Edge Functions

- [ ] Implement `verifyPayment.ts` to validate TON transactions and update
      `payments`.
- [ ] Implement `scoreMentorship.ts` to run the AGI Oracle and update
      `mentorship_scores`.
- [ ] Implement `broadcastSignal.ts` to push new signals to Telegram and
      Supabase Realtime channels.

### Auth

- [ ] Enable wallet-based login (TON Connect or the chosen custom provider).
- [ ] Enable email/password login for administrator roles.

## Vercel Frontend

### UI Deployment

- [ ] Connect the GitHub repository to Vercel and configure the production
      branch.
- [ ] Deploy the Next.js frontend.
- [ ] Add the required `.env` variables, including Supabase keys and TON Connect
      configuration.

### API Integration

- [ ] Call the Supabase Edge Functions responsible for scoring, payments, and
      signals.
- [ ] Subscribe to the `signals` and `mentorship_scores` channels through
      Supabase Realtime.
- [ ] Display dashboards, trading views, and mentorship tiers that reflect the
      live Supabase data.

### Domain Binding

- [ ] Bind the `.ton` domain via TON DNS to the Vercel deployment.
- [ ] (Optional) Add a `.com` or `.io` domain for universal access.
- [ ] Configure redirects or dual entry points when multiple domains are active.

## DigitalOcean Backend

### AI Inference

- [ ] Deploy the FastAPI or Node.js backend service.
- [ ] Host the AGI Oracle, trading models, and mentorship scoring logic.
- [ ] Expose `/predict`, `/oracle`, and `/burn` endpoints.

### Supabase Integration

- [ ] Ensure Supabase Edge Functions can call the DigitalOcean endpoints.
- [ ] Secure the communication with API keys or JWT-based authentication.
- [ ] Log inference and scoring results back into the Supabase database.

### Infrastructure

- [ ] Use DigitalOcean App Platform or managed Droplets for the deployment
      target.
- [ ] Enable HTTPS and configure firewall rules.
- [ ] Monitor the service with uptime alerts.

## Telegram Bot and Mini App

### Bot Logic

- [ ] Connect the Telegram bot to Supabase for user authentication and signal
      delivery.
- [ ] Trigger bot messages from the `broadcastSignal.ts` Edge Function.
- [ ] Verify payments against TON smart contract events.

### Mini App

- [ ] Embed the frontend UI or mentorship dashboard inside the Telegram Mini
      App.
- [ ] Sync Mini App state with Supabase for live updates.
- [ ] Enforce token-gated access using DCT balances.

## TON Smart Contract Integration

### Contract Deployment

- [ ] Deploy the DCT token contract with burn and buyback logic.
- [ ] Deploy the mentorship payment contract.
- [ ] Emit events that Supabase services can consume.

### Supabase Sync

- [ ] Configure an Edge Function listener for TON transaction events.
- [ ] Update the `payments` table and trigger mentorship scoring when new events
      arrive.
- [ ] (Optional) Trigger a DCT burn through the DigitalOcean backend when
      thresholds are met.

## Final Review

- [ ] Confirm all services are deployed and connected end-to-end.
- [ ] Verify domains resolve correctly across TON and conventional DNS entries.
- [ ] Exercise each Edge Function to ensure authentication and input validation.
- [ ] Confirm Realtime updates reach the frontend UI and Telegram bot.
- [ ] Validate that smart contract events sync into Supabase without drift.
