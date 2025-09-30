#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <deno-subcommand> [args...]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cmd="$(bash "${SCRIPT_DIR}/deno_bin.sh")"

# shellcheck disable=SC2086
exec $cmd "$@"
