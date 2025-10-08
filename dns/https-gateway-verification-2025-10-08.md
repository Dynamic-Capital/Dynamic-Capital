# HTTPS Gateway Verification – 2025-10-08

## Summary
- Re-ran HTTPS validation for both reverse proxy endpoints and confirmed the outage persists.
- DigitalOcean still returns HTTP 503 because the upstream host `https://dynamic-capital-qazf2.ondigitalocean.app/` now emits HTTP 404.
- Lovable standby mirrors the failure, forwarding HTTP 503 as it tracks the same missing bundle.

## Checks Performed
1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - 12:22 UTC: `HTTP/1.1 503 Service Unavailable`; upstream still fails to return the TON bundle.
2. `curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - 12:22 UTC: `HTTP/1.1 503 Service Unavailable` mirroring the DigitalOcean outage.
3. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/`
   - 12:22 UTC: `HTTP/1.1 404 Not Found`; direct origin access confirms the missing site content.

## Remediation Notes
- Restore the Dynamic Capital TON Site bundle at `https://dynamic-capital-qazf2.ondigitalocean.app/` (or update gateway upstreams) so the proxies can serve content.
- Once the origin responds with HTTP 200, re-run the verification commands and update this log along with `dns/dynamiccapital.ton.json`.
