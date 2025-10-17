# Dynamic Capital .ton Domain Integration Playbook

## Overview

The `dynamiccapital.ton` domain is the canonical on-chain identifier and web
gateway for the Dynamic Capital ecosystem. Anchoring jetton contracts, liquidity
infrastructure, APIs, and authentication to this domain delivers verifiable
ownership, trusted branding, and streamlined integrations across TON wallets,
dApps, and explorers.

## Core Domain Assets

- **Root Domain:** `dynamiccapital.ton`
- **Token Symbol:** `DCT`
- **Jetton Master:** `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`
- **Treasury Wallet:** `dynamiccapital.ton` →
  `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq`
- **Root Wallet Alias:** `dynamiccapital.ton` wallet record →
  `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`

> **Note:** Only the treasury wallet should have permission to update the
> resolver record to preserve authoritative control.

## Domain-Level Registry Map

Store the following key-value pairs in the TON DNS TXT record so integrators can
auto-discover Dynamic Capital contracts and services when resolving
`dynamiccapital.ton`:

| Key                                                                                               | Address / URL                                                                                                | Description                                                                      |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `ton_alias`                                                                                       | `dynamiccapital.ton`                                                                                         | DNS alias resolving deposits                                                     |
| `root_wallet`                                                                                     | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                                                           |                                                                                  |
| Root domain wallet alias pointing `dynamiccapital.ton` directly at the DCT jetton master contract |                                                                                                              |                                                                                  |
| `token_symbol`                                                                                    | `DCT`                                                                                                        | Canonical ticker across wallets, pools, and exchanges                            |
| `jetton_master`                                                                                   | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                                                           | Dynamic Capital Token (DCT)                                                      |
| `treasury_wallet`                                                                                 | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq`                                                           | Treasury & mint authority                                                        |
| `stonfi_pool`                                                                                     | `EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI`                                                           | STON.fi DCT/TON pool                                                             |
| `stonfi_pool_metadata`                                                                            | `https://meta.ston.fi/lp/v1/0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3.json`         | STON.fi LP metadata JSON                                                         |
| `stonfi_jetton_wallet`                                                                            | `EQAtgX_AkOJEEDxYICWRlS9HtNFMrujgruQJLanYHJURCxB3`                                                           | STON.fi jetton wallet for DCT                                                    |
| `wallet_v5r1`                                                                                     | `EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm`                                                           | Jetton wallet (Wallet v5r1)                                                      |
| `dedust_pool`                                                                                     | `EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm`                                                           | DeDust DCT/TON vault                                                             |
| `dedust_pool_metadata`                                                                            | `https://api.dedust.io/v2/pools/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98/metadata` | DeDust LP metadata JSON                                                          |
| `dedust_jetton_wallet`                                                                            | `EQC_W1HQhQhf3XyyNd-FW-K6lWFfSbDi5L2GqbJ7Px2eZzVz`                                                           | DeDust jetton wallet for DCT                                                     |
| `swapcoffee_pool`                                                                                 | `EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D`                                                           | swap.coffee DCT/TON pool                                                         |
| `swapcoffee_pool_metadata`                                                                        | `https://lp.swap.coffee/0:03E561AE336BB09E406ADF43C14BF4669703F95408FE2B35DADE58FD8C99056A/metadata`         | swap.coffee LP metadata JSON                                                     |
| `swapcoffee_jetton_wallet`                                                                        | `EQAT363NPdduFnHRL3cP96cbxhbtMZ7vJCiuH7lt7tcwjH9l`                                                           | swap.coffee jetton wallet for DCT                                                |
| `dao_contract`                                                                                    | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                                                           | Dedicated DAO governance multisig executing resolver and configuration proposals |
| `jetton_tonviewer`                                                                                | `https://tonviewer.com/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                              | Jetton explorer (Tonviewer)                                                      |
| `jetton_tonscan`                                                                                  | `https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                                | Jetton explorer (Tonscan)                                                        |
| `jetton_verifier`                                                                                 | `https://verifier.ton.org/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                                  | TON Contract Verifier proof                                                      |
| `jetton_dyor`                                                                                     | `https://dyor.io/token/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                                     | Jetton intelligence profile (DYOR)                                               |
| `dexscreener_token`                                                                               | `https://dexscreener.com/ton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                               | Unified token analytics hub (DEX Screener)                                       |
| `dexscreener_stonfi`                                                                              | `https://dexscreener.com/ton/eqaxh2vd3umfnrf29pkl6wsozxrt6_p2sxrnlzzh1vus0_mi`                               | STON.fi pair analytics (DEX Screener)                                            |
| `dexscreener_dedust`                                                                              | `https://dexscreener.com/ton/eqdtj4lhut6bdtyeio99umznc9hzlq-tfoa9thrvyrlumefm`                               | DeDust pair analytics (DEX Screener)                                             |
| `dexscreener_swapcoffee`                                                                          | `https://dexscreener.com/ton/eqad5wgum2uwnkbq30pbs_rmlwp5vaj-kzxa3lj9jjkfaj-d`                               | swap.coffee pair analytics (DEX Screener)                                        |
| `x1000_token`                                                                                     | `https://x1000.finance/tokens/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                              | Token intelligence & alerts (X1000 Finance)                                      |
| `api_endpoint`                                                                                    | `https://api.dynamiccapital.ton`                                                                             | REST / Supabase gateway                                                          |
| `metadata`                                                                                        | `https://dynamiccapital.ton/jetton-metadata.json`                                                            | Jetton metadata JSON (primary)                                                   |
| `web`                                                                                             | `https://dynamiccapital.ton`                                                                                 | Marketing & dashboard site                                                       |
| `geckoterminal_stonfi`                                                                            | `https://www.geckoterminal.com/ton/pools/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI`                   | STON.fi pool analytics (GeckoTerminal)                                           |
| `geckoterminal_dedust`                                                                            | `https://www.geckoterminal.com/ton/pools/EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm`                   | DeDust pool analytics (GeckoTerminal)                                            |
| `geckoterminal_swapcoffee`                                                                        | `https://www.geckoterminal.com/ton/pools/EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D`                   | swap.coffee pool analytics (GeckoTerminal)                                       |

