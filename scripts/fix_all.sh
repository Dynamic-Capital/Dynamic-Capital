#!/usr/bin/env bash
set -euo pipefail

DENO_BIN="$(bash scripts/deno_bin.sh)"
export DENO_TLS_CA_STORE="${DENO_TLS_CA_STORE:-system}"
export DENO_NO_UPDATE_CHECK=1

TARGET_FILE="scripts/fix_and_check_targets.txt"

mapfile -t LINT_TARGETS < <(
  if [[ -f "${TARGET_FILE}" ]]; then
    grep -vE '^[[:space:]]*#' "${TARGET_FILE}" | sed -e 's/#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | awk 'NF'
  fi
)

FORMAT_TARGETS=()
if ((${#LINT_TARGETS[@]} > 0)); then
  FORMAT_TARGETS=("${LINT_TARGETS[@]}")
fi

# 1) Codemods (opt-in via FIX_RUN_CODEMODS=1)
if [[ "${FIX_RUN_CODEMODS:-0}" != "0" ]]; then
  node scripts/codemods/wrap_ts_comments.mjs || true
  node scripts/codemods/require_await_pad.mjs || true
else
  echo "Skipping codemods (set FIX_RUN_CODEMODS=1 to enable)."
fi

# 2) Auto-fix lint + format (using deno via wrapper)
if ((${#LINT_TARGETS[@]} > 0)); then
  for target in "${LINT_TARGETS[@]}"; do
    echo "== deno lint --fix ${target} =="
    $DENO_BIN lint --fix "${target}"
  done
else
  echo "No lint targets configured; skipping deno lint --fix."
fi

if ((${#FORMAT_TARGETS[@]} > 0)); then
  $DENO_BIN fmt "${FORMAT_TARGETS[@]}"
else
  echo "No format targets configured; skipping deno fmt."
fi

echo "\u2713 Applied targeted lint fixes and formatting."
