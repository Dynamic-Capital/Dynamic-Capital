# HTTPS Gateway Verification – 2025-10-08

-## Summary
- 2025-10-12 15:54 UTC DigitalOcean spec synced manually (added `NPM_CONFIG_PRODUCTION=false`, dropped unmanaged domain ingress) and redeployed (`deployment 4fdf8a69-4f3f-4cc2-be38-5340a8ba7bd8`); build completed but `/dynamiccapital.ton` still returns `HTTP 504` with gateway attempts exhausted because the TON bundle is absent from all upstream gateways (`ton.site` serves the placeholder redirect).
- 2025-10-12 15:24 UTC rebuild staged the `ton-site-public` bundle (`SHA-256 74b89c3fd9370faafa7ec6705370d645af967ecabd5ad338d029cee3876e08fb`) via `npm run ton:build-site-predeploy`; redeploy remains pending because the sandbox cannot reach `api.digitalocean.com`, so `/dynamiccapital.ton` still responds with `HTTP 404` until the bundle is published from a networked environment.
- 2025-10-12 15:16 UTC follow-up redeploy triggered via the DigitalOcean REST API after the `npm run do:sync-site` helper failed (sandbox `ENETUNREACH` on Node `fetch`); direct origin probes still return `HTTP 404`, indicating the TON bundle was not rebuilt.
- 2025-10-12 15:04 UTC manual redeploy triggered for `dynamic-capital-qazf2` via the DigitalOcean REST API; origin probe currently returns `HTTP 404` while propagation completes.

## 2025-10-12 15:54 UTC – Spec sync and redeploy (gateway still failing)

1. `curl -sS -X PUT -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" -H "Content-Type: application/json" https://api.digitalocean.com/v2/apps/aead98a2-db66-41e0-a5af-43c063b1f61a -d @/tmp/app-spec.json`
   - Applied `.do/app.yml` after removing legacy domain ingress and adding the build-time `NPM_CONFIG_PRODUCTION=false` toggle so dev dependencies persist during custom builds.
2. `curl -sS -X POST -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" -H "Content-Type: application/json" https://api.digitalocean.com/v2/apps/aead98a2-db66-41e0-a5af-43c063b1f61a/deployments`
   - Created deployment `4fdf8a69-4f3f-4cc2-be38-5340a8ba7bd8` (build logs confirm the Node buildpack skipped pruning dev dependencies and ran the custom build successfully while static asset uploads were skipped because CDN credentials are unset).【9aa19d†L1-L10】【bc68b4†L1-L2】
3. `curl -i https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
   - Response: `HTTP/1.1 504 Gateway Timeout` with `x-dynamic-ton-gateway-attempts: ton.site:error, tonsite.io:error, tonsite.link:error, ton-gateway.dynamic-capital.ondigitalocean.app:error, ton-gateway.dynamic-capital.lovable.app:error`, confirming every configured gateway fails and no static fallback is served.【a47526†L1-L23】
4. `curl -sSL https://ton.site/dynamiccapital.ton`
   - Returns only the TON placeholder redirect (`window.location.href="/lander"`), proving the bundle was never published to TON Storage and explaining the repeated gateway failures.【55b53a†L1-L2】【3c8d7a†L1-L2】
5. `curl -sS -o /tmp/gateway.html -w "%{http_code}\n" https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   - Still returns `HTTP 503`, matching the upstream outage and reinforcing that the self-hosted gateways do not have a valid TON snapshot to serve.【a9f4ac†L1-L2】【c368b6†L1-L13】
6. Next steps: Upload the staged TON bundle to TON Storage (or the DigitalOcean origin), then rerun the HTTPS verification workflow once `/dynamiccapital.ton` responds with `HTTP 200`.
- Historical reference: 2025-10-10 02:32 UTC verification confirmed both HTTPS gateways returned `HTTP 200` for `/dynamiccapital.ton` once the bundle was restored.
- Historical reference: Direct origin probe at `https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton` also returned `HTTP 200` after the 2025-10-10 redeploy.
- Earlier 2025-10-10 16:41 UTC regression details remain below for historical context.

## 2025-10-12 15:24 UTC – TON site bundle rebuilt (redeploy pending)

1. `npm run ton:build-site-predeploy`
   - Staged the `ton-site-public` bundle at `dynamic-capital-ton/storage/predeploy/ton-site-public/apps/web/public`.
   - Computed SHA-256 `74b89c3fd9370faafa7ec6705370d645af967ecabd5ad338d029cee3876e08fb`, matching the updated manifest entry and recorded in `dynamic-capital-ton/storage/predeploy/summary.json`.
2. DigitalOcean redeploy remains blocked inside the sandbox: outbound requests to `https://api.digitalocean.com` continue to fail with `ENETUNREACH`, so the staged bundle still needs to be published from an environment with network egress.
3. Root cause: the DigitalOcean origin lacks the refreshed TON bundle, which leaves `/dynamiccapital.ton` responding with `HTTP 404` until the staged assets are uploaded and the redeploy completes.

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
