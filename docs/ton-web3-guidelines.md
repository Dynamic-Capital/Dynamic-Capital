# TON Web3 Guidelines

These guidelines codify how Dynamic Capital provisions TON-native infrastructure
so contributors can ship wallets, Jettons, and storage-backed sites with
confidence. Use this document alongside the Jetton starter kit and repo index to
keep the TON surfaces aligned with the broader platform roadmap.

## Overview

### Component inventory

| Surface                    | Location                                                                                                                                | Purpose                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Jetton contracts           | [dynamic-capital-ton/contracts/jetton](../dynamic-capital-ton/contracts/jetton)                                                         | Tact sources and deployment checklist for the DCT master + wallet contracts.                                                                 |
| Token economics config     | [dynamic-capital-ton/config.yaml](../dynamic-capital-ton/config.yaml)                                                                   | Canonical supply limits, split bounds, and timelock parameters referenced by edge functions and governance tooling.                          |
| Supabase schema            | [dynamic-capital-ton/supabase/schema.sql](../dynamic-capital-ton/supabase/schema.sql)                                                   | Tables that persist TON wallets, subscription ledgers, staking locks, and emissions history.                                                 |
| Edge functions             | [dynamic-capital-ton/supabase/functions](../dynamic-capital-ton/supabase/functions)                                                     | `link-wallet`, `process-subscription`, and `distribute-epoch` handlers that bridge TON payments with Supabase state and treasury automation. |
| Mini App TON manifest      | [dynamic-capital-ton/apps/miniapp/public/tonconnect-manifest.json](../dynamic-capital-ton/apps/miniapp/public/tonconnect-manifest.json) | Declares wallet metadata so TON Connect clients can authorize the Mini App.                                                                  |
| Wallet scripting reference | [docs/ton-wallet-quickstart.md](./ton-wallet-quickstart.md)                                                                             | Sample code that demonstrates connecting to RPC endpoints, generating mnemonics, and instantiating TON wallets.                              |

### Tooling & environment prerequisites

- **Node.js 20+ with pnpm** — matches the monorepo engine requirements and is
  needed to build Mini App bundles before uploading them to TON Storage.
- **Deno 1.43+** — required for Supabase Edge function development and
  `npm run
  format` (which runs `deno fmt`).
- **Supabase CLI** — manages local migrations and deploys the TON-focused edge
  functions (`supabase functions deploy`).
- **Ton Console dashboard** — install with
  [`node scripts/tonconsole/install.mjs`](./ton-console-installation.md) to
  manage payment flows, analytics, and partner integrations locally.
- **toncli or tondev** — use either toolkit to compile contracts, interact with
  TON DNS, publish sites, and manage storage providers.
- **Access to a TON wallet** with deployment permissions for the DNS resolver
  and storage uploads (multisig recommended per
  [`config.yaml`](../dynamic-capital-ton/config.yaml)).
- **Pinned lite servers** — reference the curated endpoints in the
  [`config.yaml`](../dynamic-capital-ton/config.yaml) `network.liteservers` list
  (`31.57.199.1:5053` and `163.5.62.1:5053`, shared `publicKeyBase64`
  `Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=`) when configuring tonlib
  clients or fall back to TON Access for redundancy. For application code, use
  `dynamic_ton.build_tonlib_liteservers()` or `dynamic_ton.TON_MAINNET_LITESERVERS`
  to hydrate tonlib configs without duplicating the hard-coded endpoints.

### Dynamic TON API webhooks

The Dynamic TON API broadcasts liquidity and treasury snapshots via signed
webhooks. To consume those events safely:

1. **Store the shared secret** exposed by the API (`DYNAMIC_TON_API_KEY`) in the
   Supabase environment and local `.env` files. Treat it like any other HMAC
   secret.
2. **Verify signatures** using `dynamic_ton.webhooks.verify_webhook_signature`.
   The helper supports both hexadecimal and base64 encoded signatures and uses
   HMAC SHA-256 under the hood. Use
   `dynamic_ton.webhooks.get_webhook_secret()` to read the shared secret from
   `DYNAMIC_TON_API_KEY` so runtime environments fail fast when the secret is
   missing.
3. **Parse envelopes** with `dynamic_ton.webhooks.parse_ton_webhook` or call
   `build_plan_from_webhook` directly to materialise a
   `TonExecutionPlan`. Payloads must include the `liquidity`, `telemetry`, and
   `treasury` sections mirrored in the API contract.
4. **Persist and act** on the resulting plan through Supabase Edge Functions or
   orchestration jobs. The dataclass exposes metadata such as the event ID,
   delivery timestamp, and retry count so duplicate suppression is trivial.

