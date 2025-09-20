#!/usr/bin/env bash
# Build and deploy the mini app along with the Telegram bot edge function.
# Mirrors the recommended workflow documented in docs/MINI_APP_ON_SUPABASE.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"

if [[ -z "${PROJECT_REF}" ]]; then
  PROJECT_REF="$(sed -n 's/^project_id = "\(.*\)"/\1/p' "$ROOT_DIR/supabase/config.toml" | head -n 1)"
fi

if [[ -z "${PROJECT_REF}" ]]; then
  echo "Unable to determine Supabase project ref. Set SUPABASE_PROJECT_REF or update supabase/config.toml." >&2
  exit 1
fi

MINI_APP_URL_DEFAULT="https://${PROJECT_REF}.functions.supabase.co/miniapp/"
MINI_APP_URL="${MINI_APP_URL:-$MINI_APP_URL_DEFAULT}"

cd "$ROOT_DIR"

echo "[1/6] Building mini app bundle..."
deno task miniapp:deploy

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "[2/6] Logging in to Supabase CLI via access token..."
  npx supabase login --token "$SUPABASE_ACCESS_TOKEN"
else
  echo "[2/6] Logging in to Supabase CLI (interactive)..."
  npx supabase login
fi

echo "[3/6] Linking local project to Supabase ref $PROJECT_REF..."
npx supabase link --project-ref "$PROJECT_REF"

echo "[4/6] Updating MINI_APP_URL secret to $MINI_APP_URL"
npx supabase secrets set MINI_APP_URL="$MINI_APP_URL"

echo "[5/6] Deploying telegram-bot edge function..."
npx supabase functions deploy telegram-bot

echo "[6/6] Running mini app post-deploy checks..."
deno task miniapp:check

echo "Supabase mini app workflow complete."
