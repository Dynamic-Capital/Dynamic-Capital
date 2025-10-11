# HTTPS Gateway Verification – 2025-10-08

## Summary
- 2025-10-10 02:32 UTC verification confirms both HTTPS gateways return `HTTP 200` for `/dynamiccapital.ton`.
- Direct origin probe at `https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton` also returns `HTTP 200`, confirming the bundle is restored.
- Earlier 2025-10-10 16:41 UTC regression details remain below for historical context.

## 2025-10-11 01:44 UTC – Spot check

1. `curl -s -o /tmp/ton-gateway-ton-site.html -w '%{http_code}\n' https://ton.site/dynamiccapital.ton`
   - Response:
     ```
     200
     ```
2. `curl -s -o /tmp/ton-gateway-do.html -w '%{http_code}\n' https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Response:
     ```
     404
     ```
   - Indicates the DigitalOcean default domain no longer serves the TON bundle; redeploy before updating DNS.
3. `curl -s -o /tmp/ton-gateway-lovable.html -w '%{http_code}\n' https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - Response:
     ```
     503
     ```
   - Lovable proxy remains offline until the upstream origin is restored.

## 2025-10-10 02:32 UTC – Post-restoration verification

1. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Response:
     ```
     HTTP/1.1 200 OK
     date: Fri, 10 Oct 2025 02:32:02 GMT
     server: envoy
     content-type: text/html; charset=utf-8
     x-dynamic-ton-gateway: 1
     ```
2. `curl -I https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
   - Response:
     ```
     HTTP/1.1 200 OK
     date: Fri, 10 Oct 2025 02:32:02 GMT
     server: envoy
     content-type: text/html; charset=utf-8
     x-dynamic-ton-gateway: 1
     ```
3. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Response:
     ```
     HTTP/1.1 200 OK
     date: Fri, 10 Oct 2025 02:32:01 GMT
     server: envoy
     content-type: text/html; charset=utf-8
     ```

## 2025-10-10 16:41 UTC – Regression snapshot

The failure context is preserved for audit trails.

### Checks Performed
1. `curl -I https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
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
npm run ton:site-status -- --domain dynamiccapital.ton --gateways "https://dynamic-capital-qazf2.ondigitalocean.app,https://ton-gateway.dynamic-capital.lovable.app"
```

The command summarises which gateways respond successfully and surfaces HTTP status codes for follow-up triage.
