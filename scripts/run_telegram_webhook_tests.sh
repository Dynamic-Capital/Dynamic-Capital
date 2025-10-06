#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
read -r -a DENO_CMD <<<"$(bash "${REPO_ROOT}/scripts/deno_bin.sh")"

export DENO_NO_PACKAGE_JSON=${DENO_NO_PACKAGE_JSON:-1}
exec "${DENO_CMD[@]}" test --no-check --allow-env --allow-read \
  "${REPO_ROOT}/supabase/functions/_tests/telegram-webhook-health.test.ts" "$@"
