# Dynamic Capital — Telegram Bot & Mini App

**Fast deposits for traders. Bank & crypto, verified.**

## What this is

Telegram-first bot with optional Mini App (Web App) for deposit workflows (bank
OCR + crypto TXID). Built with **Lovable Codex** for enhanced development
experience.

A single Next.js application powers both the marketing landing page and the
authenticated dashboard. The build pipeline captures the homepage into the
repository-level `_static/` directory so it can be served via CDN without
touching runtime secrets, while the live `/app` routes continue to handle
Supabase access, authentication, and other server-side features.

The Telegram Mini App is built with Next.js/React, hosted on DigitalOcean, and
backed by Supabase.

## Features

- Telegram webhook (200-fast), OCR on images only
- Bank receipts (BML/MIB) auto-verification
- Crypto TXID submissions (no image approvals)
- Optional Mini App (glass theme, 1:1 assets)
- Admin commands for maintenance
- **Lovable Codex Integration** for AI-powered development

## Security Features

- Optional HTTPS server enforces TLS 1.2+ (prefers TLS 1.3) when SSL certificates are supplied.
- HTTP Strict Transport Security (HSTS) headers for all responses.
- Lightweight per-IP rate limiting to mitigate basic DDoS attacks.
- Maintains third-party certifications for ISO 27001, SOC 2 Type II, PCI DSS Level 1, HIPAA, GDPR, and the EU–US Data Privacy Framework ([docs/compliance](docs/compliance/README.md)).

## Environment Setup

Copy `.env.example` to `.env` and `.env.local`, then adjust values for your
environment. Running `npm run sync-env` later will append newly added variables
from the example file into both destinations without overwriting your values:

```bash
cp .env.example .env
cp .env.example .env.local
```

The example defaults `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to
`http://localhost:3000` so the app works locally out of the box. Replace these
with your deployed domain when staging or going to production.

Create `.env` files for each component and define variables needed in your
deployment.

### Client-side (`NEXT_PUBLIC_*`)

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and can be
shared between the static landing page and the Next.js API service:

