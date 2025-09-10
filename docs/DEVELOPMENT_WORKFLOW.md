# Development Workflow

This guide outlines eight high-level steps to run, build, and deploy the Telegram bot and optional Mini App.

1. **Understand the project scope**
   - Telegram bot for deposit workflows with optional Mini App for richer interactions.

2. **Set up prerequisites**
   - Install Node.js \u2265 22, Deno, and the Supabase CLI.

3. **Prepare environment variables**
   - Copy `.env.example` to `.env.local` and populate values:
   ```bash
   cp .env.example .env.local
   npm run sync-env
   ```

4. **Run locally**
   - Start Supabase services and serve the bot:
   ```bash
   supabase start
   supabase functions serve telegram-bot --no-verify-jwt
   npm run dev
   ```

5. **Build assets**
   - Compile production assets for the web app and Mini App:
   ```bash
   npm run build
   npm run build:miniapp # optional
   ```

6. **Quality checks**
   - Type-check and test the codebase:
   ```bash
   deno check supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
   deno test -A
   ```

7. **Deploy**
   - Deploy edge functions and push to your hosting platform:
   ```bash
   supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
   git push
   ```
   - Configure the Telegram webhook via BotFather.

8. **Post-deployment smoke tests**
   - Verify deployed endpoints respond as expected:
   ```bash
   curl -s https://<PROJECT>.functions.supabase.co/miniapp/version
   curl -s https://<PROJECT>.functions.supabase.co/telegram-bot/version
   curl -s -X POST https://<PROJECT>.functions.supabase.co/telegram-bot \
     -H 'x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>' \
     -H 'content-type: application/json' -d '{"test":"ping"}'
   ```

