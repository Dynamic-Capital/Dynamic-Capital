#!/usr/bin/env bash
set -euo pipefail
# Echo a deno command that works in this environment.
if command -v deno >/dev/null 2>&1; then
  echo "deno"
  exit 0
fi
# Fallback using local npm-installed Deno package
echo "npx deno"
