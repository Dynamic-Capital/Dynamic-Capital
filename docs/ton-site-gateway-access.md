# TON Site Gateway Access Guide

Dynamic Capital serves the Telegram Mini App bundle through a TON Site. Install
and operate the gateway with the Tonutils Reverse Proxy helper outlined in
[docs/tonutils-reverse-proxy.md](./tonutils-reverse-proxy.md) to keep the HTTPS
reverse proxy online. Native TON wallets resolve `.ton` domains directly, while
traditional browsers should now start with the DigitalOcean reverse proxy at
<https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton>. The
TON Foundation bridge remains an audited fallback if the self-hosted gateway is
unavailable.

## Quick remediation when browsers show NXDOMAIN

1. **Confirm the gateway is online.** Open
   <https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton>
   in any modern browser. The DigitalOcean reverse proxy terminates TLS and
   relays traffic to the TON Site so no wallet integration is required.
2. **Install a TON DNS resolver extension if you want native `.ton` support or
   need the TON Foundation fallback.** Wallet extensions such as
   [MyTonWallet for Chrome](https://chromewebstore.google.com/detail/mytonwallet/abogkplpencnmaiffledhjgobkeeflka)
   register a custom resolver and immediately remove the
   `DNS_PROBE_FINISHED_NXDOMAIN` warning for `.ton` domains while also enabling
   direct access to <https://ton.site/dynamiccapital.ton> when required.
3. **Flush the browser cache after installing the resolver.** Clear the cached
   host list or restart the browser so the new resolver handles
   `dynamiccapital.ton`.
4. **Record the mitigation in runbooks.** Capture a short note in the release or
   incident log so operators know the gateway path restored access.

## Gateway endpoints

| Purpose             | URL                                                                                                 | Notes                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Primary gateway     | https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton                           | DigitalOcean reverse proxy terminating TLS for standard browsers |
| Icon                | https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/icon.png                  | Served from the DigitalOcean gateway                             |
| Social preview      | https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton/social/social-preview.svg | Served from the DigitalOcean gateway                             |
| Foundation fallback | https://ton.site/dynamiccapital.ton                                                                 | TON Foundation-operated HTTPS bridge                             |
| Lovable standby     | https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton                                  | Hot standby reverse proxy mirroring the DigitalOcean gateway     |

When updating gateway priority, adjust `shared/ton/site.ts` and
`dns/dynamiccapital.ton.json` so operational dashboards reflect the active
primary and fallback ordering.

Link helpers inside the repository now point to these gateway URLs. Publishing
flows should continue to treat `dynamiccapital.ton` as the canonical domain;
update the TON DNS resolver and TON Storage hashes during releases so the
gateway always serves the latest content.

## Verification checklist

1. Open the gateway URL in a desktop browser and confirm the Mini App renders.
2. Load the same URL through Tonkeeper or MyTonWallet to verify the native TON
   resolution path.
3. Run `node scripts/verify/ton_site.mjs` and confirm the `tonsite_gateway`
   checks return `PASS`.
4. Record screenshots for both access paths in the release notes.

Document any anomalies (gateway downtime, stale caches) in Supabase `tx_logs`
and rotate to an alternate gateway if required. The helper constants exposed in
`shared/ton/site.ts` allow quick updates when a new gateway is promoted.

## Monitoring and alerting

- **Automated sweeps.** The GitHub Action defined in
  `.github/workflows/ton-site-status.yml` runs on a 30-minute cron and executes
  `npm run ton:site-status -- --domain dynamiccapital.ton`. Each run posts a
  summary to the workflow log so operators can confirm latency and status codes
  for both gateways.
- **Supabase alerting.** Configure the Supabase edge function
  `ton_gateway_alert` (see `supabase/functions`) to listen for failed workflow
  webhooks or failed health checks. Trigger Discord/Telegram notifications when
  any gateway returns a non-200 response for two consecutive sweeps.
- **Uptime ledger.** Store every health check result in the `tx_logs` table with
  structured payloads (`status`, `latency_ms`, `gateway_host`). This keeps the
  blockchain-facing audit log aligned with operational telemetry.
- **Escalation.** When the GitHub Action records repeated failures, open an
  incident in the operations playbook and follow the emergency restoration
  runbook outlined in `docs/ton-site-deployment.md`.
