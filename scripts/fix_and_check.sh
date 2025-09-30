#!/usr/bin/env bash
set -euo pipefail

DENO_BIN="$(bash scripts/deno_bin.sh)"
export DENO_TLS_CA_STORE="${DENO_TLS_CA_STORE:-system}"
export DENO_NO_UPDATE_CHECK=1

TARGET_FILE="scripts/fix_and_check_targets.txt"
TYPECHECK_ENABLED="${FIX_RUN_TYPECHECK:-0}"

mapfile -t LINT_TARGETS < <(
  if [[ -f "${TARGET_FILE}" ]]; then
    grep -vE '^[[:space:]]*#' "${TARGET_FILE}" | sed -e 's/#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | awk 'NF'
  fi
)

FORMAT_TARGETS=()
if ((${#LINT_TARGETS[@]} > 0)); then
  FORMAT_TARGETS=("${LINT_TARGETS[@]}")
fi

run_lint_checks() {
  if ((${#LINT_TARGETS[@]} == 0)); then
    echo "No lint targets configured; skipping deno lint."
    return 0
  fi

  local status=0
  for target in "${LINT_TARGETS[@]}"; do
    echo "== deno lint ${target} =="
    if ! $DENO_BIN lint "${target}"; then
      status=$?
      break
    fi
  done
  return ${status}
}

run_fmt_check() {
  if ((${#FORMAT_TARGETS[@]} == 0)); then
    echo "No format targets configured; skipping deno fmt check."
    return 0
  fi

  $DENO_BIN fmt --check "${FORMAT_TARGETS[@]}"
}

run_type_check() {
  if [[ "${TYPECHECK_ENABLED}" == "0" ]]; then
    echo "Skipping type check (set FIX_RUN_TYPECHECK=1 to enable)."
    return 0
  fi

  bash scripts/typecheck.sh
}

for i in 1 2 3 4 5; do
  echo "=== FIX PASS $i ==="
  bash scripts/fix_all.sh || true

  if run_fmt_check && run_lint_checks && run_type_check; then
    echo "\u2713 All checks passed on pass $i"
    exit 0
  fi
done

echo "\u2717 Still failing after 5 passes (see errors above)"
exit 1
