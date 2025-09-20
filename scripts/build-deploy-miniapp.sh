#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_SAFE=(node "$ROOT_DIR/scripts/npm-safe.mjs")

# Build the mini app and sync static files
bash "$ROOT_DIR/scripts/build-miniapp.sh"

# Deploy miniapp and deposit function to Supabase
if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo "SUPABASE_PROJECT_REF not set" >&2
  exit 1
fi

echo "Deploying miniapp and deposit function..."
"${NPM_SAFE[@]}" exec --yes supabase functions deploy miniapp miniapp-deposit --project-ref "$SUPABASE_PROJECT_REF"

echo "Deployment complete"
