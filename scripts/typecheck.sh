# >>> DC BLOCK: typecheck-core (start)
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ORIGINAL_PWD="$(pwd)"

cleanup() {
  local exit_code=$?
  if ! cd "${ORIGINAL_PWD}"; then
    if [ "$exit_code" -eq 0 ]; then
      exit_code=1
    fi
  fi
  return "$exit_code"
}
trap 'cleanup' EXIT

cd "${REPO_ROOT}"

DENO_BIN="$(bash "${SCRIPT_DIR}/deno_bin.sh")"
export DENO_TLS_CA_STORE="${DENO_TLS_CA_STORE:-system}"
export DENO_NO_UPDATE_CHECK=1

usage() {
  cat <<'EOF'
Usage: scripts/typecheck.sh [options]

Options:
  --allow-import       Force enabling remote import permissions when supported.
  --no-allow-import    Disable the remote import permission flag.
  -h, --help           Show this help message and exit.
EOF
}

CERT_ARG=""
if [ -n "${DENO_CERT_FILE:-}" ] && [ -f "$DENO_CERT_FILE" ]; then
  CERT_ARG="--cert $DENO_CERT_FILE"
fi

DENO_VERSION_OUTPUT="$($DENO_BIN --version 2>/dev/null || true)"
echo "$DENO_VERSION_OUTPUT"
DENO_VERSION="$(echo "$DENO_VERSION_OUTPUT" | awk 'NR==1 {print $2}')"
DENO_MAJOR="${DENO_VERSION%%.*}"
if ! [[ "$DENO_MAJOR" =~ ^[0-9]+$ ]]; then
  DENO_MAJOR=0
fi

ALLOW_IMPORT_DEFAULT=0
if [ "$DENO_MAJOR" -ge 2 ]; then
  ALLOW_IMPORT_DEFAULT=1
fi

ALLOW_IMPORT_RAW="${DENO_ALLOW_IMPORT:-$ALLOW_IMPORT_DEFAULT}"
case "$ALLOW_IMPORT_RAW" in
  1|true|TRUE|yes|YES|on|ON)
    ALLOW_IMPORT=1
    ;;
  0|false|FALSE|no|NO|off|OFF)
    ALLOW_IMPORT=0
    ;;
  *)
    echo "Warning: Unrecognised DENO_ALLOW_IMPORT value '$ALLOW_IMPORT_RAW'. Using default of $ALLOW_IMPORT_DEFAULT." >&2
    ALLOW_IMPORT=$ALLOW_IMPORT_DEFAULT
    ;;
esac

while [ $# -gt 0 ]; do
  case "$1" in
    --allow-import)
      ALLOW_IMPORT=1
      ;;
    --no-allow-import)
      ALLOW_IMPORT=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

ALLOW_IMPORT_ARG=""
if [ "$ALLOW_IMPORT" -eq 1 ]; then
  if [ "$DENO_MAJOR" -ge 2 ]; then
    ALLOW_IMPORT_ARG="--allow-import"
  else
    echo "Warning: --allow-import requested but Deno $DENO_VERSION does not support it. Skipping flag." >&2
  fi
fi

# Prefetch remotes (best-effort)
if compgen -G "supabase/functions/*/index.ts" > /dev/null; then
  $DENO_BIN cache $CERT_ARG $ALLOW_IMPORT_ARG --unstable-net --reload --no-lock supabase/functions/*/index.ts || true
fi

echo "== Type-check Edge Functions =="
if compgen -G "supabase/functions/*/index.ts" > /dev/null; then
  for f in supabase/functions/*/index.ts; do
    echo "$DENO_BIN check $CERT_ARG $ALLOW_IMPORT_ARG --unstable-net --remote --no-lock $f"
    $DENO_BIN check $CERT_ARG $ALLOW_IMPORT_ARG --unstable-net --remote --no-lock "$f"
  done
else
  echo "No Edge Function entrypoints found."
fi

echo "TypeScript check completed."
# <<< DC BLOCK: typecheck-core (end)
