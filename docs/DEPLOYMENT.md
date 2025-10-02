# Deployment & Troubleshooting

## Environment variables

Essential settings for the bot and Edge Functions. See [env.md](env.md) for a
full list and usage notes. For DuckDNS + Nginx with automatic HTTPS, see
[DUCKDNS_NGINX_CERTBOT.md](DUCKDNS_NGINX_CERTBOT.md).

The DigitalOcean App Platform spec used to provision the production app lives at
[`.do/app.yml`](../.do/app.yml). Keep the spec in sync with any component or
environment changes described in this document so the repository remains a
single source of truth for deployments. The checked-in spec provisions a single
Node.js service named `dynamic-capital`, configures `dynamiccapital.ton` as the
primary domain (served via Cloudflare + TON DNS) while registering the Vercel,
Lovable, and DigitalOcean hosts as aliases, and leaves ingress open so every
hostname continues to route traffic. The service runs
`node scripts/digitalocean-build.mjs` from the repository root before starting
the Next.js server via `npm run start:web`. Requests are served on port `8080`,
and the runtime sets `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, and
`MINIAPP_ORIGIN` to `https://dynamiccapital.ton` (while allowlisting the
companion hosts) so the web app, Supabase Edge Functions, and Telegram mini-app
verification report the TON-backed canonical origin. Update those values if you
move to a different hostname. The custom build helper first runs the standard
`npm run build` pipeline and then uploads the refreshed `_static/` snapshot to
the configured DigitalOcean Spaces bucket when credentials are present, keeping
the marketing CDN in sync with each deployment.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_IDS` (optional)
- `MINI_APP_URL` or `MINI_APP_SHORT_NAME` (optional)
- `MINIAPP_ORIGIN` (comma-separated allow list for Supabase Edge Functions;
  defaults to the production origin)

When deploying on DigitalOcean App Platform, configure these variables under
**App Settings → Environment Variables** so the runtime can reach Supabase.
Include your database connection string or anon key as needed:

- `SUPABASE_ANON_KEY`
- `DATABASE_URL` (connection string)
- `SITE_URL` (base URL of your deployment)
- `ALLOWED_ORIGINS` (comma-separated list of hosts allowed by CORS)
- `MINIAPP_ORIGIN` (canonical host(s) allowed to call `verify-telegram`)

## DNS for App Platform

DigitalOcean provisions the `dynamic-capital.ondigitalocean.app` domain. Export
the zone file into `dns/` (use
[`dns/dynamic-capital.ondigitalocean.app.zone`](../dns/dynamic-capital.ondigitalocean.app.zone)
as the previous reference) so the required NS and A records (162.159.140.98 and
172.66.0.96) are versioned alongside the codebase. Use the updated export if you
need to rehydrate the fallback host while keeping Cloudflare in front of the
service. Production traffic now targets `dynamiccapital.ton`, with
`dynamic-capital.ondigitalocean.app`, `dynamic-capital.vercel.app`, and
`dynamic-capital.lovable.app` staying active for load sharing. The helper
`configure-digitalocean-dns.ts` script keeps the DigitalOcean zone aligned with
the expected records:

```bash
# Preview the proposed DNS mutations
deno run -A scripts/configure-digitalocean-dns.ts --dry-run
# Append --context <name> to target a specific authenticated doctl context.

# Apply the plan via doctl (requires an authenticated doctl session)
deno run -A scripts/configure-digitalocean-dns.ts
```

### Reconcile the site URL and zone records with `doctl`

The repository ships with `scripts/doctl/sync-site-config.mjs` to patch the App
Platform spec when `SITE_URL` (and related variables) drift or the primary
domain is missing. The helper script also replays the exported zone file so the
DigitalOcean-managed primary domain (`dynamic-capital.ondigitalocean.app`) stays
aligned with Cloudflare while normalizing environment variables on the app
itself along with any services, static sites, workers, jobs, and functions
declared in the spec.

Example usage:

Set `DOCTL_CONTEXT` to the `doctl` context you authenticated (omit the flag if
you only use the default context):

```bash
# Update the app spec, aligning env vars, ingress, and primary domain.
node scripts/doctl/sync-site-config.mjs \
  --app-id $DIGITALOCEAN_APP_ID \
  --site-url https://dynamiccapital.ton \
  --zone dynamic-capital.ondigitalocean.app \
  --spec .do/app.yml \
  --output .do/app.yml \
  --context $DOCTL_CONTEXT \
  --show-spec

# Apply the spec changes and import the DNS zone in one go.
node scripts/doctl/sync-site-config.mjs \
  --app-id $DIGITALOCEAN_APP_ID \
  --site-url https://dynamiccapital.ton \
  --zone dynamic-capital.ondigitalocean.app \
  --context $DOCTL_CONTEXT \
  --apply \
  --apply-zone
```

Flags:

- `--app-id` – App Platform UUID (`doctl apps list`).
- `--site-url` – Canonical host for the deployment. The script updates
  `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, and `MINIAPP_ORIGIN`
  globally, on the `dynamic-capital` service, and on any static site components.
- `--context` – doctl context to run commands against (defaults to the active
  context).
- `--zone` – DNS zone to import. Defaults to the site URL host.
- `--spec` – Load an app spec from a local YAML file (for example
  `.do/app.yml`). Combine with `--output` to rewrite the file after
  normalization.
- `--zone-file` – Override the zone file path (defaults to `dns/<zone>.zone`).
- `--apply` / `--apply-zone` – Push changes via `doctl` instead of running a dry
  run.

Use `npm run doctl:sync-site -- --help` to see all available options.