When wiring new automation, capture the inbound payloads in Supabase (for
example, `ton_api_webhook_events`) alongside the computed execution plan. This
keeps auditors aligned on what the on-chain allocator observed and how the
engine responded.

> **Operations note:** The production shared secret lives in the 1Password vault
> entry titled "Dynamic TON API Webhook". Rotate it alongside the upstream API
> token issuance workflow and update the Supabase, Vercel, and DigitalOcean
> secrets in the same change window.

> **Tip:** Run `npm run format` before committing documentation updates so the
> repo-wide formatter normalizes Markdown tables.

## TON DNS

### Domain & resolver lifecycle

1. **Register primary `.ton` names** via a wallet that the operations multisig
   controls. Track the registration receipt in Supabase for auditability.
2. **Set resolver records** to the relevant contracts or storage endpoints. The
   canonical addresses live in the `app_config` table created by
   [`schema.sql`](../dynamic-capital-ton/supabase/schema.sql) and mirrored in
   [`config.yaml`](../dynamic-capital-ton/config.yaml).
3. **Document resolver deployments** by updating
   [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) with the live
   contract address (`EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo` as of
   this commit) and linking the Ton Verifier receipt for auditors. Mirror the
   domain NFT metadata (collection
   `EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz`, owner
   `UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G`, and Tonviewer image hash)
   so operations can reconcile blockchain explorers with the repo state, and
   capture the upstream collection metadata snapshot
   ([`https://dns.ton.org/collection.json`](https://dns.ton.org/collection.json),
   last verified 2025-10-01) for provenance.
4. **Verify propagation** using `toncli dns resolve <domain>` before promoting
   front-end links or Mini App deep links.
5. **Renew before expiry**; add an Ops reminder alongside the `PHASE_06_OPS.md`
   workstream when TTL thresholds approach.
6. **Bridge Supabase services** by pointing `api.dynamiccapital.ton` to the
   Supabase project host (`<project-ref>.supabase.co`) and capturing the
   `_acme-challenge.api.dynamiccapital.ton` TXT tokens provided during
   verification. Mirror the TXT bundle into TON Storage/IPFS, reference the
   content hash in the multisig memo, and store the structured snapshot in
   [`dns/`](../dns) so auditors can replay and cryptographically verify the Web2
   ↔ Web3 linkup.
7. **Emit resolver telemetry** after activation by logging a
   `custom_domain_activated` event in Supabase `tx_logs` and broadcasting the
   DNS bundle hash through the operations multisig. This creates an immutable
   attestation that the resolver, Supabase, and on-chain state match.

### Resolver reference table

| Resolver field                | Purpose                                                                                                                                                         | Default placeholder                                | Update workflow                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ops_treasury` (`app_config`) | TON wallet receiving the operations split calculated by [`process-subscription`](../dynamic-capital-ton/supabase/functions/process-subscription/index.ts).      | `EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD` | Rotate via Supabase SQL `update` and broadcast the new resolver through the multisig timelock. |
| `dct_master` (`app_config`)   | Jetton master contract referenced by [`process-subscription`](../dynamic-capital-ton/supabase/functions/process-subscription/index.ts) for burns and emissions. | `EQDCTMaster…`                                     | When redeploying, update the DNS resolver and regenerate the Mini App manifest before release. |
| `dex_router` (`app_config`)   | Router endpoint that swaps TON → DCT inside [`process-subscription`](../dynamic-capital-ton/supabase/functions/process-subscription/index.ts).                  | `EQDexRouter…`                                     | Coordinate with Liquidity Ops; update the DNS resolver and Supabase row atomically.            |

> Store human-readable context (e.g., “Operations Treasury wallet (mainnet)”) in
> Supabase `tx_logs.meta` when logging resolver rotations for historical review.

### Operational guardrails

- Use a **staging resolver** on testnet before cutting over production domains.
- Capture resolver addresses in the release checklist when invoking the
  timelock-controlled actions defined in
  [`contracts/jetton`](../dynamic-capital-ton/contracts/jetton).
- Automate a nightly `toncli dns resolve` health check to detect unexpected
  resolver mutations.

## Proxy & TON Sites

### Preparing site assets

1. Build the Mini App bundle with `npm run build:miniapp`; artifacts land in
   `apps/miniapp/.next` and can be exported for static hosting.
2. Transform the output into a static directory using `next export` or the
   `scripts/build-miniapp.sh` helper so it can be uploaded via TON Storage.
3. Version the exported hash in Supabase (e.g., `tx_logs` with
   `kind =
   'ton_site_publish'`) to keep provenance between commits and
   on-chain uploads.

### Publishing through TON Sites

- Use `toncli storage upload ./out --dns <domain>` to push the static bundle to
  TON Storage and atomically update the DNS content record.
- When uploading from CI, inject the TON wallet seed via secure secrets and use
  a multisig-guarded key where possible.
- After upload, call the health-check endpoint in the Mini App
  ([`link-wallet`](../dynamic-capital-ton/supabase/functions/link-wallet/index.ts))
  to ensure Supabase connectivity from the TON-hosted site.
- Generate or rotate the TON Site certificate by running
  `npm run ton:generate-adnl`; record the resulting ADNL address under
  [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) → `ton_site`
  and archive the private key in the operations vault before publishing.

### Application integration

- Mini App clients rely on
  [`tonconnect-manifest.json`](../dynamic-capital-ton/apps/miniapp/public/tonconnect-manifest.json);
  bump the `url` and `iconUrl` when a new TON Site hash is promoted.
- The Telegram bot in [`apps/bot`](../dynamic-capital-ton/apps/bot) should deep
  link to the `.ton` domain once DNS propagation is confirmed.
- Edge functions (`link-wallet`, `process-subscription`,
  [`distribute-epoch`](../dynamic-capital-ton/supabase/functions/distribute-epoch/index.ts))
  must be redeployed if environment URLs change so CORS and webhook origins stay
  aligned.

### Opening TON Sites

- Verify in **Tonkeeper** or **MyTonWallet** by entering the `.ton` domain; both
  wallets resolve DNS and surface the embedded browser.
- For desktop testing, use the TON Proxy browser extension or
  `toncli proxy
  open <domain>`.
- Document verification screenshots in release notes to confirm parity across
  wallet vendors.

### Management & proxy operations

| Task                         | Owner     | Cadence    | Notes                                                                                 |
| ---------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------- |
| Update TON Site content hash | Front-end | As needed  | Triggered by Mini App releases; coordinate with DNS resolver updates.                 |
| Rotate proxy keys            | DevOps    | Quarterly  | Back up multisig seeds and rotate TON Storage provider keys in tandem.                |
| Monitor availability         | DevOps    | 5 min cron | Poll the `.ton` domain through TON Proxy and fall back to CDN if latency > threshold. |
| Incident response            | Ops       | On demand  | Follow `RUNBOOK_start-not-responding.md` in tandem with TON DNS rollback steps.       |

## TON Storage

### Storage daemon deployment

1. Install the official `ton-storage-daemon` on a hardened VM with attached SSDs
   (≥ 100 GB recommended for historical bundles).
2. Initialize the daemon with the provider key used for DNS updates; persist the
   seed phrase in the operations vault.
3. Expose gRPC/HTTP interfaces only over a private network or authenticated
   tunnel; CI jobs should connect via short-lived tokens.
4. Configure automatic pinning for the latest Mini App build artifacts and
   Jetton metadata so the daemon re-seeds content after restarts.

### Provider roles & responsibilities

| Role     | Responsibilities                                                                                      | Related assets                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Uploader | Publishes new site bundles, Jetton metadata, and governance documents to TON Storage.                 | Uses `toncli storage upload`, references [`config.yaml`](../dynamic-capital-ton/config.yaml) for multisig accounts. |
| Provider | Keeps the storage daemon online, monitors disk utilization, and renews provider stakes.               | Logs metrics to Supabase via `tx_logs` with `kind = 'storage_heartbeat'`.                                           |
| Auditor  | Confirms that uploaded hashes match Git commits and that DNS resolvers point to the expected content. | Cross-checks [`schema.sql`](../dynamic-capital-ton/supabase/schema.sql) snapshots and release tags.                 |

### FAQ

- **How do we test storage uploads without burning mainnet fees?** Use the TON
  testnet by swapping RPC endpoints in the wallet configuration and using a
  throwaway resolver domain. Update Supabase `app_config` to point at testnet
  addresses temporarily.
- **What triggers a redeploy of the storage daemon?** Kernel updates or security
  patches. Rehydrate from the latest snapshot and replay pinning instructions
  stored in `tx_logs` to confirm full data availability.
- **Where do we document resolver or storage key rotations?** Log every change
  in Supabase (`tx_logs`) and append context to the relevant launch phase docs
  (e.g., [`PHASE_06_OPS.md`](./PHASE_06_OPS.md)).
- **How are TON payments correlated with storage events?** The
  [`process-subscription`](../dynamic-capital-ton/supabase/functions/process-subscription/index.ts)
  function logs TON transaction hashes and downstream actions, letting auditors
  match inflows with storage updates.

Keep this guide up to date as TON tooling evolves—link future automation scripts
or dashboards here so contributors can quickly adopt the new workflow.
