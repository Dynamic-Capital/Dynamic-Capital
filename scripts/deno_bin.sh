#!/usr/bin/env bash
set -euo pipefail
# Echo a deno command that works in this environment with TLS configured to
# trust the host OS certificate store. The CI environment lacks the Mozilla
# root bundle that Deno ships with, so forcing the system store avoids
# UnknownIssuer TLS errors when reaching npm.
cmd="deno"
if ! command -v deno >/dev/null 2>&1; then
  # Fallback using local npm-installed Deno package
  cmd="npx deno"
fi

echo "env DENO_TLS_CA_STORE=system ${cmd}"
