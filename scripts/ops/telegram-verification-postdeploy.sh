#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v deno >/dev/null 2>&1; then
  echo "deno is required to tail Supabase logs" >&2
  exit 1
fi

echo "→ Redeploying Telegram verification edge functions"
bash "$SCRIPT_DIR/deploy-telegram-verification.sh"

echo "→ Fetching recent Telegram verification logs"
deno run --allow-env --allow-net "$SCRIPT_DIR/tail-telegram-logs.ts" "$@"

echo "✔ Redeploy and log fetch complete"
