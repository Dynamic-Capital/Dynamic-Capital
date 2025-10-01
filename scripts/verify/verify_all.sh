#!/usr/bin/env bash
set -euo pipefail
. scripts/verify/utils.sh
ensure_out

# prerequisites
if ! command -v jq >/dev/null 2>&1; then
  warn "jq not found, installing lightweight version is recommended for JSON parsing."
fi

bash scripts/verify/static_code_checks.sh
bash scripts/verify/deployed_function_checks.sh
bash scripts/verify/runtime_wiring_checks.sh
bash scripts/verify/miniapp_safety.sh
bash scripts/verify/tradingview_webhook.sh
bash scripts/verify/tunnel_checks.sh
bash scripts/verify/dynamic_modules.sh
bash scripts/verify/ton_site.sh

# Build markdown report
OUT=".out/verify_report.md"
: > "$OUT"

echo "# Verification Report" >> "$OUT"
echo "" >> "$OUT"
echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%SZ")" >> "$OUT"
echo "" >> "$OUT"

emit_section () {
  local title="$1" file="$2"
  echo "## $title" >> "$OUT"
  echo "" >> "$OUT"
  while IFS='=' read -r k v; do
    [ -z "$k" ] && continue
    echo "- **$k**: \`$v\`" >> "$OUT"
  done < "$file"
  echo "" >> "$OUT"
}

emit_section "A) Static Code Checks" ".out/static_checks.txt"
emit_section "B) Deployed Function Checks" ".out/deployed_checks.txt"
emit_section "C) Runtime Wiring Checks" ".out/runtime_checks.txt"
emit_section "D) Mini App Safety" ".out/miniapp_safety.txt"
emit_section "E) TradingView Webhook" ".out/tradingview_webhook.txt"
emit_section "F) Tunnel CLI Checks" ".out/tunnel_checks.txt"
emit_section "G) Dynamic Modules" ".out/dynamic_modules.txt"
emit_section "H) TON Site" ".out/ton_site.txt"

echo "Report written to $OUT"
say "Done."
