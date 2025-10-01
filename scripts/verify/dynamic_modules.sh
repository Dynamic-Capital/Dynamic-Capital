#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/utils.sh"

ensure_out
OUT=".out/dynamic_modules.txt"
: > "$OUT"

run_pytest() {
  local label="$1"
  shift
  say "[dynamic-modules] Running pytest for ${label}"
  if PYTHONPATH=. pytest "$@" > ".out/${label// /_}_pytest.log" 2>&1; then
    pass "${label} tests passed"
    echo "${label}=pass" >> "$OUT"
  else
    fail "${label} tests failed"
    echo "${label}=fail" >> "$OUT"
    sed -n '1,160p' ".out/${label// /_}_pytest.log"
    exit 1
  fi
}

run_pytest "Dynamic AI" tests/intelligence/ai_apps
run_pytest "Dynamic AGI" tests/intelligence/agi
run_pytest "Dynamic AGS" tests/test_dynamic_ags_playbook.py
run_pytest "Dynamic Translation Layer" tests/dynamic_translation
run_pytest "Dynamic Technical Analysis" tests/dynamic_ta
run_pytest "Dynamic Capital Token" tests/platform/token

say "Dynamic module verification complete"
