# Dynamic Capital — Telegram Bot & Mini App

**Fast deposits for traders. Bank & crypto, verified.**

## What this is

Telegram-first bot with optional Mini App (Web App) for deposit workflows (bank
OCR + crypto TXID). Built with **Lovable Codex** for enhanced development experience.

## Features

- Telegram webhook (200-fast), OCR on images only
- Bank receipts (BML/MIB) auto-verification
- Crypto TXID submissions (no image approvals)
- Optional Mini App (glass theme, 1:1 assets)
- Admin commands for maintenance
- **Lovable Codex Integration** for AI-powered development

## Lovable Codex Development

This project leverages **Lovable Codex** for enhanced UI development and debugging:

### Quick UI Edits
- **Visual Edits**: Click the Edit button in Lovable's chat interface for instant visual changes
- **Real-time Preview**: See changes immediately in the live preview window
- **Component-based**: Modular, reusable UI components throughout the app

### AI-Powered Development
- **Natural Language Coding**: Describe features in plain English
- **Automatic Optimization**: Code is refactored for best practices
- **TypeScript Integration**: Full type safety and IntelliSense support
- **Design System**: Semantic tokens for consistent theming

### Debugging & Monitoring
- **Console Access**: Real-time console log monitoring
- **Network Inspection**: API call and edge function monitoring
- **Error Detection**: Automatic error identification and fixes
- **Performance Tracking**: Component optimization suggestions

### Development Workflow
1. **Chat-driven**: Describe changes in natural language
2. **Visual Edits**: Use for quick text/color changes (saves credits)
3. **Incremental**: Test changes before requesting more
4. **AI Debugging**: Use built-in tools before manual editing

## Privacy & security

No secrets in this repo; uses environment variables. Service role keys used only
in Edge Functions. Code and assets may be encrypted/obfuscated later. Logs avoid
PII; rate limits enabled.

## Environment variables

Full list and usage notes: [docs/env.md](docs/env.md).

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- TELEGRAM_ADMIN_IDS _(comma-separated Telegram user IDs; spaces are ignored)_
- MINI_APP_URL _(optional)_
- AMOUNT_TOLERANCE _(optional)_
- WINDOW_SECONDS _(optional)_
- OPENAI_API_KEY _(optional)_
- OPENAI_ENABLED _(optional)_
- BENEFICIARY_TABLE _(optional)_

Values are set in Supabase function secrets, GitHub Environments, or Lovable Codex
project settings. Do not commit them.

To troubleshoot `401 Unauthorized` from admin endpoints, generate a known-good
`initData` string and verify it:

```bash
deno run --no-npm -A scripts/make-initdata.ts --id=<your_telegram_id>
curl -X POST -H "Content-Type: application/json" \
  -d "{\"initData\":\"$INITDATA\"}" \
  "$SUPABASE_URL/functions/v1/verify-initdata"
```

## Quick start with Lovable Codex

### Using Lovable Codex (Recommended)
1. Open the project in Lovable Codex
2. Use the chat interface to describe desired changes
3. Use Visual Edits for quick UI modifications
4. Monitor the live preview for real-time feedback

### Local Development
```bash
# Start local stack
supabase start

# Serve the function (new terminal)
supabase functions serve telegram-bot --no-verify-jwt

# Ping (expects 200)
curl -X POST "http://127.0.0.1:54321/functions/v1/telegram-bot" \
  -H "content-type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET" \
  -d '{"test":"ping"}'
```

Note: for OCR parsing, send an actual Telegram image to the bot; OCR runs only
on images.

## Mini App

- Set `MINI_APP_URL` in env (example domain only, do not hardcode).
- Launch via Web App button inside Telegram.
- All UI images should be 1:1 (square).

## VIP Sync

- Bot must be an admin in VIP channels to receive membership updates and call `getChatMember`.
- Configure VIP channels via `bot_settings.vip_channels` (JSON array) or env `VIP_CHANNELS`.
- Memberships are synced on join/leave events and via `/vip-sync` helper endpoints.
- Use `scripts/import-vip-csv.ts` for bulk backfills; users must `/start` the bot at least once.

## CI / checks

Type check:

```bash
deno check supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
```

If tests present:

```bash
deno test -A
```

## Smoke checks

```bash
curl -s https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/version
curl -s https://qeejuomcapbdlhnjqjcc.functions.supabase.co/telegram-bot/version
curl -s -X POST https://qeejuomcapbdlhnjqjcc.functions.supabase.co/telegram-bot \
  -H 'x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>' \
  -H 'content-type: application/json' -d '{"test":"ping"}'
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environment vars, tests,
deployment, and troubleshooting.

Deploy function:

```bash
supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
```

Set Telegram webhook (with secret): use BotFather or API; do not paste secrets
in README.

## GitHub Integration

This project features **bidirectional GitHub sync** through Lovable Codex:
- Changes in Codex automatically push to GitHub
- GitHub changes sync back to Codex in real-time
- Built-in version control and rollback capabilities
- CI/CD integration with GitHub Actions

## License / contributions

Proprietary / All rights reserved. Personal project; external PRs/issues are
closed by default.

## Notes

Repo keeps source only. No caches (.cas), dist/, or node_modules/ are committed.

Future changes may encrypt code and increase env usage; see [docs/agent.md](docs/agent.md) for
behavior spec and Lovable Codex integration details.
