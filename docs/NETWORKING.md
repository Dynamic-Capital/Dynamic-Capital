# Networking

This project relies on a Next.js service and Supabase Edge Functions. Use the following guidance to expose the services and control access.

## DNS and domains
- Point your domain's A/AAAA records to the host running the Next.js service or reverse proxy.
- Create `www` and `api` CNAME records that resolve to that host so the frontend and backend share the same runtime endpoint.
- Set `DOMAIN` in your `.env` to the root zone (e.g. `example.com`) for helper scripts and Nginx templates.
- Update `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the canonical site URL, and adjust `NEXT_PUBLIC_API_URL` if using an API subdomain.
- `ALLOWED_ORIGINS` should list the site and API origins so browsers can call the endpoints.
- `dynamic-capital.lovable.app` is the canonical production domain. The legacy
  DigitalOcean default (`dynamic-capital.ondigitalocean.app`) remains exported in
  [`dns/dynamic-capital.ondigitalocean.app.zone`](../dns/dynamic-capital.ondigitalocean.app.zone)
  for reference so its NS and A records (162.159.140.98 and 172.66.0.96) can be
  restored if you ever need the fallback host.
- Run `deno run -A scripts/configure-digitalocean-dns.ts --dry-run` to inspect the
  planned DNS state for `dynamic-capital.lovable.app`. Remove `--dry-run` once the
  plan looks correct to apply changes through `doctl`. The script reads the desired
  records from [`dns/dynamic-capital.lovable.app.json`](../dns/dynamic-capital.lovable.app.json).

## Environment variables
- Copy `.env.example` to `.env.local` and fill in credentials.
- `ALLOWED_ORIGINS` defines a comma-separated list of domains allowed to call the API and edge functions. If unset, only `http://localhost:3000` is permitted.

## Exposing the app
- Run the app in Docker (or similar) and map the container's port `8080` to your host.
- If you host a static site separately, forward `/api/*` requests to the Next.js service. Example Nginx rule:

```nginx
location /api/ {
  proxy_pass http://localhost:8080;
  proxy_set_header Host $host;
}
```

## Cloudflare ingress
Traffic routed through Cloudflare may arrive from public IPs such as `162.159.140.98` or `172.66.0.96`. Set your web app domain's A records to these IPs and let Cloudflare proxy requests to the service running on port `8080`.

## Origin alignment across platforms
- The DigitalOcean App Platform spec pins the ingress authority to `dynamic-capital.lovable.app` so load balancers terminate TLS on the canonical host before forwarding traffic to port `8080`.
- `supabase/config.toml` sets `site_url`, `additional_redirect_urls`, and the Supabase Functions env block to the same origin so Edge Functions and Telegram verification enforce the correct allowlist.
- `vercel.json` declares the canonical origin as environment defaults and redirects any deployments back to `https://dynamic-capital.lovable.app` to avoid diverging hosts.
- `lovable-build.js` and `lovable-dev.js` hydrate `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, and `MINIAPP_ORIGIN` before running Lovable workflows so previews and builds share the production origin when values are omitted.

## Outbound connectivity
Ensure the runtime can reach external services like Supabase over HTTPS (`*.supabase.co`). Adjust firewall or egress rules as needed.
