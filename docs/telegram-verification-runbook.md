# Telegram Verification Redeploy & Monitoring Runbook

## Overview

The Telegram verification stack relies on the `verify-initdata` helper and the
`verify-telegram` edge function. After the signature-handling refactor,
production must be refreshed and monitored to confirm the drop in 401 responses
from Telegram mini-app sessions.

## Prerequisites

- Supabase CLI authentication via `SUPABASE_ACCESS_TOKEN` with permissions to
  deploy edge functions and read project logs.
- The target project reference exported as `SUPABASE_PROJECT_REF`.
- Access to the repository scripts (run from the repo root).
- Optional: a terminal with `deno` available for log inspection.

## Quick Rollout Workflow

To redeploy the verification functions and immediately review the latest
Supabase logs in a single command, run the consolidated helper:

```bash
export SUPABASE_ACCESS_TOKEN=...  # Personal access token with deploy scope
export SUPABASE_PROJECT_REF=...   # e.g. abcdefghijklmnopqrst
./scripts/ops/telegram-verification-postdeploy.sh --since 120 --limit 200
```

All arguments are forwarded to the log tailing helper, allowing you to control
the window or output format without repeating environment setup.

## Redeploy the Edge Functions Individually

Use the dedicated helper to redeploy both functions in a repeatable step:

```bash
export SUPABASE_ACCESS_TOKEN=...  # Personal access token with deploy scope
export SUPABASE_PROJECT_REF=...   # e.g. abcdefghijklmnopqrst
scripts/ops/deploy-telegram-verification.sh
```

The script wraps `supabase functions deploy` via `npm-safe` so the Supabase CLI
respects the repo's sanitized environment defaults. The command exits on the
first failure to prevent partial deployments.

## Monitor Recent Logs

After redeploying, watch the Supabase management API for residual 401 responses.
The log helper defaults to both verification functions and scans the last hour
of activity:

```bash
export SUPABASE_ACCESS_TOKEN=...  # same token as above
export SUPABASE_PROJECT_REF=...
$(bash scripts/deno_bin.sh) run --allow-env --allow-net scripts/ops/tail-telegram-logs.ts
```

Key options:

- `--since <minutes>` to widen or narrow the window (default `60`).
- `--limit <count>` to control the API page size (default `100`).
- `--json` to emit the raw normalized entries for downstream tooling.
- Append function names to narrow the focus, e.g.
  `$(bash scripts/deno_bin.sh) run --allow-env --allow-net scripts/ops/tail-telegram-logs.ts verify-telegram`.

The helper automatically installs and pins the local `deno` runtime when it's
missing, so you don't need a global installation. The log script highlights how
many entries returned status 401 (either via explicit status fields or message
text) and prints a status-code breakdown so you can spot any new error classes.
Use `--json` when piping into analytics pipelines or dashboards.

## Follow-up Actions

- Confirm that the unauthorized count trends toward zero during normal traffic
  volumes. Investigate any residual 401 bursts using the raw payloads from the
  log output.
- Once stabilized, consider wiring the script into CI/CD or observability alerts
  so regressions surface immediately.
- Keep the Supabase CLI up to date (`npm exec --yes supabase -- --version`) to
  benefit from newer log filtering parameters as they become available.
