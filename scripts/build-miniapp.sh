#!/bin/bash
# Build script for miniapp deployment

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_SAFE=(node "$ROOT_DIR/scripts/npm-safe.mjs")

echo "Building miniapp..."
cd "$ROOT_DIR/supabase/functions/miniapp"
"${NPM_SAFE[@]}" ci
"${NPM_SAFE[@]}" run build
cd "$ROOT_DIR"

echo "Asserting bundle quality..."
node scripts/assert-miniapp-bundle.mjs

echo "✅ Miniapp build complete and ready for deployment"
