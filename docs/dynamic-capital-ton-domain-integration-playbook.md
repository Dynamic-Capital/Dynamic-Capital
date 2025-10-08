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
- **Jetton Master:** `EQDSmz4R…ig6Wx_6y`
- **Treasury Wallet:** `dynamiccapital.ton` →
  `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq`

> **Note:** Only the treasury wallet should have permission to update the
> resolver record to preserve authoritative control.

## Domain-Level Registry Map

Store the following key-value pairs in the TON DNS TXT record so integrators can
auto-discover Dynamic Capital contracts and services when resolving
`dynamiccapital.ton`:

| Key                    | Address / URL                                                                   | Description                                           |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ton_alias`            | `dynamiccapital.ton`                                                            | DNS alias resolving deposits                          |
| `token_symbol`         | `DCT`                                                                           | Canonical ticker across wallets, pools, and exchanges |
| `jetton_master`        | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`                              | Dynamic Capital Token (DCT)                           |
| `treasury_wallet`      | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq`                              | Treasury & mint authority                             |
| `stonfi_pool`          | `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt`                              | STON.fi DCT/TON pool                                  |
| `stonfi_jetton_wallet` | `EQCAQ_smdGxj3EaqLCmOuDHAw56Ys8X9jG16XwaISsyiL-6_`                              | STON.fi jetton wallet for DCT                         |
| `wallet_v5r1`          | `EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm`                              | Jetton wallet (Wallet v5r1)                           |
| `dedust_pool`          | `EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI`                              | DeDust DCT/TON vault                                  |
| `dedust_jetton_wallet` | `EQDJZbKEVU0Grpni4bRnUkgaCHuTNJd4_aH58lvoYsidmBjm`                              | DeDust jetton wallet for DCT                          |
| `dao_contract`         | `future DAO multisig`                                                           | Governance executor                                   |
| `jetton_tonviewer`     | `https://tonviewer.com/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | Jetton explorer (Tonviewer)                           |
| `jetton_tonscan`       | `https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`   | Jetton explorer (Tonscan)                             |
| `api_endpoint`         | `https://api.dynamiccapital.ton`                                                | REST / Supabase gateway                               |
| `metadata`             | `https://dynamiccapital.ton/jetton-metadata.json`                               | Jetton metadata JSON (primary)                        |
| `web`                  | `https://dynamiccapital.ton`                                                    | Marketing & dashboard site                            |

## Integration Touchpoints

### Web, Mini Apps, and Wallet Auth

- Serve applications from `https://dynamiccapital.ton` (marketing + dashboards)
  and `https://mini.dynamiccapital.ton` (Telegram mini-app).
- Host `tonconnect-manifest.json` at
  `https://dynamiccapital.ton/tonconnect-manifest.json` to enable TON Connect v2
  login flows and reuse the same manifest for web and mini-app entry points.

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
    "stonfi_pool": "EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt",
    "stonfi_jetton_wallet": "EQCAQ_smdGxj3EaqLCmOuDHAw56Ys8X9jG16XwaISsyiL-6_",
    "wallet_v5r1": "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
    "dedust_pool": "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
    "dedust_jetton_wallet": "EQDJZbKEVU0Grpni4bRnUkgaCHuTNJd4_aH58lvoYsidmBjm",
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
stonfi_pool=EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt
stonfi_jetton_wallet=EQCAQ_smdGxj3EaqLCmOuDHAw56Ys8X9jG16XwaISsyiL-6_
wallet_v5r1=EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm
dedust_pool=EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI
dedust_jetton_wallet=EQDJZbKEVU0Grpni4bRnUkgaCHuTNJd4_aH58lvoYsidmBjm
dao_contract=EQDAOxyz...daoAddr
jetton_tonviewer=https://tonviewer.com/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
jetton_tonscan=https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
api=https://api.dynamiccapital.ton
metadata=https://dynamiccapital.ton/jetton-metadata.json
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
