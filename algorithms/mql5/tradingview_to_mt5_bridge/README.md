# TradingView → MetaTrader 5 Bridge

This directory vendors the runtime that watches Supabase for TradingView alerts,
queues them in Redis, and executes the resulting trades in MT5. It replaces the
upstream mitmproxy alert flow with a Supabase-native listener so the Dynamic
Capital EA can operate against managed services.

## 1. Getting started

1. Install Python 3.11 on the VPS alongside MetaTrader 5.
2. Clone this repository and create a virtual environment:

   ```powershell
   cd C:\path\to\Dynamic-Capital\algorithms\mql5\tradingview_to_mt5_bridge
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and populate the Supabase, Redis, and MT5
   settings. When running on Windows, leave `SUPABASE_SERVICE_KEY` empty and set
   `SUPABASE_CREDENTIAL_TARGET` to the name of the Windows Credential Manager
   secret that contains the service role key. The worker will fall back to that
   credential if the environment variable is not set.

4. Provision Redis. The supplied `docker-compose.yml` from the upstream project
   can still be used locally if you do not have a managed Redis instance.

## 2. Runtime commands

| Command                           | Description                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `python run.py supabase-listener` | Poll Supabase for `status = pending` signals, claim them, and enqueue them in Redis.                                                                         |
| `python run.py worker`            | Consume queued signals, apply EA risk controls, execute the trade in MT5 (simulated when `MT5_DEMO_MODE=true`), and post the ticket status back to Supabase. |
| `python run.py demo-dry-run`      | Enqueue a synthetic signal and process it through the worker in demo mode. Use this before connecting to live services to validate configuration.            |

Both long-running services log health metrics into Redis (`mt5_bridge:health` by
default), recording heartbeats, queue depth, and processing counts. Monitor
these keys with `redis-cli HGETALL mt5_bridge:health` to verify liveness.

## 3. Supabase integration

- The listener polls `SUPABASE_SIGNALS_TABLE` for
  `status = SUPABASE_PENDING_STATUS`.
- Claiming a row updates it to `SUPABASE_QUEUED_STATUS` and stamps
  `bridge_claimed_at`, `bridge_node_id`, and `bridge_expires_at` for optimistic
  locking.
- The worker marks the row `SUPABASE_IN_PROGRESS_STATUS` before trading and uses
  `SUPABASE_FILLED_STATUS` or `SUPABASE_ERROR_STATUS` after execution. Fills
  record the MT5 ticket, executed price, and volume. Failures log the error
  message.
- API calls use the Supabase service role key; secure it in Windows Credential
  Manager or environment variables that never leave the VPS.

## 4. Risk controls

`src/services/risk.py` mirrors the EA's risk-per-trade logic. Signals inherit
the configured balance, risk fraction, and default pip values from the
environment. Missing stop-loss or take-profit instructions are derived from
offsets around the entry price so even minimal signals remain bounded.

## 5. Health, logging, and retries

- Redis metrics capture listener/worker heartbeats, queue depth, and processing
  timestamps. Set `BRIDGE_HEALTH_TTL_SECONDS` to control expiry.
- Supabase and MT5 interactions use exponential backoff on failure to prevent
  tight retry loops.
- Application logs stream to STDOUT; redirect them to a central sink on the VPS
  per the operations checklist.

## 6. Credential management on Windows

1. Open **Credential Manager → Windows Credentials**.
2. Add a **Generic Credential** named `DynamicCapital-Supabase-ServiceKey` (or
   the value you set in `SUPABASE_CREDENTIAL_TARGET`). Paste the Supabase
   service role key into the password field.
3. Optional: repeat for the MT5 password with `MT5_PASSWORD_CREDENTIAL_TARGET`.
4. Ensure the bridge services run under the same Windows user that owns the
   credential so lookups succeed.

## 7. Demo-account dry runs

1. Set `MT5_DEMO_MODE=true` and run `python run.py demo-dry-run` to confirm risk
   calculations and simulated execution succeed without hitting Supabase.
2. Point the listener at a Supabase table in your staging project and insert a
   row manually:

   ```sql
   insert into signals (id, symbol, side, status, entry, stop_loss_pips, risk_fraction)
   values ('demo-001', 'EURUSD', 'buy', 'pending', 1.10234, 25, 0.01);
   ```

3. Start the listener and worker in separate terminals. Verify that the row
   transitions through `queued → in_progress → filled` (or `error` if the trade
   fails) and that Redis metrics update accordingly.
4. Once satisfied, disable demo mode, point the configuration at the demo MT5
   account credentials, and repeat the dry run to ensure end-to-end connectivity
   before promoting to production credentials.

## 8. Follow-up tasks

- Wire Redis logs to the central observability stack.
- Automate Windows Task Scheduler jobs to start the listener and worker on boot.
- Retire the legacy mitmproxy assets after migration is complete.
