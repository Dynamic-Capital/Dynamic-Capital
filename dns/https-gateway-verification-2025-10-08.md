# HTTPS Gateway Verification – 2025-10-08

## Summary
- Validated both published reverse proxy endpoints for `dynamiccapital.ton` over HTTPS.
- Each gateway completed TLS negotiation but Envoy returned HTTP 503, indicating the TON Site origin is currently unreachable from the proxies.

## Checks Performed
1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - Result: `HTTP/1.1 503 Service Unavailable` after Envoy handshake.
2. `curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - Result: `HTTP/1.1 503 Service Unavailable`.
3. Repeated with trailing slash and `Host: dynamiccapital.ton` header to rule out routing edge cases; responses remained HTTP 503 from Envoy.

## Follow-Up Actions
- Restore the TON Site origin that serves `dynamiccapital.ton` so the reverse proxies can forward traffic successfully.
- After remediation, rerun the curl checks and update `dns/dynamiccapital.ton.json` with a fresh `checked_at` timestamp and status.
