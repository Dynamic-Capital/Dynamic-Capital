# Dynamic Capital Telegram Bot

A minimal Telegraf bot that welcomes users and links them to the Dynamic Capital
mini app.

## Environment variables

```bash
TELEGRAM_BOT_TOKEN=xxxxxxxx
APP_URL=https://dynamiccapital.ton
```

Install dependencies with `pnpm install` and use the provided scripts:

```bash
# Start the TypeScript entrypoint with live type checking
pnpm run dev

# Emit ESM output into dist/
pnpm run build

# Launch the compiled bot (after pnpm run build)
pnpm start
```
