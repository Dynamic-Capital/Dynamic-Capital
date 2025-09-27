# DCT Jetton Minter Verification

This dossier captures the canonical on-chain references for the Dynamic Capital
Token (DCT) jetton minter and records the evidence collected during the
Tonstarter production review.

## Contract Coordinates

| Item                  | Value                                              | Reference                                                                                                                                                                     |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jetton master address | `EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6` | [tonviewer](https://tonviewer.com/EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6) · [tonscan](https://tonscan.org/address/EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6) |
| Treasury multisig     | `EQBURNFundTreasury•••••••••••••••••••••••`        | Governance config in [`dynamic-capital-ton/config.yaml`](../../dynamic-capital-ton/config.yaml) (redacted for public release)                                                 |
| DEX router            | `EQDEXRouterPreferred•••••••••••••••••••`          | Governance config in [`dynamic-capital-ton/config.yaml`](../../dynamic-capital-ton/config.yaml) (redacted for public release)                                                 |
| Symbol / Decimals     | `DCT`, `9`                                         | [`dynamic-capital-ton/contracts/jetton/metadata.json`](../../dynamic-capital-ton/contracts/jetton/metadata.json)                                                              |
| Max supply            | `100,000,000 DCT`                                  | [`dynamic-capital-ton/config.yaml`](../../dynamic-capital-ton/config.yaml)                                                                                                    |

> **Note:** The treasury multisig and router placeholders above match the
> deployment template committed alongside the production build; replace with
> finalized addresses during mainnet deployment.

## Explorer Snapshots

Redacted text transcripts captured on 2025-05-10 are stored under
`_static/ton/dct-jetton/` to avoid shipping raw screenshots while preserving the
Tonstarter audit trail:

- `jetton-master-overview.txt` – tonviewer ownership, total supply, symbol, and
  decimals confirmation.
- `jetton-wallet-treasury.txt` – treasury wallet balances and recent mint
  events.
- `stonfi-dct-ton-pool.txt` – STON.fi pool analytics showing the jetton
  association.

Each transcript records the source URL, retrieval timestamp, and relevant
balances so auditors can independently replay the queries.

## On-Chain Supply Controls

- `closeGenesis` was executed after minting the 100M genesis allocation,
  permanently disabling unrestricted minting as described in
  [`dynamic-capital-ton/contracts/README.md`](../../dynamic-capital-ton/contracts/README.md).
- Holder-initiated burns remain active; the Supabase `process-subscription`
  function routes burn tranches through `burnDCT` and logs the resulting
  transaction hashes for finance review (see
  [`dynamic-capital-ton/supabase/functions/process-subscription/index.ts`](../../dynamic-capital-ton/supabase/functions/process-subscription/index.ts)).

## Checklist Outcome

| Check                      | Result | Evidence                                                                                        |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Jetton metadata published  | ✅     | `metadata.json` committed with symbol/decimals/logo fields.                                     |
| Explorer links archived    | ✅     | `_static/ton/dct-jetton/*` transcript snapshots listed above.                                            |
| Supply controls documented | ✅     | Deployment runbook in `contracts/README.md` and burn flow instrumentation in Supabase function. |

All verification artifacts are now tracked in-repo, satisfying Tonstarter’s
request for canonical jetton references.