When the DigitalOcean CLI is unavailable (for example in CI pipelines), the
repository now also ships `scripts/digitalocean/sync-site-config.mjs`, which
talks directly to the DigitalOcean REST API. Provide an API token via `--token`
or the `DIGITALOCEAN_TOKEN` environment variable:

```bash
# Fetch, normalize, and optionally write the spec without applying.
node scripts/digitalocean/sync-site-config.mjs \
  --app-id $DIGITALOCEAN_APP_ID \
  --site-url https://dynamiccapital.ton \
  --token $DIGITALOCEAN_TOKEN \
  --output .do/app.yml \
  --show-spec

# Push the rendered spec back to DigitalOcean via the REST API.
node scripts/digitalocean/sync-site-config.mjs \
  --app-id $DIGITALOCEAN_APP_ID \
  --site-url https://dynamiccapital.ton \
  --token $DIGITALOCEAN_TOKEN \
  --apply
```

The API-powered helper shares flags with the `doctl` variant (including
`--spec`, `--allowed-origins`, `--domain`, and `--zone`) so workflows can swap
between them without additional changes. Run `npm run do:sync-site -- --help`
for the full list of options.

### CDN configuration for DigitalOcean Spaces

Static assets are uploaded to DigitalOcean Spaces by `scripts/upload-assets.js`.
When deploying on App Platform, set these variables under **App Settings →
Environment Variables** so the build can authenticate:

- `CDN_BUCKET` – Spaces bucket name
- `CDN_REGION` – Region slug (e.g. `nyc3`)
- `CDN_ACCESS_KEY` – Spaces API key
- `CDN_SECRET_KEY` – Spaces API secret
- `CDN_ENDPOINT` – Optional override for the Spaces API host. Leave unset when
  using a custom CDN domain; the uploader now detects non-Spaces hosts and falls
  back to `<region>.digitaloceanspaces.com` so uploads succeed.

Manage the CDN endpoint for the bucket using the REST helper:

```bash
# Preview the desired configuration (dry run)
npm run do:sync-cdn -- \
  --space "$CDN_BUCKET" \
  --region "$CDN_REGION" \
  --custom-domain static.example.com

# Create or update the endpoint
npm run do:sync-cdn -- \
  --space "$CDN_BUCKET" \
  --region "$CDN_REGION" \
  --custom-domain static.example.com \
  --certificate-id <managed-cert-id> \
  --apply
```

Provide a DigitalOcean API token via `--token` or `DIGITALOCEAN_TOKEN`. Use
`--show-endpoint` to print the resolved CDN endpoint ID after a dry run or
apply; this value powers automated cache purges.

#### Automated cache purge via API

Set these optional variables to trigger a CDN purge after each asset upload:

- `DIGITALOCEAN_TOKEN` – API token with write access to the CDN endpoint
- `CDN_ENDPOINT_ID` – Target CDN endpoint identifier (available from
  `npm run do:sync-cdn -- --show-endpoint` or `doctl cdn endpoints list`)
- `CDN_PURGE_PATHS` – Comma-separated list of paths to invalidate (for example,
  `/index.html,/` or `*`)

When all three are present, `npm run upload-assets` calls the DigitalOcean API
to purge cached files once the new snapshot lands in Spaces. Missing values skip
the purge but do not block the upload. Tailor the path list to include un-hashed
assets that should refresh immediately, like the landing page HTML or sitemap.

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

Configure the App Platform component to run the project build before serving the
app:

```
Build command: npm run build
Run command: npm run start:web
```

`.do/app.yml` includes these commands so automated deploys stay in sync with
local expectations. Update both the spec and this section if the build or
runtime command changes.

The `SITE_URL` variable must match your public domain, e.g.
`https://dynamiccapital.ton`, and `ALLOWED_ORIGINS` should include the Dynamic
and Vercel hosts if you continue to share load across them.

## Deployment logs

The App Platform UI may sometimes display "Deploy logs are not available" after
a build. Fetch logs using
`doctl apps logs <app-id> <component-name> --type build` or the
[DigitalOcean API](DIGITALOCEAN_APP_LOGS.md#automation) to diagnose failed
deployments. See [DigitalOcean App Logs](DIGITALOCEAN_APP_LOGS.md) for more
examples.

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

Enable caching for assets in the `static` directory and use a CDN when possible.
Recommended headers:

```
Cache-Control: public, max-age=31536000, immutable
```

for hashed assets, and a short `max-age` for `index.html`. Ensure your host or
CDN honors these headers and caches static content at the edge.

## Test commands

Run basic checks before deploying:

```bash
deno check --allow-import supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts
deno test -A
node scripts/assert-miniapp-bundle.mjs
```

The bundle check above fails if `supabase/functions/miniapp/static/index.html`
is missing or unexpectedly small, and deployment should be halted until the
issue is resolved.

## Deployment steps

1. Deploy the function:

```bash
supabase functions deploy telegram-bot --project-ref <PROJECT_REF>
```

2. Set the Telegram webhook with the secret token:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=${TELEGRAM_WEBHOOK_URL:-https://<PROJECT_REF>.functions.supabase.co/telegram-bot}" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

> If you have configured `TELEGRAM_WEBHOOK_URL`, use it directly instead of the
> Supabase-generated host.

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

Enable
[DigitalOcean Monitoring](https://docs.digitalocean.com/products/monitoring/)
for both the App Platform app and the Supabase project to track CPU, memory, and
request metrics. Configure alert policies for critical thresholds.

Scale horizontally by adjusting the App Platform instance count or, for
Kubernetes deployments, adding additional node pools in your DOKS cluster.
