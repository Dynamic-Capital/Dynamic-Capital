# HTTPS Gateway Verification – 2025-10-08

## Summary
- Follow-up probes still return HTTP 503 from both gateways, indicating the DigitalOcean origin has not been fully restored.
- Capture the failing responses below so the verification block in `dns/dynamiccapital.ton.json` remains in an error state until the bundle is republished.

## Checks Performed
1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - 16:28 UTC: Initial edge handshake returns `HTTP/1.1 200`, but the upstream responds `HTTP/1.1 503 Service Unavailable`.
2. `curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - 16:28 UTC: Mirrors the same `HTTP/1.1 503 Service Unavailable` response.
3. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - 16:31 UTC: `HTTP/1.1 404 Not Found`; origin responds with 404 for the TON bundle path, which cascades to the gateways as 503.

## Remediation Notes
- Rebuild and redeploy the TON Site bundle to `dynamic-capital-qazf2.ondigitalocean.app`, confirm the `/dynamiccapital.ton` path returns `HTTP 200`, then re-run the checks above before updating the resolver verification block.

## Quick Status Command

Use the existing tooling to poll all configured gateways:

```bash
npm run ton:site-status -- --domain dynamiccapital.ton --gateways "https://ton-gateway.dynamic-capital.ondigitalocean.app,https://ton-gateway.dynamic-capital.lovable.app"
```

The command summarises which gateways respond successfully and surfaces HTTP status codes for follow-up triage.
