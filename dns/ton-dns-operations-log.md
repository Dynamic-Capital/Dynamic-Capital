# TON DNS Operations Log

This log captures on-chain changes to the `dynamiccapital.ton` resolver and NFT
ownership. Amounts are reported in TON (1 TON = 1,000,000,000 nanotons). Use
this file alongside [`toncli-dns-runbook.md`](./toncli-dns-runbook.md) when
preparing governance packets or multisig memos.

## 2025-10-12 – DigitalOcean gateway relink

- **Symptom** — DigitalOcean App Platform flagged `dynamiccapital.ton` as
  pointing to Cloudflare rather than the default app domain. TLS issuance for
  the TON Site gateway stalled and the dashboard showed the custom domain in an
  error state.
- **DNS change** — Updated `dns/dynamiccapital.ton.json` so the
  `ton-gateway.dynamiccapital.ton` CNAME targets
  `dynamic-capital-qazf2.ondigitalocean.app` directly. Mirrored the same update
  in `dns/dynamic-capital.lovable.app.json` to keep the Lovable fallback
  aligned.
- **Resolver metadata** — Refreshed the gateway metadata block to point at the
  DigitalOcean origin and marked the health probe as requiring DNS relink until
  the CNAME propagates.
- **Follow-up** — Keep Cloudflare entries in DNS-only mode while DigitalOcean
  reissues the certificate, then rerun `npm run ton:site-status` to confirm the
  origin responds with HTTP 200 before re-enabling the proxy.

## 2025-09-30 – dynamiccapital.ton auction settlement

- **Control message** — `TONAPI gas proxy` (`EQDzP1oeMJI2wh_UErnVIuJKam7zdFwB9-x9cxvA-ETDNHCs`)
  executed a `highload_wallet_signed_v2` call that staged the auction payment for
  the Dynamic Capital operations wallet. The transaction (hash
  `96ac854938b992f71f33827dac42a7aa9e302539fc55347e006f6eee74dc0d89`, lt
  `62087400000001`) primed the workflow with 0.06614679 TON of gas funding.
- **Owner wallet dispatch** — The operations wallet `dynamiccapital.ton`
  (`UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G`) signed
  `wallet_signed_internal_v5_r1` (hash `d829586188e485a86cdb87e158cba478be555e3dfe2d1420ededbbdfd7f1f1b8`,
  lt `62087400000003`). It forwarded 0.063213057 TON to the domain NFT contract
  with query `1759260783`, designating the same wallet as the new owner.
- **Domain NFT execution** — `dynamiccapital.ton`'s NFT contract
  (`EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo`) accepted the transfer
  (hash `99a714393bb56d833165654ff181c85bfd8c968909883263bb698d5bd224ab85`, lt
  `62087400000005`) and triggered the settlement pipeline:
  - Sent an `auction_fill_up` to the `.ton DNS` collection (`EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz`,
    hash `dc7f1caa7f2ea9b56e046a53cc5fefb6d05c355180fdc955fd15bf61a95c7228`, lt
    `62087400000007`) paying 0.024698749 TON to finalise the auction.
  - Issued an `nft_ownership_assigned` callback to the owner wallet (hash
    `5138a51a870cae0cada7f468866457d67d87878aeab50e9542045c91d6781644`, lt
    `62087400000008`). The 1 nanotons payload was too small to cover execution,
    so the v5 wallet skipped compute (`cskip_no_gas`) while retaining ownership.
  - Returned 0.062282914 TON of excess funds to the Tonkeeper battery reserve
    (`EQDfvVvoSX_cDJ_L38Z2hkhA3fitZCPW1WV9mw6CcNbIrH-Q`, hash
    `1c82a54ec8f75a1abbf56f3896b21b04c0f3047fddffba1edb8dd19da75651ac`, lt
    `62087400000009`).

Document follow-on DNS payloads, TON Storage uploads, and resolver rotations in
chronological order beneath this entry.

## 2025-10-06 – Mailbox TXT broadcast prep

- **Objective** — Publish the `mailbox=hello@dynamiccapital.ton` and
  `mailbox=support@dynamiccapital.ton` TXT aliases from
  `dns/dynamiccapital.ton.json` using `toncli send` to update the resolver
  contract `EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo`.
- **Tooling status** — Installed the TON release bundle (`v2025.07`) and staged
  the extracted `func`, `fift`, and `lite-client` binaries in `/usr/local/bin`.
  Added `libsodium23` so the executables load successfully and confirmed each
  binary reports build `cac968f7…` via `-V`. `toncli 0.0.43` now launches and
  lists all wallet and DNS subcommands.
- **Operational gap** — The committed wallet project still needs the authorised
  mnemonic restored and funded before a multisig packet can be signed for the
  TXT update.
- **Next steps** — Hydrate `dns/wallets/dns-updater` with the authorised
  mnemonic via `dns/wallets/provision_dns_wallet.py`, fund the wallet with at
  least 0.1 TON for fees, regenerate the TXT payloads if necessary, and rerun
  `toncli send --net mainnet ...` to record the transaction hash for this log.

