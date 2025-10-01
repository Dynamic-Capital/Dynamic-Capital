# TradingView→MT5 Bridge Integration Checklist

Use this list when adapting the
[`abhidp/tradingview-to-metatrader5`](https://github.com/abhidp/tradingview-to-metatrader5)
copier for Dynamic Capital’s TradingView → Supabase → MT5 pipeline. It pulls
concrete tasks out of the upstream repo so the bridge can be vendored,
Supabase-enabled, and productionized on the Windows host that runs MT5.

> [!TIP] **Quick navigation**
>
> - [TradingView → MT5 Onboarding Checklist](./TRADINGVIEW_MT5_ONBOARDING_CHECKLIST.md)
> - [Supabase trading signals migration](../supabase/migrations/20250920000000_trading_signals_pipeline.sql)
> - [Automated Trading Checklist](./automated-trading-checklist.md)

## 1. Vendor the upstream project into the algorithms workspace

- [ ] Copy the repo into `algorithms/mql5/tradingview_to_mt5_bridge/` so
      `run.py`, `docker-compose.yml`, `start.bat`, and the `src/` tree keep
      their relative paths.
- [ ] Add `algorithms/mql5/tradingview_to_mt5_bridge/THIRD_PARTY.md` that
      records the upstream commit hash, license (MIT), and any local
      modifications.
- [ ] Promote `.env.template` to `.env.example`, replacing TradingView-only
      secrets with Supabase + MT5 keys (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
      `MT5_SERVER`, etc.).
- [ ] Mirror Python 3.11 requirements by pinning dependencies in
      `algorithms/mql5/tradingview_to_mt5_bridge/requirements.txt` and
      documenting the `python -m venv .venv` bootstrap in the local README.
- [ ] Evaluate whether `docker-compose.yml` should stay (for Redis) or be
      replaced with Supabase-native services; flag follow-up tasks in the
      vendored README.

## 2. Point the bridge at Dynamic Capital data sources

- [ ] Wire `src/config/database.py` to accept a Supabase/Postgres connection
      string and CA bundle instead of the local `init.sql` bootstrap.
- [ ] Remove or retire the upstream `src/scripts/init_db.py` workflow so
      migrations originate from the Dynamic Capital Supabase schema repo.
- [ ] Map Supabase `signals` columns to the copier’s models
      (`dynamic/models/dynamic_database`) and trim unused tables/fields that Supabase will
      not expose.
- [ ] Use the new `trading_accounts`, `signals`, `signal_dispatches`, and
      `trades` tables from `20250920000000_trading_signals_pipeline.sql` as the
      source of truth (alert IDs remain unique).
- [ ] Configure Redis credentials/hostnames via `.env.example` so the Windows
      host can talk to Dynamic Capital’s managed queue (or confirm the local
      Docker Redis remains the source of truth).

## 3. Replace the mitmproxy ingestion path with a Supabase listener

- [ ] Add `src/workers/supabase_listener.py` that polls or subscribes to
      Supabase Realtime for `signals` rows in an actionable status.
- [ ] Register a CLI entry point (e.g., `python run.py supabase-listener`)
      mirroring how `run.py proxy` and `run.py worker` are exposed upstream.
- [ ] Reuse `utils/queue_handler.RedisQueue.push_trade` to enqueue Supabase
      payloads so `workers/mt5_worker.py` and `services/mt5_service.py` stay
      untouched.
- [ ] Implement optimistic locking or status transitions
      (`pending → in_progress`) when publishing a Supabase signal to Redis to
      avoid double execution.
- [ ] Invoke the RPC helpers (`claim_trading_signal`,
      `mark_trading_signal_status`, `record_trade_update`) rather than raw table
      writes to keep dispatch counters and timestamps consistent.
- [ ] Capture Supabase credentials via Windows Credential Manager or encrypted
      `.env` values and load them in the new listener.

## 4. Propagate execution results back into Supabase

- [ ] Extend `services/mt5_service.MT5Service` (or wrap `workers/mt5_worker`) to
      call Supabase REST/RPC endpoints once an order fills, partially fills, or
      errors.
- [ ] Persist MT5 ticket IDs, fill prices, and error messages onto the
      originating Supabase record so downstream dashboards stay accurate.
- [ ] Subscribe to the `SUPABASE_SIGNALS_CHANNEL` (default
      `realtime:public:signals`) so the bridge can react to new rows without
      busy polling.
- [ ] Ensure Supabase updates occur atomically (`status`, `filled_at`,
      `mt5_ticket_id`) and implement retry/backoff helpers in case the REST call
      fails.
- [ ] Publish health metrics (last fill timestamp, outstanding in-flight trades)
      into Supabase or another telemetry sink so ops can monitor the copier.

## 5. Harden the Windows runtime and services

- [ ] Restrict Redis/Postgres listeners to `127.0.0.1` or a private interface;
      enforce Windows Firewall rules that mirror `docs/PHASE_6_OPS.md` controls.
- [ ] Create Windows Task Scheduler or NSSM services that start
      `python run.py supabase-listener` and `python run.py worker` automatically
      on boot.
- [ ] Reuse upstream logging (`logs/` folder) but ship copies to Dynamic
      Capital’s centralized log store (e.g., Supabase storage or Loki).
- [ ] Confirm mitmproxy binaries and certificates are no longer required;
      uninstall or archive them so only the Supabase pathway stays active.

## 6. Document runbooks and onboarding steps

- [ ] Update or create `algorithms/mql5/tradingview_to_mt5_bridge/README.md`
      with Dynamic Capital-specific bootstrapping (venv activation, `.env` keys,
      CLI commands, Supabase dependency).
- [ ] Capture a fresh Windows VPS bring-up sequence: install Python 3.11, Git,
      MT5 terminal, Redis (if kept), and configure timezone/NTP per trading ops
      standards.
- [ ] Document troubleshooting recipes for Supabase authentication failures,
      Redis connectivity, MT5 login/auth issues, and Windows service restarts.
- [x] Cross-link this checklist, the onboarding checklist, and any Supabase
      schema docs so contributors can navigate between repo pieces quickly.
      _Quick navigation callout above now links the three core resources so
      operators can pivot between docs without hunting through the tree._

## 7. Validate the end-to-end signal flow

- [ ] Dry-run the full TradingView alert → Vercel webhook → Supabase → Supabase
      listener → Redis queue → MT5 worker path against a demo account and
      confirm Supabase status updates.
- [ ] Inject failure scenarios (network drop, Supabase outage, MT5 rejection)
      and verify retries, alerts, and Supabase status transitions behave as
      expected.
- [ ] Benchmark latency between signal ingestion and MT5 fill; record acceptable
      thresholds in the runbook.
- [ ] Obtain sign-off from engineering, trading, ops, and compliance once
      documentation and controls meet Dynamic Capital standards.
