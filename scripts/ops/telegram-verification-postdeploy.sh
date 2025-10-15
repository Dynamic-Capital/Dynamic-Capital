#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

read -r -a DENO_CMD < <(bash "${ROOT_DIR}/scripts/deno_bin.sh")

if [ "${#DENO_CMD[@]}" -eq 0 ]; then
  echo "Failed to resolve deno runtime" >&2
  exit 1
fi

echo "→ Redeploying Telegram verification edge functions"
bash "$SCRIPT_DIR/deploy-telegram-verification.sh"

echo "→ Fetching recent Telegram verification logs"
"${DENO_CMD[@]}" run --allow-env --allow-net "$SCRIPT_DIR/tail-telegram-logs.ts" "$@"

echo "✔ Redeploy and log fetch complete"
