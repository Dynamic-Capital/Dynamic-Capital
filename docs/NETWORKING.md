# Networking

This project relies on a Next.js service and Supabase Edge Functions. Use the following guidance to expose the services and control access.

## Environment variables
- Copy `.env.example` to `.env.local` and fill in credentials.
- `ALLOWED_ORIGINS` defines a comma-separated list of domains allowed to call the API and edge functions.

## Exposing the app
- Run the app in Docker (or similar) and map the container's port `3000` to your host.
- If you host a static site separately, forward `/api/*` requests to the Next.js service. Example Nginx rule:

```nginx
location /api/ {
  proxy_pass http://localhost:3000;
  proxy_set_header Host $host;
}
```

## Cloudflare ingress
Traffic routed through Cloudflare may arrive from public IPs such as `162.159.140.98` or `172.66.0.96`. Point your DNS to Cloudflare and let it proxy requests to the service running on port `3000`.

## Outbound connectivity
Ensure the runtime can reach external services like Supabase over HTTPS (`*.supabase.co`). Adjust firewall or egress rules as needed.
