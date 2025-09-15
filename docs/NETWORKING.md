# Networking

This project relies on a Next.js service and Supabase Edge Functions. Use the following guidance to expose the services and control access.

## DNS and domains
- Point your domain's A/AAAA records to the host running the Next.js service or reverse proxy.
- Create `www` and `api` CNAME records that resolve to that host so the frontend and backend share the same runtime endpoint.
- Set `DOMAIN` in your `.env` to the root zone (e.g. `example.com`) for helper scripts and Nginx templates.
- Update `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the canonical site URL, and adjust `NEXT_PUBLIC_API_URL` if using an API subdomain.
- `ALLOWED_ORIGINS` should list the site and API origins so browsers can call the endpoints.

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

## Outbound connectivity
Ensure the runtime can reach external services like Supabase over HTTPS (`*.supabase.co`). Adjust firewall or egress rules as needed.
