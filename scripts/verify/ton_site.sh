#!/usr/bin/env bash
set -euo pipefail
. scripts/verify/utils.sh

ensure_out
OUT=".out/ton_site.txt"
: > "$OUT"

say "H) TON Site Verification"

if ! command -v node >/dev/null 2>&1; then
  warn "node is not available; skipping TON Site verification."
  {
    echo "node=missing"
    echo "verified=SKIPPED"
  } >> "$OUT"
  exit 0
fi

CONFIG_PATH="${TON_SITE_CONFIG_PATH:-dns/dynamiccapital.ton.json}"
DOMAIN_OVERRIDE="${TON_SITE_DOMAIN:-}"

if [ ! -f "$CONFIG_PATH" ]; then
  warn "TON Site config file '$CONFIG_PATH' not found."
  {
    echo "config_path=$CONFIG_PATH"
    echo "config_present=FAIL"
  } >> "$OUT"
  exit 0
fi

if ! output=$(node scripts/verify/ton_site.mjs "$CONFIG_PATH" "$DOMAIN_OVERRIDE" 2>&1); then
  warn "ton_site.mjs execution encountered an error"
  echo "$output" >> "$OUT"
  echo "verified=FAIL" >> "$OUT"
  exit 0
fi

while IFS= read -r line; do
  [ -z "$line" ] && continue
  echo "$line" >> "$OUT"
  key="${line%%=*}"
  value="${line#*=}"
  case "$key" in
    config_present)
      if [ "$value" = "PASS" ]; then
        pass "Loaded TON Site configuration"
      else
        warn "Failed to load TON Site configuration"
      fi
      ;;
    domain)
      if [ "$value" != "UNKNOWN" ]; then
        say "Domain under verification: $value"
      else
        warn "Domain missing from TON Site configuration"
      fi
      ;;
    ton_site_present)
      if [ "$value" = "PASS" ]; then
        pass "TON Site metadata present"
      else
        warn "TON Site metadata missing"
      fi
      ;;
    adnl_format)
      if [ "$value" = "PASS" ]; then
        pass "ADNL address format valid"
      else
        warn "ADNL address failed validation"
      fi
      ;;
    public_key_valid)
      if [ "$value" = "PASS" ]; then
        pass "TON Site public key decoded successfully"
      else
        warn "TON Site public key failed validation"
      fi
      ;;
    resolver_format)
      if [ "$value" = "PASS" ]; then
        pass "Resolver contract decoded successfully"
      else
        warn "Resolver contract address invalid"
      fi
      ;;
    resolver_matches_dns)
      if [ "$value" = "PASS" ]; then
        pass "Resolver matches TON DNS lookup"
      else
        warn "Resolver mismatch between config and TON DNS"
      fi
      ;;
    tonapi_lookup)
      case "$value" in
        PASS)
          pass "TON API lookup succeeded"
          ;;
        SKIPPED)
          warn "TON API lookup skipped"
          ;;
        ERROR)
          warn "TON API lookup encountered an exception"
          ;;
        *)
          warn "TON API lookup returned status: $value"
          ;;
      esac
      ;;
    tonapi_error)
      warn "TON API response preview: $value"
      ;;
    tonapi_exception)
      warn "TON API exception: $value"
      ;;
    generated_command_status)
      if [ "$value" = "PASS" ]; then
        pass "Generated command metadata matches expected value"
      elif [ "$value" = "WARN" ]; then
        warn "Generated command metadata differs from expected"
      else
        warn "Generated command metadata missing"
      fi
      ;;
    generated_timestamp_status)
      if [ "$value" = "PASS" ]; then
        pass "Generated timestamp parsed successfully"
      else
        warn "Generated timestamp missing or invalid"
      fi
      ;;
    notes_reference_adnl)
      if [ "$value" = "PASS" ]; then
        pass "DNS notes reference the ADNL address"
      else
        warn "DNS notes do not reference the ADNL address"
      fi
      ;;
  esac
  if [ "$key" = "adnl_address" ] && [ "$value" != "MISSING" ]; then
    say "ADNL address: $value"
  fi
  if [ "$key" = "resolver_contract" ] && [ "$value" != "MISSING" ]; then
    say "Resolver contract: $value"
  fi
  if [ "$key" = "tonapi_resolver_address" ]; then
    say "TON API resolver address: $value"
  fi
  if [ "$key" = "resolver_address_hash" ]; then
    say "Resolver hash: $value"
  fi
  if [ "$key" = "public_key_bytes" ]; then
    say "Public key bytes: $value"
  fi
  if [ "$key" = "generated_command" ] && [ "$value" != "MISSING" ]; then
    say "Generated command: $value"
  fi
  if [ "$key" = "generated_timestamp" ] && [ "$value" != "MISSING" ]; then
    say "Generated timestamp: $value"
  fi
  if [ "$key" = "generated_note" ]; then
    say "Generated note: $value"
  fi
  if [ "$key" = "tonapi_http_status" ]; then
    say "TON API HTTP status: $value"
  fi
  if [ "$key" = "resolver_address_testnet" ]; then
    say "Resolver testnet flag: $value"
  fi
  if [ "$key" = "resolver_address_bounceable" ]; then
    say "Resolver bounceable flag: $value"
  fi
  if [ "$key" = "tonapi_lookup" ] && [ "$value" != "PASS" ]; then
    echo "verified=FAIL" >> "$OUT"
  fi
done <<< "$output"

if ! grep -q '^verified=' "$OUT"; then
  echo "verified=PASS" >> "$OUT"
fi

say "TON Site verification complete."