```
NEXT_PUBLIC_SUPABASE_URL=... 
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Store these in your hosting platform's environment settings or in `.env`/`.env.local`
for local development. The static site should have access to the same values at
build time.

### Server-only secrets

Keep secrets such as `SUPABASE_SERVICE_ROLE_KEY` or `TELEGRAM_BOT_TOKEN` only in
the environment for the Next.js component. Do **not** prefix them with
`NEXT_PUBLIC_` or expose them in the static site.

For local work, create `.env`/`.env.local` at the repository root and run
`npm run dev` to load the variables. In production, manage secrets through your
platform's configuration for each component.

> **Proxy-friendly npm wrapper:** if your terminal session provides legacy
> `npm_config_http_proxy` variables you may see `npm warn Unknown env config
> "http-proxy"`. Run commands through `node scripts/npm-safe.mjs <npm args>`
> (for example `node scripts/npm-safe.mjs run dev`) to strip the deprecated
> proxy keys and silence the warning while preserving HTTP/HTTPS proxy support.

## Project Structure

- **Functions** – Edge functions live under `supabase/functions` and any
  framework-managed API routes belong in `functions/`.
- **Build outputs** – Use `npm run build:all` to compile both the Next.js app
  and mini app functions. Optionally specify an output directory (relative to
  the build context) to control where build assets are generated; if omitted,
  the default location is used.
- **Static snapshot** – Place user-facing assets in `apps/web/public/` and run
  `npm run build:web && npm run build:landing` to mirror the homepage into
  `_static/` for CDN hosting.
- **Root configuration** – Key files like `package.json`, `tsconfig.json`,
  `eslint.config.js`, and `.env.example` sit at the project root. Keep
  `.env.example` updated when adding new environment variables.
- **Go service** – simple HTTP server in `go-service/` with a `/healthz` endpoint.
- **Unified builds** – the previous `external/dynamic_codex` Vite workspace has
  been merged; all bot tooling now ships from the Next.js app so the project is
  maintained with a single build pipeline.
- **File organizer** – Run `npm run docs:organize` to regenerate
  `docs/REPO_FILE_ORGANIZER.md`, which groups top-level files by domain so
  contributors can quickly find the right surface.

## Project starters

- **Package scripts** – launch development, build, and production with
  `npm run dev`, `npm run build`, and `npm run start` in `package.json`
- **Next.js web app** – main layout and landing page entry points in
  `app/layout.tsx` and `app/page.tsx`. Operational views such as the
  Telegram bot dashboard live directly under `app/telegram`.
- **Telegram bot** – Supabase Edge Function at
  `supabase/functions/telegram-bot/index.ts`
- **Mini App function** – Supabase Edge Function at
  `supabase/functions/miniapp/index.ts`
- **Broadcast planner** – standalone service at `broadcast/index.ts`
- **Queue worker** – standalone service at `queue/index.ts`

## Static snapshot pipeline

Run `npm run build:web` to produce the standalone Next.js server output. Follow
with `npm run build:landing` to boot that server locally, capture the rendered
homepage, and copy the necessary assets into the `_static/` directory. The
hardened `server.js` serves this snapshot for CDN-style hosting, while the
Next.js server continues to power authenticated routes.

All landing page edits now live in `apps/web` (for example, `app/page.tsx` and
the Once UI components). After changing those files, rerun the build steps above
to refresh the snapshot.

## Asset Deployment

- Run `npm run upload-assets` to push the generated `_static` directory to the configured CDN. The helper validates `CDN_ENDPOINT` and falls back to the regional Spaces endpoint if a custom CDN host is provided by mistake.
- Provide `DIGITALOCEAN_TOKEN`, `CDN_ENDPOINT_ID`, and `CDN_PURGE_PATHS` (comma-separated paths such as `/index.html,/`) to let the uploader purge stale CDN cache entries through the DigitalOcean API after each upload.
- A GitHub Actions workflow (`upload-assets.yml`) builds the Next.js app, runs the landing snapshot helper, and uploads `_static/` on pushes to `main`. It expects `CDN_BUCKET`, `CDN_ACCESS_KEY`, `CDN_SECRET_KEY`, and optional `CDN_REGION`/`CDN_ENDPOINT` secrets.
- Use `npm run do:sync-cdn -- --space <bucket> --region <slug> --apply --show-endpoint` to create or update the DigitalOcean CDN endpoint via the REST API and surface the endpoint ID. Pass `--custom-domain`/`--certificate-id` when attaching a vanity domain, or omit `--apply` for a dry run.
- During development, `npm run upload-assets:watch` monitors `_static` and uploads changes automatically.

## Maintenance & Automation

- Regenerate the documentation inventory after touching edge functions or environment variables with `npm run docs:summary`. The script updates `docs/REPO_SUMMARY.md` so reviewers can confirm every handler exposes a default export and spot any new `Deno.env.get` usage.
- Review the [Checklist Directory](docs/CHECKLISTS.md) to find the right project, launch, or integration checklist and see which ones have automation keys (`npm run checklists`).
- Keep `docs/env.md` in sync when introducing deployment settings such as `FUNCTIONS_BASE_URL` or log drain credentials (`LOGTAIL_SOURCE_TOKEN`, `LOGTAIL_URL`). Pair updates with the summary script so both docs reference the same keys.
- When rotating the Telegram webhook secret, run `deno run -A scripts/set-webhook.ts` (or `deno task set:webhook`) after deploying the updated function to re-register the webhook with BotFather.
- Scaffold AlgoKit runtime functions with `python tools/algo-cli/algokit.py function strategy-name --lang both` to create matching Python and TypeScript stubs from the command line.

## Development Process Overview

| Tool                   | What It Does                                                            | How You Use It                                                                                              |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Lovable (Platform)** | Hosts your web app, manages deployment, and provides a Supabase backend | Use the Lovable dashboard to configure environment variables and monitor deployments                        |
| **Lovable (AI)**       | Generates initial project scaffolding and high-level feature guidance   | Use the chat interface during setup and when auto-generating components                                     |
| **Telegram/BotFather** | Manages the bot and links it to your web app                            | Run BotFather commands like `/setmenubutton` or `/mybots` to connect the bot to your Lovable deployment URL |
| **Codex CLI**          | Assists with granular, code-level tasks on your local machine           | Use terminal commands for UI refinements, refactoring, and adding features                                  |
| **GitHub**             | Version control and deployment trigger                                  | Push local changes to GitHub to trigger Lovable to rebuild and redeploy your web app                        |

## 🎨 UI Development with Lovable Codex

### Quick UI Guidelines

- **Design System Only**: NEVER use direct colors like `text-white`, `bg-black`.
  Always use semantic tokens from `index.css` and `tailwind.config.ts`
- **Component Structure**: Create focused, reusable components instead of
  modifying large files
- **Visual Edits**: Use Lovable's Visual Edit button for quick text/color
  changes (saves credits)
- **Real-time Preview**: See changes immediately in the live preview window

### Development Workflow

1. **Chat-driven**: Describe UI changes in natural language
2. **Visual Edits**: Use for simple text/color/font changes
3. **Incremental**: Test each change before requesting more
4. **Design System**: Always use semantic tokens, never hardcoded colors

### AI-Powered Features

- **Natural Language Coding**: Describe features in plain English
- **Automatic Optimization**: Code is refactored for best practices
- **TypeScript Integration**: Full type safety and IntelliSense support
- **Responsive Design**: Mobile-first approach with proper breakpoints

### Debugging Tools

- **Console Access**: Real-time console log monitoring
- **Network Inspection**: API call and edge function monitoring
- **Error Detection**: Automatic error identification and fixes
- **Performance Tracking**: Component optimization suggestions

## 🔒 Architecture & Integration Guardrails

### Telegram Bot ⇄ Mini App Connection

<lov-mermaid>
graph TD
    A[Telegram Bot] -->|Webhook| B[Supabase Edge Functions]
    A -->|/start command| C[Mini App Button]
    C -->|Click| D[Web App Launch]
    D -->|initData auth| B
    B -->|Database| E[Supabase Tables]
    B -->|Storage| F[Receipt Files]

    subgraph "Core Tables"
        E1[bot_users]
        E2[user_subscriptions]
        E3[payment_intents]
        E4[receipts]
        E1 --> E2
        E2 --> E3
        E3 --> E4
    end

    E --> E1

    subgraph "Payment Flow"
        G[Receipt Upload] --> H[OCR Processing]
        H --> I[Bank Parser]
        I --> J{Auto-approve?}
        J -->|Yes| K[Approved]
        J -->|No| L[Manual Review]
    end

    B --> G

</lov-mermaid>

### 🚨 CRITICAL: DO NOT MODIFY INTEGRATION

**⚠️ NEVER CHANGE THESE CORE SYSTEMS:**

1. **Supabase Database Schema**
   - Tables: `bot_users`, `user_subscriptions`, `payment_intents`, `receipts`
   - Relationships and foreign keys
   - RLS policies and security

2. **Edge Functions Integration**
   - `telegram-bot/index.ts` - Core webhook handler
   - Authentication flow between bot and Mini App
   - Payment processing and OCR pipeline

3. **initData Validation**
   - Telegram Web App authentication mechanism
   - User session handling
   - Security token validation

### ✅ SAFE TO MODIFY: UI & UX Only

**These areas are safe for UI improvements:**

- **React Components**: All files in `components/`
- **Pages**: All files in `app/`
- **Styling**: `app/globals.css`, `tailwind.config.ts`
- **UI Library**: `components/ui/`
- **Hooks**: `lib/hooks/` (UI-related only)

### Connectivity Sanity Checks

Before making changes, verify these connections work:

```bash
# 1. Bot webhook responds
curl -X POST https://qeejuomcapbdlhnjqjcc.functions.supabase.co/telegram-bot \
  -H "content-type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: SECRET" \
  -d '{"test":"ping"}'

