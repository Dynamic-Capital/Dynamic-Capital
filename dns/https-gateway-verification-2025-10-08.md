# HTTPS Gateway Verification – 2025-10-08

## Summary
- Latest verification at 2025-10-10 16:41 UTC recorded HTTP 503 responses from both HTTPS gateways when requesting `/dynamiccapital.ton`.
- The DigitalOcean origin `dynamic-capital-qazf2.ondigitalocean.app` is serving HTTP 404, explaining the gateway failures.
- Resolver verification must remain in `error` until the TON bundle is redeployed and the gateways return HTTP 200 again.

## Checks Performed
1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - Response shows an Envoy 200 preface followed by the upstream failure:
     ```
     HTTP/1.1 200 OK
     date: Wed, 08 Oct 2025 16:41:43 GMT
     server: envoy

     HTTP/1.1 503 Service Unavailable
     content-length: 22
     content-type: text/plain
     date: Wed, 08 Oct 2025 16:41:43 GMT
     server: envoy
     ```
   - A follow-up `curl -s -o /tmp/output.html -w '%{http_code}\n' …` returned `503`.
2. `curl -s -o /tmp/output2.html -w '%{http_code}\n' https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - Returned `503`, matching the primary gateway failure.
3. `curl -s -o /tmp/output3.html -w '%{http_code}\n' https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Returned `404`, confirming the upstream origin no longer exposes the TON site bundle.

## Remediation Notes
- Redeploy the TON Site bundle to `dynamic-capital-qazf2.ondigitalocean.app` (or the new origin) so `/dynamiccapital.ton` responds with `HTTP 200` before retrying the HTTPS bridge checks.
- Once the origin serves content, re-run the gateway probes above and update the resolver verification block when both return `HTTP 200`.

## Quick Status Command

Use the existing tooling to poll all configured gateways:

```bash
npm run ton:site-status -- --domain dynamiccapital.ton --gateways "https://ton-gateway.dynamic-capital.ondigitalocean.app,https://ton-gateway.dynamic-capital.lovable.app"
```

The command summarises which gateways respond successfully and surfaces HTTP status codes for follow-up triage.
