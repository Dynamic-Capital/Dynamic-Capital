# Dynamic Capital Trading Stack Architecture Scan

## Purpose
This scan inventories the building blocks already present in the repository and consolidates them into a cohesive, battle-tested architecture for connecting TradingView strategies to MetaTrader 5 execution with rich observability through the Next.js control plane.

## Verified building blocks
- **TradingView alert intake** – The Vercel serverless handler at `algorithms/vercel-webhook/api/tradingview-alerts.ts` guards the shared secret, validates payloads, and persists normalized alerts into Supabase so downstream services can react consistently.
- **Webhook-to-execution orchestrator** – The Flask app in `integrations/tradingview.py` fans TradingView alerts into AI signal generation, trading execution, treasury updates, Supabase logging, and Telegram notifications, giving a canonical control surface for automated decisions.
- **MT5 execution adapter** – `integrations/mt5_connector.py` wraps the official `MetaTrader5` package with typed buy/sell/hedging helpers so higher-level services can submit deterministic orders without duplicating request payload assembly.
- **Job delivery and retries** – The TypeScript FIFO queue under `queue/index.ts` supports Redis-backed scheduling, exponential backoff, and durable job metadata, enabling resilient relay of Supabase change events or webhook payloads to execution workers.
- **Next.js operations console** – `apps/web` houses the App Router dashboard that already exposes shared UI primitives, Telegram Mini App views, and Supabase-driven data hooks for presenting trade telemetry and configuration controls.

## Recommended end-to-end architecture
1. **TradingView strategy emits alerts** with JSON payloads that include action, symbol, sizing, and shared secret.
2. **Edge ingestion on Vercel** (`algorithms/vercel-webhook`) verifies the secret, normalizes the payload, and upserts it into the Supabase `tradingview_alerts` table for traceability.
3. **Supabase database trigger or polling worker** enqueues a job onto the shared `queue/` module so retries and sequencing remain consistent even if downstream services are briefly unavailable.
4. **Execution orchestrator** (Flask service in `integrations/tradingview.py`) dequeues the job, enriches it with AI insights, and issues MT5 trade requests through the reusable connector. Any hedging logic is routed through the same adapter to keep execution semantics uniform.
5. **State synchronization** writes trade outcomes, treasury events, and telemetry back to Supabase from the orchestrator, powering the Next.js dashboard and Telegram notifications without custom plumbing per channel.
6. **Next.js dashboard** (`apps/web`) consumes Supabase data (via server components or client hooks) to render live trade status, error alerts, and configuration toggles. Operators can drill into specific alerts and replays while the queue ensures idempotent processing.

## Implementation priorities
1. Harden the Vercel webhook deployment (observability, retries, secret rotation) before attaching live TradingView strategies.
2. Stand up Redis for the shared queue to guarantee delivery semantics when scaling beyond a single worker instance.
3. Containerize the `integrations/tradingview.py` service alongside the MT5 bridge so orchestration, AI enrichment, and trade execution run in a controlled environment with access to MT5 terminals.
4. Wire Supabase row-level security and service roles so the dashboard surfaces only operator-grade data while execution services maintain privileged access.
5. Document the alert schema and operational playbooks inside the dashboard to keep TradingView, Supabase, and MT5 teams aligned as the system evolves.
