#!/bin/bash
# Build script for miniapp deployment

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_SAFE=(node "$ROOT_DIR/scripts/npm-safe.mjs")
STAMP_FILE="node_modules/.npm-install.hash"
LOCKFILE="package-lock.json"

if ! node "$ROOT_DIR/scripts/sync-maldives-time.mjs" --strict; then
  echo "⚠️  Proceeding with miniapp build despite timezone synchronization issues."
fi

compute_lock_hash() {
  node - "$1" <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
const file = process.argv[2] ?? process.argv[1];
try {
  const data = fs.readFileSync(file);
  process.stdout.write(crypto.createHash('sha256').update(data).digest('hex'));
} catch {
  process.stdout.write('');
}
NODE
}

echo "Building miniapp..."
cd "$ROOT_DIR/supabase/functions/miniapp"
lock_hash="$(compute_lock_hash "$LOCKFILE")"
previous_hash=""
skip_install=0

if [[ -n "$lock_hash" && -d node_modules && -f "$STAMP_FILE" ]]; then
  previous_hash="$(cat "$STAMP_FILE" 2>/dev/null || true)"
  if [[ "$previous_hash" == "$lock_hash" ]]; then
    echo "Dependencies unchanged (hash $lock_hash); reusing existing install."
    skip_install=1
  else
    echo "Lockfile hash updated (was ${previous_hash:-unknown}, now $lock_hash); refreshing install."
  fi
elif [[ ! -d node_modules ]]; then
  echo "node_modules missing; installing dependencies from scratch."
fi

if [[ $skip_install -ne 1 ]]; then
  if [[ -z "$lock_hash" ]]; then
    echo "Computing package-lock hash failed; running npm ci for safety."
  fi
  "${NPM_SAFE[@]}" ci
  if [[ -n "$lock_hash" ]]; then
    printf "%s\n" "$lock_hash" > "$STAMP_FILE"
  else
    rm -f "$STAMP_FILE"
  fi
else
  if [[ -n "$lock_hash" ]]; then
    printf "%s\n" "$lock_hash" > "$STAMP_FILE"
  fi
fi

"${NPM_SAFE[@]}" run build
cd "$ROOT_DIR"

echo "Asserting bundle quality..."
node scripts/assert-miniapp-bundle.mjs

echo "✅ Miniapp build complete and ready for deployment"
