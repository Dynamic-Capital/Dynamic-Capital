#!/usr/bin/env bash
set -euo pipefail
. scripts/verify/utils.sh
ensure_out

R=".out/tunnel_checks.txt"
: > "$R"

DEFAULT_PORT="${NGROK_PORT:-54321}"
DEFAULT_BIN="${NGROK_BIN:-ngrok}"

say "F) Tunnel CLI Checks"

check_output() {
  local label="$1"
  local expected_port="$2"
  local expected_flag="$3"
  local expected_bin="$4"
  shift 4

  local output
  if ! output=$(node scripts/ngrok-http.mjs --dry-run "$@" 2>/dev/null); then
    echo "$label=FAIL" >> "$R"
    warn "Tunnel dry-run command for $label failed to execute."
    return
  fi

  if ! node -e "const data = JSON.parse(process.argv[1]); const port = process.argv[2]; const flag = process.argv[3]; const expectedBin = process.argv[4]; if (!Array.isArray(data.args)) process.exit(1); if (data.args[0] !== 'http' || data.args[1] !== port) process.exit(1); if (flag && !data.args.includes(flag)) process.exit(1); if (expectedBin && data.bin !== expectedBin) process.exit(1);" "$output" "$expected_port" "$expected_flag" "$expected_bin"; then
    echo "$label=FAIL" >> "$R"
    warn "Tunnel dry-run validation for $label did not match the expected shape."
    return
  fi

  echo "$label=PASS" >> "$R"
}

check_output "default" "$DEFAULT_PORT" "" "$DEFAULT_BIN"
check_output "custom_port_flag" "8000" "" "$DEFAULT_BIN" --port 8000
check_output "forward_args" "9000" "--log=stdout" "$DEFAULT_BIN" --port=9000 --log=stdout
check_output "bin_override" "$DEFAULT_PORT" "" "custom-ngrok" --bin custom-ngrok

say "Tunnel CLI checks complete."
