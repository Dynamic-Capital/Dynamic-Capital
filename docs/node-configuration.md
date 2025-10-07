# Node Configuration and Scheduling

## Node Categories

Use the following categories as the backbone of your swarm. Each entry lists
common inputs and expected outputs to make the orchestration contract explicit.

| Category                   | Example Nodes                                                                                        | Primary Inputs                                            | Outputs                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| **Data Ingestion**         | TradingView webhook (`/tradingview`), MT5/Exchange execution (`/mt5`), Sentiment feed (`/sentiment`) | Market data feeds, account credentials, webhook payloads  | Raw market events, normalized order books        |
| **Processing (DAI Lobes)** | Lorentzian Lobe, Trend/Momentum, Treasury Health                                                     | Ingestion outputs, on-chain telemetry, historical candles | Scored signals, portfolio metrics                |
| **Policy & Market**        | Dynamic Market Maker (DMM), Policy Engine (buyback/burn/tax)                                         | Processing signals, treasury state, governance directives | Orders, tax/burn transactions, policy audit logs |
| **Community & Interface**  | Supabase real-time, Telegram bot, Mini App frontend                                                  | Aggregated events, announcements, governance status       | Broadcast messages, UI updates, community alerts |

## Node Configuration Schema

Store node configuration in Supabase or environment variables so that nodes can
be toggled without redeploying. The canonical structure is:

```json
{
  "node_id": "lorentzian-1",
  "type": "processing",
  "enabled": true,
  "interval_sec": 30,
  "dependencies": ["market_data"],
  "outputs": ["signals"]
}
```

- `node_id`: Unique identifier for logging and observability.
- `type`: One of `ingestion`, `processing`, `policy`, or `community`.
- `enabled`: Allows the node to be switched on/off at runtime (set to `false`
  for a soft-disable without code changes).
- `interval_sec`: Default heartbeat interval when cron or webhooks do not
  trigger execution.
- `dependencies`: Upstream data requirements that must be satisfied before the
  node runs.
- `outputs`: Tables, topics, or functions that are updated when the node
  completes.

### Recommended Table Definition (Supabase)

Create a `node_configs` table (or adapt the existing one) with the following
fields so that runtime services can query the latest configuration:

