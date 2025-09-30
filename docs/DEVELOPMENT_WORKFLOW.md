# Development Workflow

This guide outlines nine high-level steps to run, build, and deploy the
Telegram bot and optional Mini App.

1. **Understand the project scope**
   - First Maldivian Web3 trading application delivered through a Telegram bot
     with optional Mini App for richer interactions and verified deposit
     workflows.

2. **Set up prerequisites**
   - Install Node.js 22.x (LTS), Deno, and the Supabase CLI.

3. **Prepare environment variables**
   - Copy `.env.example` to `.env` and `.env.local`, then populate values:
   ```bash
   cp .env.example .env
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

6. **Quality checks & verification**
   - Type-check and test the codebase:
   ```bash
   deno check --allow-import supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
   deno test -A
   ```
   - Run the aggregated verification suite when you need confidence across the
     static exports, Telegram integrations, and trading automation:
   ```bash
   npm run verify
   ```
   - Following the Dynamic Codex flow? Use `npm run codex:verify` to invoke the
     same checks from the workflow helper.

7. **Optimize bundles (optional but recommended before release)**
   - Produce production artifacts:
   ```bash
   npm run build
   ```
   - Inspect bundle composition with the built-in analyzer to spot regressions
     before they reach Maldivian traders:
   ```bash
   ANALYZE=true npm run build:web
   ```

8. **Deploy**
   - Deploy edge functions and push to your hosting platform:
   ```bash
   supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
   git push
   ```
   - Configure the Telegram webhook via BotFather.

9. **Post-deployment smoke tests**

- Verify deployed endpoints respond as expected. Replace `<PROJECT>` with your
  Supabase project ref, or use `TELEGRAM_WEBHOOK_URL` for the Telegram webhook
  if you've overridden the default host:

```bash
curl -s https://<PROJECT>.functions.supabase.co/miniapp/version
WEBHOOK_BASE=${TELEGRAM_WEBHOOK_URL:-https://<PROJECT>.functions.supabase.co/telegram-bot}
WEBHOOK_BASE=${WEBHOOK_BASE%/}
curl -s "$WEBHOOK_BASE/version"
curl -s -X POST "$WEBHOOK_BASE" \
  -H 'x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>' \
  -H 'content-type: application/json' -d '{"test":"ping"}'
```

## Local static + API development

When the landing page and API routes are deployed as separate components, you
can mirror that setup locally:

1. Start the Next.js API service on port 3000:

   ```bash
   cd next-app
   npm run dev -- -p 3000
   ```

2. In another terminal, serve the `static` directory and proxy `/api/*` to the
   Next.js server:

   ```bash
   npx local-web-server --directory static --port 3001 --proxy /api http://localhost:3000/api
   ```

Open `http://localhost:3001` and the static page will forward any `/api/*`
requests to the running Next.js service without CORS issues.
