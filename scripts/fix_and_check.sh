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

snapshot_repo_state() {
  git status --porcelain=v2 --untracked-files=all
}

no_more_changes=false
for i in 1 2 3 4 5; do
  echo "=== FIX PASS $i ==="
  before_state="$(snapshot_repo_state)"
  bash "${SCRIPT_DIR}/fix_all.sh" || true
  after_state="$(snapshot_repo_state)"
  pass_made_changes=true
  if [[ "$before_state" == "$after_state" ]]; then
    pass_made_changes=false
  fi
  if $DENO_BIN fmt --check . && $DENO_BIN lint && bash "${SCRIPT_DIR}/typecheck.sh"; then
    echo "\u2713 All checks passed on pass $i"
    exit 0
  fi
  if [[ "$pass_made_changes" == false ]]; then
    no_more_changes=true
    break
  fi
done

if [[ "$no_more_changes" == true ]]; then
  echo "\u2717 Checks are still failing after pass $i and no additional automated fixes were applied."
else
  echo "\u2717 Still failing after 5 passes (see errors above)"
fi
exit 1
