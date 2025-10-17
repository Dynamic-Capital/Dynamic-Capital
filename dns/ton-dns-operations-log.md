# TON DNS Operations Log

This log captures on-chain changes to the `dynamiccapital.ton` resolver and NFT
ownership. Amounts are reported in TON (1 TON = 1,000,000,000 nanotons). Use
this file alongside [`toncli-dns-runbook.md`](./toncli-dns-runbook.md) when
preparing governance packets or multisig memos.

## 2025-10-18 – Resolver ownership delegated to DAO multisig

- **Objective** — Transfer `dynamiccapital.ton` NFT ownership from the
  operations treasury wallet to the DAO multisig
  `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` so future resolver updates
  can be executed directly through governance.
- **Change set** — Updated `dns/dynamiccapital.ton.json` so
  `nft.ownerAddress` reflects the DAO multisig (`EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`,
  non-bounceable form: `UQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx6N3`),
  refreshed the helper metadata under `dns/wallets/dns-updater/`, and bumped the
  published DNS bundles (`dynamic-capital-ton/storage/dns-records.txt` and
  `public/dns/active.json`) with a new `updated` timestamp marking the transfer.
- **Next steps** — Rehydrate the DAO-controlled signer in `dns/wallets/dns-updater`
  before broadcasting subsequent TXT or ADNL updates, and attach the transaction
  hash from the on-chain ownership transfer to this log once the DAO records the
  governance vote.

## 2025-10-12 – Root wallet alias repoint

- **Objective** — Align the `wallet` TXT payload for `dynamiccapital.ton` with
  the DAO multisig `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`, matching
  the latest governance directive.
- **Change set** — Updated `dns/dynamiccapital.ton.json` and
  `dynamic-capital-ton/storage/dns-records.txt` so the committed resolver bundle
  encodes the new root wallet and refreshes the publication timestamp to
  `2025-10-12T18:32:00Z`. Mirrored the change in `public/dns/active.json` for
  downstream tooling parity.
- **Next steps** — Broadcast the TXT update via `toncli dns set-record` using
  the DAO multisig signer, capture the transaction hash, and attach the signed
  DNS payload to the resolver archive before distributing the refresh to
  gateways.

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

## 2025-10-12 – Manual redeploy follow-up

- **Timestamp** — 2025-10-12 15:16 UTC redeploy attempted via `npm run do:sync-site` with app ID
  `aead98a2-db66-41e0-a5af-43c063b1f61a`; the helper failed with `AggregateError [ENETUNREACH]`
  because Node `fetch` cannot reach `api.digitalocean.com` inside the sandbox.
- **Redeploy path** — Issued `POST /v2/apps/{app_id}/deployments` via `curl` instead; deployment
  `0f8b18ca-9077-43c3-9e46-c7ee5a97a3ae` moved to `ACTIVE` at 15:16 UTC.
- **Origin probe** — `curl -sS -o /tmp/dyn-ton.html -w '%{http_code}\n' https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton`
  still returns `404`, showing the TON bundle was not rebuilt with the redeploy.
- **Gateway tooling** — `npm run ton:site-status -- --domain dynamiccapital.ton` remains blocked by
  sandbox egress limits (`ENETUNREACH` / `ENOTFOUND` across all gateways), so no live gateway checks
  were captured.
- **Bundle staging** — 2025-10-12 15:24 UTC `npm run ton:build-site-predeploy` staged the `ton-site-public`
  bundle (SHA-256 `74b89c3fd9370faafa7ec6705370d645af967ecabd5ad338d029cee3876e08fb`) under
  `dynamic-capital-ton/storage/predeploy`. The machine-readable summary lives at
  `dynamic-capital-ton/storage/predeploy/summary.json`. Redeploy remains pending because the sandbox
  cannot reach `api.digitalocean.com`, so the refreshed bundle still needs to be uploaded from a networked
  environment before `/dynamiccapital.ton` recovers.
- **Root cause** — The DigitalOcean origin continues to serve `HTTP 404` for `/dynamiccapital.ton`
  because the redeploys executed without the rebuilt TON bundle. Publishing the staged assets and rerunning
  the HTTPS verification workflow from an egress-enabled workstation will clear the failure.
- **Next step** — From an egress-enabled workstation, upload the staged bundle, trigger the DigitalOcean redeploy,
  and rerun the HTTPS verification workflow to confirm `/dynamiccapital.ton` returns `HTTP 200` before updating the resolver status.

## 2025-10-12 – Spec sync and redeploy (gateway still failing)

- **Timestamp** — 2025-10-12 15:54 UTC DigitalOcean app spec applied from `.do/app.yml` (manual `PUT` with `NPM_CONFIG_PRODUCTION=false` and legacy ingress removed), then deployment `4fdf8a69-4f3f-4cc2-be38-5340a8ba7bd8` promoted to `ACTIVE`.
- **Build outcome** — The Node buildpack retained dev dependencies (`NPM_CONFIG_PRODUCTION=false`) and executed the custom `node scripts/digitalocean-build.mjs` workflow successfully; static asset upload skipped because CDN credentials are unset.【13788a†L1-L41】【9aa19d†L1-L8】
- **Origin probe** — `curl -i https://dynamic-capital-qazf2.ondigitalocean.app/dynamiccapital.ton` now returns `HTTP 504` with `x-dynamic-ton-gateway-attempts: ton.site:error, tonsite.io:error, tonsite.link:error, ton-gateway.dynamic-capital.ondigitalocean.app:error, ton-gateway.dynamic-capital.lovable.app:error`, confirming every configured gateway fails and the static fallback never engaged.【a47526†L1-L23】
- **Gateway check** — Direct probe of `https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton` still responds `HTTP 503`, matching the exhausted attempts header from the origin.【a9f4ac†L1-L2】【c368b6†L1-L13】
- **Foundation status** — `https://ton.site/dynamiccapital.ton` only serves the placeholder redirect (`window.location.href="/lander"`), proving the TON bundle has not been uploaded to TON Storage and explaining the upstream failures.【55b53a†L1-L2】【3c8d7a†L1-L2】
- **Root cause** — The TON site bundle is absent across all gateways (TON Storage and self-hosted) even after the successful DigitalOcean redeploy, so `/dynamiccapital.ton` continues to surface gateway timeouts. Publish the staged bundle and re-run the HTTPS verification to restore `HTTP 200` responses.

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
- **Remediation in progress (2025-10-12)** — Updated `.do/app.yml` to promote
  `dynamic-capital-qazf2.ondigitalocean.app` as the primary DigitalOcean App
  domain and refreshed the environment defaults so the TON origin, Cloudflare
  bridge, and CORS configuration all reference the live hostname. Apply the
  change via `npm run doctl:sync-site -- --app-id <APP_ID> --site-url
  https://dynamic-capital-qazf2.ondigitalocean.app --apply --apply-zone` to push
  the spec and import the latest zone snapshot.

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