### Payment Subdomain Routing

| Subdomain                | Purpose                                                                                                          | Target Wallet / Contract                                                                         | Type                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pay.dynamiccapital.ton` | Dedicated payment landing alias so wallets and browsers share a consistent entry point for TON and DCT deposits. | `dynamiccapital.ton` → `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` (DCT treasury wallet). | TON DNS `wallet` record + HTTPS CNAME. | Publish the wallet alias with `python dns/toncli_build_dns_update.py dns/dynamiccapital.ton.json --categories wallet --wallet-address EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq`, then broadcast via `toncli send`. The JSON snapshot also serves a `CNAME`/`TXT` pair so `https://pay.dynamiccapital.ton` mirrors the main site while TON wallets resolve the treasury address natively.【F:shared/ton/mainnet-addresses.ts†L14-L40】【F:dns/dynamiccapital.ton.json†L66-L91】【F:dns/toncli_build_dns_update.py†L77-L133】 |

## Integration Touchpoints

### Web, Mini Apps, and Wallet Auth

- Serve applications from `https://dynamiccapital.ton` (marketing + dashboards)
  and `https://mini.dynamiccapital.ton` (Telegram mini-app).
- Host `tonconnect-manifest.json` at
  `https://dynamiccapital.ton/tonconnect-manifest.json` to enable TON Connect v2
  login flows and reuse the same manifest for web and mini-app entry points.
- Surface the unified DCT action pad across web and mini-app experiences so
  onboarding, deposits, withdrawals, and liquidity links always reference the
  same `dynamiccapital.ton` alias, memo, and explorer targets.

### Smart Contracts & Metadata

- Reference `dynamiccapital.ton` as the metadata root instead of hardcoded IPFS
  links, falling back to IPFS mirrors only for redundancy.
- Publish Jetton metadata at `https://dynamiccapital.ton/jetton-metadata.json`.
- Derive the STON.fi and DeDust jetton wallets from the master contract using
  `runGetMethod(get_wallet_address)` before broadcasting DNS updates so the
  resolver values match on-chain state.
