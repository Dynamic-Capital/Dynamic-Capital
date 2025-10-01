# Networking

This project relies on a Next.js service and Supabase Edge Functions. Use the
following guidance to expose the services and control access.

## DNS and domains

- Point your domain's A/AAAA records to the host running the Next.js service or
  reverse proxy.
- Create `www` and `api` CNAME records that resolve to that host so the frontend
  and backend share the same runtime endpoint.
- Set `DOMAIN` in your `.env` to the root zone (e.g. `example.com`) for helper
  scripts and Nginx templates.
- Update `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the canonical site URL, and
  adjust `NEXT_PUBLIC_API_URL` if using an API subdomain.
- `ALLOWED_ORIGINS` should list the site and API origins so browsers can call
  the endpoints.
- `dynamic-capital.ondigitalocean.app` is the canonical production domain. Both
  `dynamic-capital.vercel.app` and `dynamic-capital.lovable.app` stay exported
  in the DNS snapshots under `dns/` (see
  [`dns/dynamic-capital.ondigitalocean.app.zone`](../dns/dynamic-capital.ondigitalocean.app.zone)
  for the previous DigitalOcean export and
  [`dns/dynamic-capital.lovable.app.json`](../dns/dynamic-capital.lovable.app.json)
  for the Lovable zone) so every host can participate in load sharing while
  pointing at the same Cloudflare anycast IPs (162.159.140.98 and 172.66.0.96).
- `dynamiccapital.ton` and `www.dynamiccapital.ton` are configured for TON DNS
  blockchain-based resolution (see
  [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) for
  configuration). TON DNS requires registration through TON DNS marketplace and
  resolver contract deployment.
- Run `deno run -A scripts/configure-digitalocean-dns.ts --dry-run` to inspect
  the planned DNS state for `dynamic-capital.lovable.app`. Remove `--dry-run`
  once the plan looks correct to apply changes through `doctl`. The script keeps
  the Dynamic-managed zone aligned with the shared Cloudflare front door by
  replaying the records from
  [`dns/dynamic-capital.lovable.app.json`](../dns/dynamic-capital.lovable.app.json).

## Public static ingress IPs

Cloudflare terminates TLS for the production hosts and forwards requests to the
Next.js service running on port `8080`. When you need to allowlist ingress or
recreate DNS records, use the anycast A records published for the app:

- `162.159.140.98`
- `172.66.0.96`

## Environment variables

- Copy `.env.example` to `.env` and `.env.local`, then fill in credentials.
- `ALLOWED_ORIGINS` defines a comma-separated list of domains allowed to call
  the API and edge functions. If unset, it falls back to `SITE_URL` (or
  `http://localhost:3000` when `SITE_URL` is missing).

## Exposing the app

- Run the app in Docker (or similar) and map the container's port `8080` to your
  host.
- If you host a static site separately, forward `/api/*` requests to the Next.js
  service. Example Nginx rule:

```nginx
location /api/ {
  proxy_pass http://localhost:8080;
  proxy_set_header Host $host;
}
```

## Cloudflare ingress

Traffic routed through Cloudflare may arrive from public IPs such as
`162.159.140.98` or `172.66.0.96`. Set your web app domain's A records to these
IPs and let Cloudflare proxy requests to the service running on port `8080`.

## Origin alignment across platforms

- The DigitalOcean App Platform spec keeps ingress open so
  `dynamic-capital.ondigitalocean.app`, `dynamic-capital.vercel.app`, and
  `dynamic-capital.lovable.app` all route to the same service while the app
  publishes DigitalOcean-hosted links.
- `supabase/config.toml` now sets `site_url`, `additional_redirect_urls`, and
  the Supabase Functions env block to the DigitalOcean origin while allowlisting
  the Dynamic and Vercel hosts for cross-domain API calls.
- `vercel.json` and the Dynamic scripts default to the DigitalOcean domain but
  expose the full allow list so alternate hosts continue to work without
  additional overrides.
- `lovable-build.js` and `lovable-dev.js` hydrate `SITE_URL`,
  `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, and `MINIAPP_ORIGIN` before running
  Dynamic workflows so previews and builds share the production origin when
  values are omitted, with `ALLOWED_ORIGINS` defaulting to the combined host
  list.

## Outbound connectivity

Ensure the runtime can reach external services like Supabase over HTTPS
(`*.supabase.co`). Adjust firewall or egress rules as needed.
