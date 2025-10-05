#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/utils.sh"

ensure_out
OUT=".out/dynamic_modules.txt"
: > "$OUT"

shopt -s nullglob

declare -A _processed_paths=()

normalize_path() {
  local target="${1%/}"
  if command -v realpath >/dev/null 2>&1; then
    realpath "$target"
    return
  fi
  local dir
  dir="$(cd "$(dirname "$target")" >/dev/null 2>&1 && pwd)"
  printf '%s/%s\n' "$dir" "$(basename "$target")"
}

track_path() {
  local path
  path=$(normalize_path "$1")
  _processed_paths["$path"]=1
}

is_tracked() {
  local path
  path=$(normalize_path "$1")
  [[ -n "${_processed_paths[$path]+x}" ]]
}

title_case() {
  local text="${1-}"
  python - "$text" <<'PY'
import sys

text = sys.argv[1] if len(sys.argv) > 1 else ""
words = [word for word in text.split() if word]
print(" ".join(word.capitalize() for word in words))
PY
}

make_label() {
  local identifier="$1"
  identifier="${identifier%/}"
  identifier="${identifier%.py}"
  identifier="${identifier#tests/}"
  identifier="${identifier#test_}"

  local formatted
  formatted="${identifier//[_-]/ }"

  if [[ "$formatted" == dynamic* ]]; then
    local rest="${formatted#dynamic }"
    if [[ -n "$rest" ]]; then
      printf "Dynamic %s" "$(title_case "$rest")"
      return
    fi
    printf "Dynamic"
    return
  fi

  title_case "$formatted"
}

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

run_tracked_pytest() {
  local label="$1"
  shift
  local target="$1"
  track_path "$target"
  run_pytest "$label" "$target"
}

run_tracked_pytest "Dynamic AI" tests/intelligence/ai_apps
run_tracked_pytest "Dynamic AGI" tests/intelligence/agi
run_tracked_pytest "Dynamic AGS" tests/test_dynamic_ags_playbook.py
run_tracked_pytest "Dynamic Translation Layer" tests/dynamic_translation
run_tracked_pytest "Dynamic Technical Analysis" tests/dynamic_ta
run_tracked_pytest "Dynamic Capital Token" tests/platform/token

for suite in tests/dynamic_*; do
  [[ -d "$suite" ]] || continue
  if is_tracked "$suite"; then
    continue
  fi
  run_tracked_pytest "$(make_label "$suite")" "$suite"
done

for case_file in tests/test_dynamic_*.py; do
  [[ -f "$case_file" ]] || continue
  if is_tracked "$case_file"; then
    continue
  fi
  run_tracked_pytest "$(make_label "$case_file")" "$case_file"
done

say "Dynamic module verification complete"