- Include `token_symbol=DCT` in every DNS payload so wallets, explorers, and
  liquidity venues render the canonical ticker.

```json
{
  "name": "Dynamic Capital Token",
  "symbol": "DCT",
  "description": "Utility & governance token of Dynamic Capital ecosystem on TON.",
  "decimals": 9,
  "image": "https://dynamiccapital.ton/assets/dct-logo.png",
  "website": "https://dynamiccapital.ton",
  "social": {
    "telegram": "https://t.me/DynamicCapital_Support",
    "twitter": "https://x.com/dynamic_capital"
  },
  "contracts": {
    "token_symbol": "DCT",
    "ton_alias": "dynamiccapital.ton",
    "jetton_master": "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "stonfi_pool": "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
    "stonfi_pool_metadata": "https://meta.ston.fi/lp/v1/0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3.json",
    "stonfi_jetton_wallet": "EQAtgX_AkOJEEDxYICWRlS9HtNFMrujgruQJLanYHJURCxB3",
    "wallet_v5r1": "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
    "dedust_pool": "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
    "dedust_pool_metadata": "https://api.dedust.io/v2/pools/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98/metadata",
    "dedust_jetton_wallet": "EQC_W1HQhQhf3XyyNd-FW-K6lWFfSbDi5L2GqbJ7Px2eZzVz",
    "swapcoffee_pool": "EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D",
    "swapcoffee_pool_metadata": "https://lp.swap.coffee/0:03E561AE336BB09E406ADF43C14BF4669703F95408FE2B35DADE58FD8C99056A/metadata",
    "swapcoffee_jetton_wallet": "EQAT363NPdduFnHRL3cP96cbxhbtMZ7vJCiuH7lt7tcwjH9l",
    "treasury": "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq"
  }
}
```

- Mirror the metadata JSON to IPFS for redundancy while keeping the
  domain-hosted file authoritative.

### APIs & Automation

- Route Supabase Edge Functions through `https://api.dynamiccapital.ton`.
- Provide liquidity automation endpoints, for example:
  - `GET https://api.dynamiccapital.ton/liquidity/stonfi`
  - `GET https://api.dynamiccapital.ton/liquidity/dedust`
  - `POST https://api.dynamiccapital.ton/rebalance`
  - `POST https://api.dynamiccapital.ton/buyback`

## DNS TXT Record Template

Add the following entries to the TON DNS resolver:

```
ton_alias=dynamiccapital.ton
token_symbol=DCT
jetton_master=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
treasury_wallet=EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq
stonfi_pool=EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI
stonfi_pool_metadata=https://meta.ston.fi/lp/v1/0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3.json
stonfi_jetton_wallet=EQAtgX_AkOJEEDxYICWRlS9HtNFMrujgruQJLanYHJURCxB3
wallet_v5r1=EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm
dedust_pool=EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm
dedust_pool_metadata=https://api.dedust.io/v2/pools/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98/metadata
dedust_jetton_wallet=EQC_W1HQhQhf3XyyNd-FW-K6lWFfSbDi5L2GqbJ7Px2eZzVz
swapcoffee_pool=EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D
swapcoffee_pool_metadata=https://lp.swap.coffee/0:03E561AE336BB09E406ADF43C14BF4669703F95408FE2B35DADE58FD8C99056A/metadata
swapcoffee_jetton_wallet=EQAT363NPdduFnHRL3cP96cbxhbtMZ7vJCiuH7lt7tcwjH9l
dao_contract=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
jetton_tonviewer=https://tonviewer.com/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
jetton_tonscan=https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
jetton_verifier=https://verifier.ton.org/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
jetton_dyor=https://dyor.io/token/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
dexscreener_token=https://dexscreener.com/ton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
dexscreener_stonfi=https://dexscreener.com/ton/eqaxh2vd3umfnrf29pkl6wsozxrt6_p2sxrnlzzh1vus0_mi
dexscreener_dedust=https://dexscreener.com/ton/eqdtj4lhut6bdtyeio99umznc9hzlq-tfoa9thrvyrlumefm
dexscreener_swapcoffee=https://dexscreener.com/ton/eqad5wgum2uwnkbq30pbs_rmlwp5vaj-kzxa3lj9jjkfaj-d
x1000_token=https://x1000.finance/tokens/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
metadata=https://dynamiccapital.ton/jetton-metadata.json
metadata_fallback=https://dynamic.capital/jetton-metadata.json
manifest=https://dynamiccapital.ton/tonconnect-manifest.json
manifest_fallback=https://dynamic.capital/tonconnect-manifest.json
docs=https://dynamiccapital.ton/docs
docs_fallback=https://dynamic.capital/docs
api=https://api.dynamiccapital.ton
api_fallback=https://dynamic.capital/api
geckoterminal_stonfi=https://www.geckoterminal.com/ton/pools/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI
geckoterminal_dedust=https://www.geckoterminal.com/ton/pools/EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm
geckoterminal_swapcoffee=https://www.geckoterminal.com/ton/pools/EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D
```