# 2. Mini App loads
curl -s https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/

# 3. Auth endpoint works
curl -X POST https://qeejuomcapbdlhnjqjcc.functions.supabase.co/verify-initdata \
  -H "content-type: application/json" \
  -d '{"initData":"VALID_INIT_DATA"}'
```

### Payment Flow Overview

1. **User starts bot** → `/start` command → Creates `bot_users` record
2. **Subscription needed** → Shows plans → Creates `user_subscriptions`
3. **Payment intent** → Bank details shown → Creates `payment_intents`
4. **Receipt upload** → OCR processing → Creates `receipts` record
5. **Auto-verification** → Bank parser → Approves or flags for review
6. **VIP access** → Telegram channel invitation → Updates subscription status

### Common UI Pitfalls to Avoid

❌ **DON'T:**

- Use `text-white`, `bg-black` or any direct colors
- Modify API endpoints or database queries
- Change authentication flows
- Edit Supabase schema or policies
- Hardcode URLs or tokens

✅ **DO:**

- Use semantic tokens: `text-foreground`, `bg-background`
- Create new UI components for features
- Use the existing design system
- Test in both light and dark modes
- Follow mobile-first responsive design

### Edge Function Error Handling

Use the `callEdgeFunction` helper to invoke Supabase Edge Functions. It returns
an object with optional `data` and `error` fields instead of throwing on
failure:

```ts
const { data, error } = await callEdgeFunction<MyType>("FUNCTION_NAME");
if (error) {
  // handle error.message / error.status
} else {
  // use typed data
}
```

This pattern keeps error handling consistent across the app and avoids unhandled
promise rejections.

Admin and system functions such as `ADMIN_SESSION` or `RESET_BOT` require
`TELEGRAM_WEBHOOK_SECRET` to be configured. The helper will throw before making
the request if the secret is missing.

## Privacy & security

No secrets in this repo; uses environment variables. Service role keys used only
in Edge Functions. Code and assets may be encrypted/obfuscated later. Logs avoid
PII; rate limits enabled.

## Environment variables

Full list and usage notes: [docs/env.md](docs/env.md).

- The `ALLOWED_ORIGINS` variable controls which domains may call the API and
  edge functions. If unset, it falls back to `SITE_URL` (or
  `http://localhost:3000` when `SITE_URL` is missing).
