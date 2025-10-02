# TON Site Gateway Access Guide

Dynamic Capital serves the Telegram Mini App bundle through a TON Site. Native
TON wallets resolve `.ton` domains directly, but traditional browsers fall back
to public gateways such as [ton.site](https://ton.site). When standard DNS
resolvers do not recognise `dynamiccapital.ton` (for example Chrome reporting
`DNS_PROBE_FINISHED_NXDOMAIN`), use the gateway URL to continue testing without
special extensions.

## Gateway endpoints

| Purpose            | URL                                               |
| ------------------ | ------------------------------------------------- |
| Primary gateway    | https://ton.site/dynamiccapital.ton               |
| Icon               | https://ton.site/dynamiccapital.ton/icon.png      |
| Social preview     | https://ton.site/dynamiccapital.ton/social/social-preview.svg |

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
