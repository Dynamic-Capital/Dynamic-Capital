#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NPM_SAFE=(node "$ROOT_DIR/scripts/npm-safe.mjs")

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"

if [[ ! ${SUPABASE_ACCESS_TOKEN} =~ ^sbp_[A-Za-z0-9]{32,}$ ]]; then
  cat <<'EOF' >&2
SUPABASE_ACCESS_TOKEN must be a Supabase personal access token (sbp_...).
Generate a new token from the Supabase dashboard with edge function deploy and log read scopes.
EOF
  exit 1
fi

if [[ ! ${SUPABASE_PROJECT_REF} =~ ^[a-z0-9]{20}$ ]]; then
  cat <<'EOF' >&2
SUPABASE_PROJECT_REF should be the 20-character lowercase identifier found in your Supabase project settings (e.g. abcdefghijklmnopqrst).
EOF
  exit 1
fi

functions=(verify-initdata verify-telegram)
for fn in "${functions[@]}"; do
  echo "→ Deploying $fn"
  "${NPM_SAFE[@]}" exec --yes supabase -- functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF"
done

echo "✔ Deployments completed"
