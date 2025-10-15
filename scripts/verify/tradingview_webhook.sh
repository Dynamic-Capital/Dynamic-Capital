#!/usr/bin/env bash
set -euo pipefail
. scripts/verify/utils.sh
ensure_out
R=".out/tradingview_webhook.txt"
: > "$R"

say "E) TradingView Webhook Verification"

URL="${TRADINGVIEW_WEBHOOK_URL:-https://dynamic-capital.ondigitalocean.app/webhook}"
TIMEOUT="${TRADINGVIEW_WEBHOOK_TIMEOUT:-8}"

if ! command -v curl >/dev/null 2>&1; then
  warn "curl not available, skipping TradingView webhook verification."
  echo "url=$URL" >> "$R"
  echo "verified=SKIPPED" >> "$R"
  exit 0
fi

echo "url=$URL" >> "$R"
echo "timeout=${TIMEOUT}s" >> "$R"

tmp_headers=$(mktemp)
get_status=$(curl -s -m "$TIMEOUT" -D "$tmp_headers" -o /dev/null "$URL" -w "%{http_code}" || echo 000)
content_type=$(grep -i '^content-type:' "$tmp_headers" | tail -n 1 | cut -d' ' -f2- | tr -d '\r' | trim || true)
rm -f "$tmp_headers"

echo "get_status=$get_status" >> "$R"
if [ -n "$content_type" ]; then
  echo "get_content_type=$content_type" >> "$R"
fi

post_body=$(mktemp)
post_cmd=(curl -s -m "$TIMEOUT" -o "$post_body" -w "%{http_code}" -H "content-type: application/json" -d '{}')
post_status=$("${post_cmd[@]}" "$URL" || echo 000)

echo "post_status=$post_status" >> "$R"
if [ -s "$post_body" ]; then
  preview=$(head -c 160 "$post_body" | tr '\n' ' ' | tr -d '\r' | trim)
  if [ -n "$preview" ]; then
    echo "post_preview=$preview" >> "$R"
  fi
fi
rm -f "$post_body"

if [ -n "${TRADINGVIEW_WEBHOOK_SECRET:-}" ]; then
  secure_body=$(mktemp)
  secure_cmd=(curl -s -m "$TIMEOUT" -o "$secure_body" -w "%{http_code}" -H "content-type: application/json" -H "X-Tradingview-Secret: ${TRADINGVIEW_WEBHOOK_SECRET}" -d '{}')
  secure_status=$("${secure_cmd[@]}" "$URL" || echo 000)
  echo "auth_status=$secure_status" >> "$R"
  if [ -s "$secure_body" ]; then
    secure_preview=$(head -c 160 "$secure_body" | tr '\n' ' ' | tr -d '\r' | trim)
    if [ -n "$secure_preview" ]; then
      echo "auth_preview=$secure_preview" >> "$R"
    fi
  fi
  rm -f "$secure_body"
else
  echo "auth_status=SKIPPED" >> "$R"
fi

if [ -n "${TRADINGVIEW_WEBHOOK_SECRET:-}" ]; then
  if [[ "$secure_status" =~ ^2[0-9][0-9]$ ]]; then
    echo "verified=PASS" >> "$R"
  else
    echo "verified=FAIL" >> "$R"
  fi
else
  if [[ "$post_status" =~ ^(401|403)$ ]]; then
    echo "verified=PASS" >> "$R"
  else
    echo "verified=FAIL" >> "$R"
  fi
fi

say "TradingView webhook verification complete."