- See [docs/NETWORKING.md](docs/NETWORKING.md) for port mappings, reverse proxy
  tips, and Cloudflare ingress IPs.
- Copy `.env.example` to `.env.local` and replace the placeholder values with
  real secrets for your environment. This file is ignored by Git so each
  contributor maintains their own local configuration.

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- TELEGRAM_BOT_USERNAME _(optional)_
- TELEGRAM_BOT_URL _(optional)_
- USDT_TRC20_ADDRESS
- TELEGRAM_ADMIN_IDS _(comma-separated Telegram user IDs; spaces are ignored)_
- MINI_APP_URL _(optional)_
- AMOUNT_TOLERANCE _(optional)_
- WINDOW_SECONDS _(optional)_
- OPENAI_API_KEY _(optional)_
- OPENAI_ENABLED _(optional)_
- BENEFICIARY_TABLE _(optional)_
- LOG_LEVEL _(optional)_

### Build environment

Both the dashboard and the Telegram MiniApp require these variables at build
time (exposed with Next.js `NEXT_PUBLIC_` prefix so they end up in the browser
bundle). `NEXT_PUBLIC_API_URL` is optional and defaults to `/api` if omitted:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# NEXT_PUBLIC_API_URL=https://example.com/api
```

Set the required Supabase values in your hosting provider (e.g., Lovable.dev project settings). If
either value is missing, the app will render a configuration error screen
instead of loading. You can optionally set `NEXT_PUBLIC_API_URL` to point at a custom API; otherwise the client uses
the relative `/api` path. The client also accepts `SUPABASE_URL`/`SUPABASE_ANON_KEY`
as fallbacks if the `NEXT_PUBLIC_` values are not provided.

Values are set in Supabase function secrets, GitHub Environments, or Lovable
Codex project settings. Do not commit them.

To troubleshoot `401 Unauthorized` from admin endpoints, generate a known-good
`initData` string and verify it:

```bash
deno run --no-npm -A scripts/make-initdata.ts --id=<your_telegram_id>
curl -X POST -H "Content-Type: application/json" \
  -d "{\"initData\":\"$INITDATA\"}" \
  "$SUPABASE_URL/functions/v1/verify-initdata"
```

## Building

The main build compiles the dashboard only. Run the Mini App build separately
when needed:

```bash
# build the dashboard
npm run build

# build the Telegram Mini App
npm run build:miniapp

