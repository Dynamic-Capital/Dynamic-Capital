# Deployment & Troubleshooting

## Environment variables

Essential settings for the bot and Edge Functions. See [env.md](env.md) for a
full list and usage notes. For DuckDNS + Nginx with automatic HTTPS, see
[DUCKDNS_NGINX_CERTBOT.md](DUCKDNS_NGINX_CERTBOT.md).

The DigitalOcean App Platform spec used to provision the production app lives
at [`.do/app.yml`](../.do/app.yml). Keep the spec in sync with any component or
environment changes described in this document so the repository remains a
single source of truth for deployments. The checked-in spec provisions a single
Node.js service named `dynamic-capital`, configures the
`dynamic-capital.lovable.app` domain with ingress, pins the load balancer rule
to that authority, and runs `npm run build` from the repository root before
starting the Next.js server via `npm run start:web`. Requests are served on port
`8080`, and the service sets `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`,
and `MINIAPP_ORIGIN` to `https://dynamic-capital.lovable.app` so the web app,
Supabase Edge Functions, and Telegram mini-app verification report the same
origin. Update those values if you move to a different hostname.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_IDS` (optional)
- `MINI_APP_URL` or `MINI_APP_SHORT_NAME` (optional)
- `MINIAPP_ORIGIN` (comma-separated allow list for Supabase Edge Functions; defaults
  to the production origin)

When deploying on DigitalOcean App Platform, configure these variables under
**App Settings → Environment Variables** so the runtime can reach Supabase.
Include your database connection string or anon key as needed:

- `SUPABASE_ANON_KEY`
- `DATABASE_URL` (connection string)
- `SITE_URL` (base URL of your deployment)
- `ALLOWED_ORIGINS` (comma-separated list of hosts allowed by CORS)
- `MINIAPP_ORIGIN` (canonical host(s) allowed to call `verify-telegram`)

## DNS for App Platform

DigitalOcean still provisions a default `dynamic-capital.ondigitalocean.app`
domain. Its exported zone file lives in
[`dns/dynamic-capital.ondigitalocean.app.zone`](../dns/dynamic-capital.ondigitalocean.app.zone)
and captures the required NS and A records (162.159.140.98 and 172.66.0.96).
Use that file if you need to rehydrate the fallback host while keeping
Cloudflare in front of the service. Production traffic should target
`dynamic-capital.lovable.app` once the Lovable domain is live. The helper
`configure-digitalocean-dns.ts` script keeps the Lovable domain aligned with the
expected records:

```bash
# Preview the proposed DNS mutations
deno run -A scripts/configure-digitalocean-dns.ts --dry-run

# Apply the plan via doctl (requires an authenticated doctl session)
deno run -A scripts/configure-digitalocean-dns.ts
```

### CDN configuration for DigitalOcean Spaces

Static assets are uploaded to DigitalOcean Spaces by `scripts/upload-assets.js`.
When deploying on App Platform, set these variables under **App Settings → Environment
Variables** so the build can authenticate:

- `CDN_BUCKET` – Spaces bucket name
- `CDN_REGION` – Region slug (e.g. `nyc3`)
- `CDN_ACCESS_KEY` – Spaces API key
- `CDN_SECRET_KEY` – Spaces API secret

Verify that credentials work with `doctl`:

```bash
doctl auth init --access-token $DIGITALOCEAN_TOKEN
doctl spaces list | grep "$CDN_BUCKET"
doctl spaces object list $CDN_BUCKET --region $CDN_REGION | head
```

## Connectivity validation

Verify the app can reach Supabase before deploying or scaling out. Run a simple
ping and the scripted check locally or as a predeploy step:

```bash
curl -i "$SUPABASE_URL"
deno run -A scripts/check-supabase-connectivity.ts
```

If either command fails, DigitalOcean may be blocking outbound traffic. Ensure
egress rules permit HTTPS requests to `*.supabase.co` and increase timeouts if
requests are dropped under load. Add retries with exponential backoff in your
pipeline or contact Supabase support if connectivity issues persist.

## DigitalOcean build and run commands

Configure the App Platform component to run the project build before serving the app:

```
Build command: npm run build
Run command: npm run start:web
```

`.do/app.yml` includes these commands so automated deploys stay in
sync with local expectations. Update both the spec and this section if the
build or runtime command changes.

The `SITE_URL` variable must match your public domain, e.g.
`https://dynamic-capital.lovable.app`.

## Deployment logs

The App Platform UI may sometimes display "Deploy logs are not available" after
a build. Fetch logs using `doctl apps logs <app-id> <component-name> --type build`
or the [DigitalOcean API](DIGITALOCEAN_APP_LOGS.md#automation) to diagnose
failed deployments. See [DigitalOcean App Logs](DIGITALOCEAN_APP_LOGS.md) for
more examples.

## API Routing

When deploying a static landing page alongside Next.js API routes, forward
`/api/*` traffic from the static host to the Next.js service. This keeps both
components on the same domain and avoids CORS issues.

Example nginx rule:

```nginx
location /api/ {
  proxy_pass http://localhost:8080;
  proxy_set_header Host $host;
}
```

Adjust the upstream target for your hosting platform or reverse proxy.

## Performance

Enable caching for assets in the `static` directory and use a CDN when
possible. Recommended headers:

```
Cache-Control: public, max-age=31536000, immutable
```

for hashed assets, and a short `max-age` for `index.html`. Ensure your host
or CDN honors these headers and caches static content at the edge.

## Test commands

Run basic checks before deploying:

```bash
deno check --allow-import supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
deno test -A
node scripts/assert-miniapp-bundle.mjs
```

The bundle check above fails if `supabase/functions/miniapp/static/index.html` is
missing or unexpectedly small, and deployment should be halted until the issue
is resolved.

## Deployment steps

1. Deploy the function:

```bash
supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
```

2. Set the Telegram webhook with the secret token:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<PROJECT_REF>.functions.supabase.co/telegram-bot" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

### Secret-token validation

- Telegram echoes the `secret_token` as `X-Telegram-Bot-Api-Secret-Token` on
  each webhook call.
- The Edge function compares this header to `TELEGRAM_WEBHOOK_SECRET` and
  returns `401` on mismatch.
- See [Telegram setWebhook docs](https://core.telegram.org/bots/api#setwebhook)
  for details.

## Troubleshooting

### Resetting bot token

1. Regenerate the token via BotFather (`/token`).
2. Update the secret used by Edge Functions:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<new token>
```

3. Confirm the value:

```bash
supabase secrets get TELEGRAM_BOT_TOKEN
```

4. Redeploy the function so it picks up the new token (see below).

### Redeploying Edge Functions

If updates or new secrets are not reflected, redeploy:

```bash
supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
```

Ensure the webhook still points to the current deployment and rerun tests after
redeploying.

## Monitoring and scaling

Enable [DigitalOcean Monitoring](https://docs.digitalocean.com/products/monitoring/)
for both the App Platform app and the Supabase project to track CPU, memory,
and request metrics. Configure alert policies for critical thresholds.

Scale horizontally by adjusting the App Platform instance count or, for
Kubernetes deployments, adding additional node pools in your DOKS cluster.
