# Deployment & Troubleshooting

## Environment variables

Essential settings for the bot and Edge Functions. See [env.md](env.md) for a
full list and usage notes. For DuckDNS + Nginx with automatic HTTPS, see
[DUCKDNS_NGINX_CERTBOT.md](DUCKDNS_NGINX_CERTBOT.md).

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_IDS` (optional)
- `MINI_APP_URL` or `MINI_APP_SHORT_NAME` (optional)

When deploying on DigitalOcean App Platform, configure these variables under
**App Settings → Environment Variables** so the runtime can reach Supabase.
Include your database connection string or anon key as needed:

- `SUPABASE_ANON_KEY`
- `DATABASE_URL` (connection string)

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
deno check supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
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