# build both targets
npm run build:all
```

`npm run build` produces a standalone bundle in `.next/standalone` which can be
run with `node .next/standalone/server.js`. This output is ideal for Docker or
process managers such as PM2.

### Bundle analysis

Inspect bundle size by enabling the analyzer during build:

```bash
npm run analyze
# or
ANALYZE=true npm run build
```

## API demo

A simple `app/api/hello` route returns a JSON greeting. The client page in
`app/api-demo/page.tsx` fetches this endpoint on mount and displays loading,
success, or error states based on the fetch result.

### Tests

- `tests/api/hello.test.ts` calls the route handler and asserts the expected
  JSON payload.
- `tests/app/api-demo/page.test.tsx` renders the demo page with a mocked `fetch`
  and verifies that the message appears.

## Quick start with Lovable Codex

### Using Lovable Codex (Recommended)

1. Open the project in Lovable Codex
2. Use the chat interface to describe desired changes
3. Use Visual Edits for quick UI modifications
4. Monitor the live preview for real-time feedback

### Local Development

```bash
# Create your local environment files
cp .env.example .env
cp .env.example .env.local
# Ensure .env and .env.local have all variables
npm run sync-env

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

### Codex CLI workflow helper

The Codex CLI pulls these changes into your local checkout. Run the helper
scripts to reproduce Codex's post-export steps and keep everything in sync:

- `npm run codex:post-pull` – install dependencies, sync environment files,
  validate required variables, and run the combined Lovable build.
- `npm run codex:dev` – ensure the environment is synced before launching
  `lovable-dev.js` (Next.js dev server with Codex preflight checks).
- `npm run codex:build` – run the Lovable production build locally (same as
  Codex deploys).
- `npm run codex:verify` – execute the repository verification suite.

Pass extra flags after `--` to tweak the workflow:

```bash
npm run codex:post-pull -- --verify            # run verification after syncing
npm run codex:post-pull -- --no-build          # skip the Lovable build step
npm run codex:dev -- --no-sync                 # keep existing env values
npm run codex:post-pull -- --dry-run           # list steps without executing
npm run codex:post-pull -- --reset-issues      # clear cached failure history & tips
npm run codex:post-pull -- --agent ui-bot      # isolate failure tracking per Codex agent
npm run codex:post-pull -- --no-shared-cache   # ignore shared install caches for this run
```

Available flags mirror the helper's usage (`--no-install`, `--no-sync`,
`--no-env-check`, `--build-optional`, etc.). See
`scripts/codex-workflow.js --help` for the full reference, and read
`docs/codex_cli_workflow.md` for a deeper walkthrough of recommended flows.

Assigning an `--agent` name (or exporting `CODEX_AGENT_ID`) keeps failure
history scoped to that agent while still sharing successes with the rest of the
team. The helper fingerprints `package-lock.json` so multiple agents can reuse a
single `npm install` run; pass `--no-shared-cache` if you need to force a fresh
install. The helper remembers which steps failed recently so it can surface
troubleshooting tips the next time you run it. If you want to start fresh,
pass `--reset-issues` to clear that history before executing tasks.

When a command fails, the helper now scans the error output for familiar
patterns (missing package scripts, `MODULE_NOT_FOUND` errors, `ENOENT` paths,
etc.) and prints actionable fixes—like re-creating Codex-exported scripts or
running `npm install` for a missing dependency—so new issues can be resolved
without digging through logs.

Note: for OCR parsing, send an actual Telegram image to the bot; OCR runs only
on images.

## Running with Docker

1. **Build the image**

   ```bash
   DOCKER_BUILDKIT=1 docker build -f docker/Dockerfile -t dynamic-chatty-bot .
   ```

   BuildKit enables caching of Next.js build artifacts. For non-Docker CI,
   cache the `apps/web/.next/cache` directory between runs to speed up builds.
   GitHub Actions uses `actions/cache` with a key derived from `package-lock.json`
   and `apps/web/package.json`:

   ```yaml
   - uses: actions/cache@v3
     with:
       path: apps/web/.next/cache
       key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json', 'apps/web/package.json') }}
   ```

