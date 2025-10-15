#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NPM_SAFE=(node "$ROOT_DIR/scripts/npm-safe.mjs")

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"

functions=(verify-initdata verify-telegram)
for fn in "${functions[@]}"; do
  echo "→ Deploying $fn"
  "${NPM_SAFE[@]}" exec --yes supabase -- functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF"
done

echo "✔ Deployments completed"