```sql
create table if not exists node_configs (
  node_id text primary key,
  type text not null check (type in ('ingestion', 'processing', 'policy', 'community')),
  enabled boolean not null default true,
  interval_sec integer not null check (interval_sec > 0),
  dependencies jsonb not null default '[]'::jsonb,
  outputs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

The optional `metadata` field is a catch-all for node-specific parameters
(thresholds, exchange symbols, webhook secrets) without having to change the
schema each time.

### Human Analysis Node

The `human-analysis` processing node is provisioned in the migration alongside
the schema. It is enabled by default, depends on no upstream nodes, emits to the
`fusion` channel, and carries a weight of `0.25`. The node's metadata specifies
`{"source": "analyst_insights"}` so Fusion Brain can look up the discretionary
ideas persisted by the analyst collector.

### Dynamic Hedge Policy Node

The `dynamic-hedge` policy node is registered with a five-minute interval and
depends on `trades`, `correlations`, and `risk_settings` inputs. Its outputs are
the new `hedge_actions` ledger and follow-up `signals` rows so the MT5 bridge
can execute offsetting orders when volatility spikes, drawdown thresholds are
breached, or scheduled macro events approach. Metadata captures a `confidence`
score of `0.9` to help schedulers prioritise hedge execution.

### Step-by-Step Node Configuration Workflow

1. **Model the node contract**
   - Identify the upstream `dependencies` and downstream `outputs`.
   - Define any custom parameters the node requires; store them under `metadata`
     (e.g., `{ "symbol": "BTCUSDT", "threshold": 0.8 }`).
2. **Register the node**
   - Insert or upsert the configuration into Supabase:

     ```sql
     insert into node_configs (node_id, type, interval_sec, dependencies, outputs, metadata)
     values (
       'lorentzian-1',
       'processing',
       30,
       '["market_data"]',
       '["signals"]',
       '{"symbol": "BTCUSDT"}'
     )
     on conflict (node_id) do update
     set enabled = excluded.enabled,
         interval_sec = excluded.interval_sec,
         dependencies = excluded.dependencies,
         outputs = excluded.outputs,
         metadata = excluded.metadata;
     ```
   - If you prefer environment files locally, mirror the JSON in `.env.local`:

     ```bash
     NODE_CONFIG__LORENTZIAN_1='{ "type": "processing", "interval_sec": 30, "dependencies": ["market_data"], "outputs": ["signals"] }'
     ```

     The repository seeds `.env.example` with canonical keys such as
     `NODE_CONFIG__HUMAN_ANALYSIS` and `NODE_CONFIG__TON_NETWORK_HEALTH` so
     local environments mirror the Supabase defaults.
3. **Bootstrap the runtime**
   - When a worker starts, it should:
     1. Load its `node_id` configuration from Supabase or `.env`.
     2. Check `enabled`; skip execution (but continue heartbeat) if disabled.
     3. Validate dependencies exist (e.g., required tables populated) before
        executing business logic.
4. **Emit health signals**
   - Log heartbeat results and push metrics to Supabase (e.g., `node_status`
     table) so dashboards can flag stalled nodes.
   - Include last run timestamp, error context, and the count of rows produced
     for quick debugging.

## Scheduling and Cron Options

DigitalOcean static sites cannot run native cron jobs. Use one of the following
managed schedulers:

1. **Supabase Scheduled Functions** (preferred when logic already lives
   alongside the database).
2. **GitHub Actions Cron** for repository-driven automations.
3. **DigitalOcean App Platform Cron** if the app tier supports it.

## Core Cron Jobs

| ID                  | Schedule      | Function           | Purpose                                                                                   | Dependent Nodes                             |
| ------------------- | ------------- | ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| `treasury_snapshot` | `0 * * * *`   | `treasury-update`  | Capture balances and refresh the treasury table every hour.                               | Treasury Health, Policy Engine              |
| `policy_check`      | `*/5 * * * *` | `policy-eval`      | Run the policy engine to evaluate burn/buyback/tax opportunities every five minutes.      | Policy Engine, DMM                          |
| `signal_cleanup`    | `0 2 * * *`   | `cleanup-signals`  | Archive signals older than 30 days daily at 2 AM.                                         | Processing nodes reading `signals`          |
| `governance_sweep`  | `0 3 * * *`   | `governance-close` | Close proposals past `closed_at` daily at 3 AM.                                           | Community interfaces, governance dashboards |
| `report_weekly`     | `0 0 * * 0`   | `report-generate`  | Generate weekly reports (trades, policies, treasury) and store them in a Supabase bucket. | Community interfaces                        |

### Step-by-Step Cron Setup (Supabase)

1. **Create the function**: implement the logic under
   `supabase/functions/<function-name>`.
2. **Deploy**: run `supabase functions deploy <function-name>`.
3. **Schedule**: configure the cron via the Supabase dashboard or CLI:

   ```bash
   supabase functions schedule create treasury_snapshot --cron "0 * * * *" --invoke treasury-update
   ```
4. **Observe**: monitor execution history in Supabase or forward logs to your
   telemetry stack. Pair each cron with alerts (e.g., Slack/Telegram) when
   consecutive failures exceed a threshold.

### Fallback Cron Providers

- **GitHub Actions**: use a workflow with `on: schedule` plus secrets for
  Supabase auth.
- **DigitalOcean App Platform**: configure App Platform cron triggers if your
  deployment tier allows background tasks.
- **Self-hosted Runner**: for on-prem deployments, mirror the schedule via
  `systemd` timers or Kubernetes CronJobs.

### Supabase JSON Example

```json
[
  {
    "id": "treasury_snapshot",
    "schedule": "0 * * * *",
    "function": "treasury-update"
  },
  {
    "id": "policy_check",
    "schedule": "*/5 * * * *",
    "function": "policy-eval"
  },
  {
    "id": "signal_cleanup",
    "schedule": "0 2 * * *",
    "function": "cleanup-signals"
  },
  {
    "id": "governance_sweep",
    "schedule": "0 3 * * *",
    "function": "governance-close"
  },
  {
    "id": "report_weekly",
    "schedule": "0 0 * * 0",
    "function": "report-generate"
  }
]
```

## Operational Model

- Nodes operate independently, similar to torrent peers, processing their
  assigned responsibilities.
- Managed crons act as swarm schedulers, ensuring data ingestion, treasury
  checks, and policy enforcement remain current.
- Centralized configuration in Supabase or `.env` files keeps the system
  modular, resilient, and easy to update.
  - Modules can be toggled on/off via `enabled` without redeploying.
  - Independent nodes limit blast radius when one node fails.
  - Automated schedules maintain 24/7 coverage.
- Review this document whenever nodes are added or retired so Supabase configs
  and cron schedules remain the single source of truth.

Keep this document aligned with the actual scheduler configuration and update it
when nodes or schedules change.