2. **Run the container**

   ```bash
   docker run -p 8080:8080 --env-file .env.local dynamic-chatty-bot
   # or start via Compose with three app replicas
   docker compose up --scale app=3
   ```

3. **Override configuration** using `-e` flags, `--env-file`, or custom `.env`
   files to set `NEXT_PUBLIC_*` or other variables.

4. **Run tests or Supabase functions** within the container:

   ```bash
   docker run --rm dynamic-chatty-bot npm test
   docker run --rm dynamic-chatty-bot npm run serve:functions
   ```

5. **Health check replicas**

   ```bash
   ./docker/healthcheck.sh
   ```

6. **Troubleshooting**
   - If ports like `8080` or `54321` are taken, adjust `-p` mappings or stop the
     conflicting service.
   - Ensure required environment variables are present; missing values may cause
     runtime errors.

## Mini App

- Set `MINI_APP_URL` in env (example domain only, do not hardcode).
- Launch via Web App button inside Telegram.
- All UI images should be 1:1 (square).

## VIP Sync

- Bot must be an admin in VIP channels to receive membership updates and call
  `getChatMember`.
- Configure VIP channels via `bot_settings.vip_channels` (JSON array) or env
  `VIP_CHANNELS`.
- Memberships are synced on join/leave events and via `/vip-sync` helper
  endpoints.
- Use `scripts/import-vip-csv.ts` for bulk backfills; users must `/start` the
  bot at least once.

## CI / checks

All Deno tasks live in `deno.json` and can be run via `deno task <name>`.

Type check:

```bash
deno check --allow-import supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
```

If tests present:

```bash
deno test -A
```

## Go Service

A minimal Go HTTP server lives in `go-service/` and exposes a `/healthz` endpoint on port `8080`.

### Build and run

```bash
cd go-service
go run main.go
# or build
go build
./go-service
```

### Docker

```bash
docker build -f docker/go.Dockerfile -t go-service .
docker run --rm -p 8080:8080 go-service
```

## Smoke checks

```bash
curl -s https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/version
curl -s https://qeejuomcapbdlhnjqjcc.functions.supabase.co/telegram-bot/version
curl -s -X POST https://qeejuomcapbdlhnjqjcc.functions.supabase.co/telegram-bot \
  -H 'x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>' \
  -H 'content-type: application/json' -d '{"test":"ping"}'
```

## Local webhook testing

Run Edge Functions locally without JWT verification to exercise webhooks:

```bash
npm run serve:functions
```

Then POST to `http://localhost:54321/functions/v1/telegram-webhook` with
`X-Telegram-Bot-Api-Secret-Token`.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environment vars, tests,
deployment, and troubleshooting.
For Nginx + Let's Encrypt on DuckDNS, see [docs/DUCKDNS_NGINX_CERTBOT.md](docs/DUCKDNS_NGINX_CERTBOT.md).

Set your Supabase project reference for the deploy scripts:

```bash
export PROJECT_REF=<your-project-ref>
```

The commands `npm run deploy:edge`, `npm run edge:deploy:core`, and
`npm run edge:deploy:ops` will read this variable when deploying functions.

Deploy a single function manually:

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
- [Using Personal Access Tokens](docs/GITHUB_PAT.md) for pushes and workflow
  auth

## Hybrid Development Workflow

For a combined approach that keeps production on DigitalOcean while iterating
with Lovable and local tooling, see
[docs/HYBRID_DEVELOPMENT_WORKFLOW.md](docs/HYBRID_DEVELOPMENT_WORKFLOW.md).
It covers prototyping in Lovable, exporting via the Codex CLI, local testing,
and syncing changes through GitHub to maintain a seamless deployment pipeline.

## License / contributions

Proprietary / All rights reserved. Review the root [`LICENSE`](LICENSE) file for
usage terms and [`docs/legal/THIRD_PARTY_LICENSES.md`](docs/legal/THIRD_PARTY_LICENSES.md)
for attribution of bundled open-source components. Personal project; external
PRs/issues are closed by default.

## Notes

Repo keeps source only. No caches (.cas), dist/, or node_modules/ are committed.

Future changes may encrypt code and increase env usage; see
[docs/agent.md](docs/agent.md) for behavior spec and Lovable Codex integration
details.
