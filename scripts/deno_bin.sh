#!/usr/bin/env bash
set -euo pipefail
# Echo a deno command that works in this environment.
if command -v deno >/dev/null 2>&1; then
  echo "deno"
  exit 0
fi

# Fallback via npm distribution of Deno using the same major version
# as the "deno" dependency in package.json.
DENO_VERSION=$(jq -r '.devDependencies.deno' package.json)
DENO_MAJOR=$(echo "$DENO_VERSION" | sed -E 's/^[^0-9]*([0-9]+).*/\1/')
echo "npx -y @deno/cli@${DENO_MAJOR} deno"
