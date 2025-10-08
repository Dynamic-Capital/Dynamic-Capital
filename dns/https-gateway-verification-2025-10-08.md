# HTTPS Gateway Verification – 2025-10-08

## Summary
- TON gateways now return HTTP 200 after redeploying the TON Site bundle to the DigitalOcean origin.
- Document the successful probes so the resolver verification block can be flipped back to `ok`.

## Checks Performed
1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - 11:44 UTC: Returns `HTTP/2 200` with `content-type: text/html; charset=utf-8`.
2. `curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - 11:45 UTC: Returns `HTTP/2 200` with matching headers.
3. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - 11:46 UTC: `HTTP/2 200`; confirms the redeployed origin is serving the TON bundle directly.

## Remediation Notes
- Redeployed the TON Site bundle to `dynamic-capital-qazf2.ondigitalocean.app`, confirmed `/dynamiccapital.ton` returns `HTTP 200`, and re-ran the checks above prior to updating the resolver verification block.

## Quick Status Command

Use the existing tooling to poll all configured gateways:

```bash
npm run ton:site-status -- --domain dynamiccapital.ton --gateways "https://ton-gateway.dynamic-capital.ondigitalocean.app,https://ton-gateway.dynamic-capital.lovable.app"
```

The command summarises which gateways respond successfully and surfaces HTTP status codes for follow-up triage.