## Infrastructure Layout

```
dynamiccapital.ton
├── /jetton-metadata.json
├── /tonconnect-manifest.json
├── /assets/
├── /docs/
│   └── playbooks/
│       ├── liquidity-playbook.pdf
│       ├── jetton-playbook.pdf
│       └── dao-playbook.pdf
├── api.dynamiccapital.ton → Supabase Edge Functions
└── mini.dynamiccapital.ton → Telegram mini-app
```

## Branding, Security, and Verification

| Layer         | Actions                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| SSL           | Use Cloudflare or DigitalOcean App Platform for automatic HTTPS.         |
| IPFS Mirror   | Pin metadata JSON and critical assets to IPFS for redundancy.            |
| Resolver Auth | Restrict resolver modifications to the treasury wallet.                  |
| Verification  | Sign ownership proofs with TON Web3 verify tools.                        |
| Cross-Linking | Reference `dynamiccapital.ton` within Jetton metadata and app manifests. |

Wallets and explorers (TonViewer, DeDust, STON.fi, TonScan, TON DNS) will
recognise the verified domain and surface Dynamic Capital branding when these
checks are in place.

## Automation Benefits

- Domain-based Supabase and bot endpoints simplify versioning and portability.
- Explorers fetch official metadata directly from `dynamiccapital.ton`,
  preventing spoofed Jetton entries and enabling verified branding.
- Wallet verification surfaces "by dynamiccapital.ton" trust badges once the
  metadata URL resolves to the domain-hosted JSON.

## Recommended Next Steps

1. Host `jetton-metadata.json` under `dynamiccapital.ton` and mirror to IPFS.
2. Populate the TON DNS resolver with the registry keys listed above.
3. Verify Jetton metadata in Tonkeeper / Tonviewer so assets display the trusted
   issuer badge.
4. Migrate Supabase functions to `api.dynamiccapital.ton` and ensure HTTPS is
   enforced.
5. Publish `tonconnect-manifest.json` for wallet authentication flows.
6. Announce verification and domain consolidation across official communication
   channels.

## Compliance & Transparency

- Maintain signed TON DNS ownership proofs (treasury wallet).
- Publish Jetton audit reports at `https://dynamiccapital.ton/docs/audit`.
- Enable read-only Row Level Security (RLS) for liquidity analytics endpoints.
- Host DAO proposals at `https://dao.dynamiccapital.ton` when governance is
  live.

## Summary

- Anchor every production endpoint (apps, APIs, manifests, and metadata) to
  `dynamiccapital.ton` to guarantee a single source of truth.
- Use the TON DNS registry map so wallets and explorers auto-resolve the jetton,
  pools, and treasury addresses.
- Maintain redundant hosting (IPFS mirrors, SSL, signed ownership proofs) to
  preserve trust while keeping the domain copy authoritative.

By anchoring Jetton metadata, liquidity infrastructure, and automation pipelines
to `dynamiccapital.ton`, Dynamic Capital delivers a unified, verifiable on-chain
identity. This configuration provides trusted branding, simpler integrations,
and improved security across the TON ecosystem.
