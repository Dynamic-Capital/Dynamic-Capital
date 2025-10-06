#!/usr/bin/env bash
set -euo pipefail
. scripts/verify/utils.sh

ensure_out
OUT=".out/domain_checks.txt"
: > "$OUT"

say "I) Domain Configuration Verification"

if ! command -v python3 >/dev/null 2>&1; then
  warn "python3 is not available; skipping domain configuration verification."
  {
    echo "python3=missing"
    echo "verified=SKIPPED"
  } >> "$OUT"
  exit 0
fi

if output=$(PYTHONPATH=. python3 <<'PY'
from __future__ import annotations

import sys

from dynamic_domain.verification import summarise_checks, verify_directory

try:
    checks = verify_directory("dns")
except FileNotFoundError as exc:
    print("domains_total=0")
    print("status=SKIPPED")
    sys.exit(0)

summary = summarise_checks(checks)
print(f"domains_total={summary['total']}")
print(f"domains_healthy={summary['healthy']}")
print(f"domains_with_errors={summary['unhealthy']}")
print(f"ton_sites_present={summary['ton_sites_present']}")
print(f"ton_sites_valid={summary['ton_sites_valid']}")
print(f"placeholders_detected={summary['placeholders']}")
for check in checks:
    status = "PASS" if check.ok else "FAIL"
    print(f"{check.domain}={status}")
    if check.placeholders:
        joined = " | ".join(check.placeholders)
        print(f"{check.domain}_placeholders={joined}")
    if check.errors:
        joined = " | ".join(check.errors)
        print(f"{check.domain}_errors={joined}")

status = "PASS" if summary['unhealthy'] == 0 else "FAIL"
print(f"status={status}")
if status == "PASS":
    sys.exit(0)
sys.exit(1)
PY
); then
  printf '%s\n' "$output" >> "$OUT"
  status=$(printf '%s\n' "$output" | awk -F'=' '$1=="status" {print $2}' | tail -n1)
  if [ "${status:-PASS}" = "PASS" ]; then
    pass "Domain configuration files validated successfully"
    echo "verified=PASS" >> "$OUT"
  else
    fail "Domain configuration verification reported failures"
    echo "verified=FAIL" >> "$OUT"
    exit 1
  fi
else
  printf '%s\n' "$output" >> "$OUT"
  fail "Domain configuration verification encountered an error"
  echo "verified=FAIL" >> "$OUT"
  exit 1
fi

say "Domain configuration verification complete"
