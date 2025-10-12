#!/usr/bin/env bash
# Re-register Telegram webhook to fix 401 authentication errors
set -euo pipefail

echo "🔧 Fixing Telegram webhook authentication..."

# Get the project ref from config.toml
PROJECT_REF=$(grep '^project_id' supabase/config.toml | cut -d'"' -f2)

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Error: Could not find project_id in supabase/config.toml"
  exit 1
fi

# Check required environment variables
: "${TELEGRAM_BOT_TOKEN:?Missing TELEGRAM_BOT_TOKEN}"
: "${TELEGRAM_WEBHOOK_SECRET:?Missing TELEGRAM_WEBHOOK_SECRET}"

# Construct webhook URL
WEBHOOK_URL="https://${PROJECT_REF}.supabase.co/functions/v1/telegram-bot"

echo "📍 Project: $PROJECT_REF"
echo "🔗 Webhook URL: $WEBHOOK_URL"

# Delete existing webhook first
echo "🗑️  Deleting existing webhook..."
DELETE_RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook")
echo "Delete response: $DELETE_RESPONSE"

# Set new webhook with secret
echo "✅ Setting new webhook with secret..."
SET_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\",
    \"drop_pending_updates\": true,
    \"allowed_updates\": [\"message\", \"callback_query\", \"chat_member\", \"my_chat_member\"]
  }")

echo "Set response: $SET_RESPONSE"

# Verify webhook info
echo ""
echo "🔍 Verifying webhook configuration..."
INFO_RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
echo "$INFO_RESPONSE" | python3 -m json.tool || echo "$INFO_RESPONSE"

echo ""
echo "✅ Done! If webhook is configured correctly, the 401 errors should be resolved."
echo "💡 Make sure the TELEGRAM_WEBHOOK_SECRET in Supabase matches the one you just used."
