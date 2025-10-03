#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/telegram-webhook.sh [delete|set|info]

Environment variables required:
  TELEGRAM_BOT_TOKEN          # BotFather token
  TELEGRAM_WEBHOOK_SECRET     # Secret token for X-Telegram-Bot-Api-Secret-Token (only for 'set')

Optional (provide either TELEGRAM_WEBHOOK_URL or a project reference):
  TELEGRAM_WEBHOOK_URL        # Explicit webhook endpoint (preferred when overriding)
  PROJECT_REF                 # Supabase project ref (e.g. your-project-ref)
  SUPABASE_URL                # e.g. https://your-project-ref.supabase.co

Examples:
  ./scripts/telegram-webhook.sh delete
  ./scripts/telegram-webhook.sh set
  ./scripts/telegram-webhook.sh info
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" || $# -eq 0 ]]; then
  usage; exit 0
fi

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"

ALLOWED_UPDATES='["message","callback_query","inline_query","chat_member","my_chat_member"]'

# Derive webhook URL (override wins)
FUNCTION_URL=${TELEGRAM_WEBHOOK_URL:-}

if [[ -z "$FUNCTION_URL" ]]; then
  # Derive PROJECT_REF from SUPABASE_URL if not given
  PROJECT_REF=${PROJECT_REF:-}
  if [[ -z "$PROJECT_REF" && -n "${SUPABASE_URL:-}" ]]; then
    # SUPABASE_URL format: https://<project-ref>.supabase.co
    PROJECT_REF=$(printf "%s" "$SUPABASE_URL" | sed -E 's#https?://([^.]+)\.supabase\.co.*#\1#') || true
  fi

  if [[ -z "$PROJECT_REF" ]]; then
    echo "[!] Provide TELEGRAM_WEBHOOK_URL or PROJECT_REF/SUPABASE_URL to build the webhook URL" >&2
    exit 1
  fi

  FUNCTION_URL="https://${PROJECT_REF}.functions.supabase.co/telegram-bot"
fi
API_BASE="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

cmd=${1}
case "$cmd" in
  delete)
    echo "[-] Deleting webhook (no secret printed)..."
    curl -sS -X POST "${API_BASE}/deleteWebhook" | jq -r '.description // "ok"'
    ;;
  set)
    : "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET is required for set}"
    echo "[+] Setting webhook (URL hidden)..."
    # Do not echo the full URL to avoid leaking secrets
    curl -sS -X POST "${API_BASE}/setWebhook" \
      -d "url=${FUNCTION_URL}" \
      -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
      -d "allowed_updates=${ALLOWED_UPDATES}" | jq -r '.description // "ok"'
    ;;
  info)
    echo "[i] Webhook info:"
    curl -sS "${API_BASE}/getWebhookInfo" | jq '.result | {url, has_custom_certificate, pending_update_count, last_error_date, last_error_message, max_connections, ip_address}'
    ;;
  *)
    usage; exit 1;;
 esac
