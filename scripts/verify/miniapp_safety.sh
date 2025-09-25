#!/usr/bin/env bash
set -euo pipefail
. scripts/verify/utils.sh
ensure_out
R=".out/miniapp_safety.txt"
: > "$R"

say "D) Mini App Safety"

if [ ! -d "supabase/functions/miniapp/src" ]; then
  echo "miniapp_present=UNKNOWN" >> "$R"
  echo "client_token_leak=UNKNOWN" >> "$R"
  echo "initdata_verify_usage=UNKNOWN" >> "$R"
  exit 0
fi

echo "miniapp_present=PASS" >> "$R"

# 1) Ensure no bot token or service keys are present in client code
if rg --no-messages -q -e 'TELEGRAM_BOT_TOKEN|SUPABASE_SERVICE_ROLE_KEY' \
  supabase/functions/miniapp/src; then
  echo "client_token_leak=FAIL" >> "$R"
else
  echo "client_token_leak=PASS" >> "$R"
fi

# 2) Check use of initData verification endpoint (tg-verify-init)
if rg --no-messages -q 'tg-verify-init' supabase/functions/miniapp/src; then
  echo "initdata_verify_usage=PASS" >> "$R"
else
  echo "initdata_verify_usage=FAIL" >> "$R"
fi

say "Mini app safety scan complete."
