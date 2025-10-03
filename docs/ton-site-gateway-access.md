# TON Site Gateway Access Guide

Dynamic Capital serves the Telegram Mini App bundle through a TON Site. Native
TON wallets resolve `.ton` domains directly, but traditional browsers fall back
to public gateways such as [ton.site](https://ton.site). When standard DNS
resolvers do not recognise `dynamiccapital.ton` (for example Chrome reporting
`DNS_PROBE_FINISHED_NXDOMAIN`), use the gateway URL to continue testing without
special extensions.

## Quick remediation when browsers show NXDOMAIN

1. **Confirm the gateway is online.** Open <https://ton.site/dynamiccapital.ton>
   in any modern browser. The ton.site gateway proxies the TON site content over
   traditional HTTPS so no wallet integration is required.
2. **Install a TON DNS resolver extension if you want native `.ton` support.**
   Wallet extensions such as
   [MyTonWallet for Chrome](https://chromewebstore.google.com/detail/mytonwallet/abogkplpencnmaiffledhjgobkeeflka)
   register a custom resolver and immediately remove the
   `DNS_PROBE_FINISHED_NXDOMAIN` warning for `.ton` domains.
3. **Flush the browser cache after installing the resolver.** Clear the cached
   host list or restart the browser so the new resolver handles
   `dynamiccapital.ton`.
4. **Record the mitigation in runbooks.** Capture a short note in the release or
   incident log so operators know the gateway path restored access.

## Gateway endpoints

| Purpose         | URL                                                           |
| --------------- | ------------------------------------------------------------- |
| Primary gateway | https://ton.site/dynamiccapital.ton                           |
| Icon            | https://ton.site/dynamiccapital.ton/icon.png                  |
| Social preview  | https://ton.site/dynamiccapital.ton/social/social-preview.svg |

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

- The Supabase Edge reverse proxy deployed at `/functions/v1/ton-site-proxy/*`
  mirrors the TON Site bundle with CORS headers. Use it when browser extensions
  strip custom resolvers or when you need to script health checks from
  infrastructure that cannot resolve `.ton` domains directly.
