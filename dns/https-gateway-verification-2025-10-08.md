# HTTPS Gateway Verification – 2025-10-08

## Summary
- Redeployed the Dynamic Capital TON Site bundle to `https://dynamic-capital-qazf2.ondigitalocean.app/`.
- Both HTTPS gateways now proxy the refreshed origin and return HTTP 200.
- Captured verification output below to support updating `dns/dynamiccapital.ton.json`.

## Checks Performed
1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - 15:16 UTC: `HTTP/1.1 200 OK`; gateway serves TON bundle headers from the redeployed origin.
2. `curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - 15:17 UTC: `HTTP/1.1 200 OK`; fallback mirrors the healthy response.
3. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/`
   - 15:17 UTC: `HTTP/2 200`; direct origin access confirms the site bundle is restored.

## Remediation Notes
- None. Maintain monitoring cadence and document any future regressions alongside resolver updates.