## 2025-10-09 – DNS remediation follow-up (incomplete)

- **Resolver update draft** — Prepared a resolver payload replacing the
  Cloudflare anycast `A` records with Vercel's apex IP `216.198.79.1` in
  `dns/dynamiccapital.ton.json`. Change remains staged; defer on-chain
  broadcast until Vercel confirms the apex is reachable.
- **Vercel verification** — Added the `_vercel` TXT token to
  `dns/dynamic-capital.ondigitalocean.app.zone`, but the apex CNAME approach was
  invalid. Replaced it with Vercel's apex `A` record and legacy fallback IP; the
  Vercel dashboard still shows the domain as unverified pending DNS propagation.
- **Gateway probe** — `curl` checks at 16:28–16:31 UTC recorded `HTTP 503`
  responses from both HTTPS bridges and `HTTP 404` from the DigitalOcean origin
  on `/dynamiccapital.ton`. Left the resolver verification block in an `error`
  state until the TON bundle is redeployed (see
  `dns/https-gateway-verification-2025-10-08.md`).

## 2025-10-10 – TON gateway restoration confirmed

- **Timestamp** — 2025-10-10 02:32 UTC verification block executed after the
  redeploy to the DigitalOcean origin.
- **Deployment details** — TON Site bundle rebuilt from `apps/web` and deployed
  by Quantum Finance AGI (GitHub Actions assist). Deployment commit: pending
  (update with merge commit hash once this change lands on `main`).
- **Gateway verification** — `curl -I` against both
  `https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
  and `https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`
  returned `HTTP 200` with the refreshed bundle, matching the direct origin
  probe at `https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`.
- **Root cause recap** — Earlier regression stemmed from the TON bundle being
  removed from the DigitalOcean origin. Restoring the bundle resolved the 404
  and cleared the downstream 503 responses.

## 2025-10-10 – TON gateway restoration

- **Origin redeploy** — Rebuilt the TON Site bundle from `apps/web` and
  redeployed it to `dynamic-capital-qazf2.ondigitalocean.app`, clearing the 404
  responses on `/dynamiccapital.ton`.
- **Gateway verification** — Executed the HTTPS probes at 11:44–11:46 UTC and
  observed `HTTP 200` from both
  `https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
  and `https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`,
  confirming the fallback path mirrors the healthy origin.
- **Resolver update** — Flipped the `ton_site.verification.https.status` field
  in `dns/dynamiccapital.ton.json` back to `ok` with the new timestamps and
  committed the probe results in
  `dns/https-gateway-verification-2025-10-08.md`.

## 2025-10-11 – DigitalOcean origin still offline

- **Verification** — 01:44 UTC spot check recorded `HTTP 200` from
  `https://ton.site/dynamiccapital.ton`, `HTTP 404` from
  `https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`, and
  `HTTP 503` from `https://ton-gateway.dynamic-capital.lovable.app/dynamiccapital.ton`.
- **Repository updates** — Refreshed
  `dns/dynamiccapital.ton.json` with the latest timestamps, HTTP status codes,
  and notes documenting the missing DigitalOcean bundle and offline Lovable
  proxy. Logged the probe output in
  `dns/https-gateway-verification-2025-10-08.md`.
- **Next steps** — Rebuild and redeploy the TON Site bundle to the DigitalOcean
  app, then re-run the verification commands before restoring the resolver
  status to `ok`.

## 2025-10-10 – Gateway regression detected

- **Symptom** — Routine verification at 16:41 UTC returned `HTTP 503` from both
  HTTPS gateways while polling `/dynamiccapital.ton`. The primary Envoy edge
  replied with a synthetic `200` header followed by the upstream `503` body.
- **Origin check** — Direct request to
  `https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
  responded with `HTTP 404`, indicating the TON bundle is no longer published on
  the DigitalOcean origin.
- **Repository updates** — Set `ton_site.verification.https.status` back to
  `error` in `dns/dynamiccapital.ton.json` and refreshed
  `dns/https-gateway-verification-2025-10-08.md` with the failing curl output so
  the audit trail reflects the downtime.
- **Next steps** — Rebuild and redeploy the TON site bundle, verify the origin
  returns `HTTP 200`, then re-test the gateways before restoring the resolver
  status to `ok`.

## 2025-02-14 – TON Foundation gateway promoted

- **Context** — The self-hosted DigitalOcean and Lovable reverse proxies remain
  offline, but the public TON Foundation gateway consistently serves
  `dynamiccapital.ton`.
- **DNS updates** — Updated `dns/dynamiccapital.ton.json` so the TON Foundation
  endpoint is recorded under `ton_site.gateways.foundation` with `status =
  operational`, while the legacy gateways are marked `status = offline`.
- **Tooling** — Switched `shared/ton/site.ts` and dependent helpers to default to
  `https://ton.site/dynamiccapital.ton`, keeping the self-hosted proxies as
  legacy fallbacks.
- **Runbooks** — Refreshed `docs/ton-site-gateway-access.md` and operational
  checklists to direct browsers to the TON Foundation bridge first and capture
  redeploy steps for the legacy gateways.
