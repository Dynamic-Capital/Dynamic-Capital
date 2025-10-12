# Cross-Origin Resource Sharing (CORS)

## Overview

Cross-Origin Resource Sharing (CORS) is a browser security mechanism that lets a
web page loaded from one origin request resources that live on a different
origin while still enforcing the same-origin policy. Browsers consult a set of
CORS response headers from the target service to decide whether the request
should be allowed.

## Request Flow

1. **Simple requests** (e.g., `GET` with standard headers) are sent directly.
   The browser checks the `Access-Control-Allow-Origin` header on the response
   to decide if the content can be exposed to the calling page.
2. **Preflighted requests** (e.g., `POST`, `PUT`, or requests with custom
   headers) trigger an automatic `OPTIONS` request before the actual request.
   The server must respond with allowed methods, headers, and a matching origin
   before the browser proceeds.
3. **Credentialed requests** require the server to explicitly allow credentials
   and cannot use the wildcard `*` for the allowed origin value.

## Security Considerations

- **Validate origins**: Maintain an explicit allow list of trusted origins (for
  example, the `ALLOWED_ORIGINS` environment variable used throughout Dynamic
  Capital's API helpers). Responses should fall back to a safe default when the
  incoming origin is not recognized.
- **Limit methods and headers**: Only expose HTTP methods and custom headers
  that are required by the client application to reduce the attack surface.
- **Short-lived caching**: Set `Access-Control-Max-Age` conservatively so
  changes to the allow list propagate quickly if a domain is compromised.

## Implementation Tips

- Reuse shared HTTP helpers when possible. For example, the Supabase function
  utilities centralize CORS handling so all edge functions return consistent
  headers.
- Ensure local development servers default to `http://localhost:3000` so browser
  tooling can call APIs without additional configuration.
- Include automated tests for the preflight behavior to prevent regressions. The
  repository keeps Deno tests that assert allowed origins receive the expected
  headers.

## Troubleshooting Checklist

- Confirm the browser's network tab shows the expected CORS headers on both the
  preflight and main request.
- Verify infrastructure automation keeps the allowed origins list synchronized
  across environments and CDN edges.
- When adding a new domain, update deployment manifests, environment files, and
  monitoring endpoints to ensure end-to-end coverage.
