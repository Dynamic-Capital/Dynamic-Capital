# HTTPS Gateway Verification – 2025-10-08

## Summary
- 2025-10-12 15:16 UTC follow-up redeploy triggered via the DigitalOcean REST API after the `npm run do:sync-site` helper failed (sandbox `ENETUNREACH` on Node `fetch`); direct origin probes still return `HTTP 404`, indicating the TON bundle was not rebuilt.
- 2025-10-12 15:04 UTC manual redeploy triggered for `dynamic-capital-qazf2` via the DigitalOcean REST API; origin probe currently returns `HTTP 404` while propagation completes.
- 2025-10-10 02:32 UTC verification confirms both HTTPS gateways return `HTTP 200` for `/dynamiccapital.ton`.
- Direct origin probe at `https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton` also returns `HTTP 200`, confirming the bundle is restored.
- Earlier 2025-10-10 16:41 UTC regression details remain below for historical context.

## 2025-10-12 15:16 UTC – Follow-up redeploy and health checks

1. `npm run do:sync-site -- --app-id aead98a2-db66-41e0-a5af-43c063b1f61a --site-url https://dynamic-capital-qazf2.ondigitalocean.app --apply`
   - Result: `fetch failed` (Node `undici` surfaced `AggregateError [ENETUNREACH]` in the sandbox, blocking the helper from reaching `api.digitalocean.com`).
2. `curl -sS -X POST -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" -H "Content-Type: application/json" https://api.digitalocean.com/v2/apps/aead98a2-db66-41e0-a5af-43c063b1f61a/deployments`
   - Response excerpt records deployment `0f8b18ca-9077-43c3-9e46-c7ee5a97a3ae` entering `PENDING_BUILD` at `2025-10-12T15:15:59Z` and completing with phase `ACTIVE` after the follow-up poll.
3. `curl -sS -o /tmp/dyn-ton.html -w '%{http_code}\n' https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Returned `404` (TON bundle still absent on the DigitalOcean origin after redeploy).
4. `npm run ton:site-status -- --domain dynamiccapital.ton`
   - Result: fails for all gateways with `ENETUNREACH`/`ENOTFOUND` errors because outbound TON network access remains blocked in the sandbox; no live gateway checks completed.

## 2025-10-12 15:04 UTC – Manual redeploy snapshot

1. `curl -sS -X POST -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" -H "Content-Type: application/json" \`
   `https://api.digitalocean.com/v2/apps/aead98a2-db66-41e0-a5af-43c063b1f61a/deployments`
   - Response:
     ```
     {
       "deployment": {
         "id": "77b4843d-2d29-4dc9-bf37-ff4a4c697311",
         "phase": "PENDING_BUILD",
         "progress": {
           "pending_steps": 5,
           "total_steps": 5,
           "steps": [
             {
               "name": "build",
               "status": "PENDING",
               "steps": [
                 {
                   "name": "initialize",
                   "status": "PENDING"
                 }
               ]
             }
           ]
         },
         "created_at": "2025-10-12T15:04:16Z"
       }
     }
     ```
2. `curl -sS -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \`
   `https://api.digitalocean.com/v2/apps/aead98a2-db66-41e0-a5af-43c063b1f61a/deployments/77b4843d-2d29-4dc9-bf37-ff4a4c697311`
   - Response excerpt:
     ```
     {
       "deployment": {
         "phase": "ACTIVE",
         "progress": {
           "success_steps": 5,
           "total_steps": 5
         },
         "updated_at": "2025-10-12T15:04:25Z"
       }
     }
     ```
3. `curl -sS -o /tmp/dyn-ton.html -w '%{http_code}\n' https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Returned `404` immediately after the redeploy; re-run after CDN cache expiry to confirm restoration.

## 2025-10-10 02:32 UTC – Post-restoration verification

1. `curl -I https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
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
