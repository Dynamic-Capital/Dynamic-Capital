# TON Site reverse proxy

This Supabase Edge Function exposes a CORS-friendly reverse proxy for TON Site
content. Requests to `/functions/v1/ton-site-proxy/*` stream assets from the
configured TON gateways while applying cache headers and automatic fallbacks
when a provider is unhealthy.

## Behaviour

- Supports `GET`, `HEAD`, and `OPTIONS` requests.
- Normalises the requested path and prevents traversal outside the configured
  TON Site base.
- Tries each gateway in order until one returns a non-retryable status. Network
  errors or HTTP status codes such as `408`, `429`, or any `5xx` trigger a
  fallback attempt.
- Adds the `x-ton-proxy-upstream` and `x-ton-proxy-attempts` headers so clients
  can observe which provider served the response.
- Sets a default cache policy of `public, max-age=180, stale-while-revalidate`
  unless the upstream response already specifies one.
- Exposes common response headers via `Access-Control-Expose-Headers` so
  browsers may read caching metadata.

## Environment variables

| Key                            | Description                                                       | Default                               |
| ------------------------------ | ----------------------------------------------------------------- | ------------------------------------- |
| `TON_SITE_PROXY_TARGETS`       | Comma or whitespace separated list of TON Site gateway base URLs. | `https://ton.site/dynamiccapital.ton` |
| `TON_SITE_PROXY_CACHE_SECONDS` | Override the cache max-age applied when the upstream omits it.    | `180`                                 |
| `TON_SITE_PROXY_TIMEOUT_MS`    | Per-request timeout before moving to the next gateway.            | `4500`                                |

All targets must include the full TON Site path (for example
`https://ton.site/dynamiccapital.ton`). Query strings and fragments are stripped
during normalisation.

## Example

```bash
curl -i "https://<project-ref>.functions.supabase.co/ton-site-proxy/icon.png"
```

If the primary gateway responds successfully the proxy forwards the body and
headers. When the first provider times out the function automatically retries
with the next configured target before returning a `502` error if all providers
fail.
