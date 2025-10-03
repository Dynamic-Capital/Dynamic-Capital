# DCT Jetton Minter Verification

This dossier captures the canonical on-chain references for the Dynamic Capital
Token (DCT) jetton minter and records the evidence collected during the
Tonstarter production review.

## Contract Coordinates

| Item                  | Value                                              | Reference                                                                                                                                                                     |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jetton master address | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | [tonviewer](https://tonviewer.com/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) · [tonscan](https://tonscan.org/address/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| Treasury multisig     | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | [tonviewer](https://tonviewer.com/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq) · [tonscan](https://tonscan.org/address/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq) |
| DEX router            | `EQ7_nN5u5uv_HFwnGSsGYnTl_dhZeQmEBhWpDV8Al_yX8zn3` | [tonviewer](https://tonviewer.com/EQ7_nN5u5uv_HFwnGSsGYnTl_dhZeQmEBhWpDV8Al_yX8zn3) · [tonscan](https://tonscan.org/address/EQ7_nN5u5uv_HFwnGSsGYnTl_dhZeQmEBhWpDV8Al_yX8zn3) |
| Symbol / Decimals     | `DCT`, `9`                                         | [`dynamic-capital-ton/contracts/jetton/metadata.json`](../../dynamic-capital-ton/contracts/jetton/metadata.json)                                                              |
| Max supply            | `100,000,000 DCT`                                  | [`dynamic-capital-ton/config.yaml`](../../dynamic-capital-ton/config.yaml)                                                                                                    |

> **Note:** The deployment templates (`dynamic-capital-ton/config.yaml`,
> `dynamic-capital-ton/supabase/schema.sql`) now ship with the Tonstarter
> treasury multisig and STON.fi router listed above. Rotate the entries if the
> governance wallet or liquidity endpoint changes before redeploying.

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

### Mint activation playbook

When governance approves fresh emissions, operators can resume minting using the
[`DCT Mint Activation Runbook`](./start-minting.md). The helper script defined
there (`npm run ton:start-minting`) prepares the Jetton `mint` payload with the
new treasury and master addresses baked in, emits human-readable and JSON
summaries, and can persist a ready-to-upload BOC so multisig submissions
originate from `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` to the
canonical master contract `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y`.

## Checklist Outcome

| Check                      | Result | Evidence                                                                                        |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Jetton metadata published  | ✅     | `metadata.json` committed with symbol/decimals/logo fields.                                     |
| Explorer links archived    | ✅     | `_static/ton/dct-jetton/*` transcript snapshots listed above.                                   |
| Supply controls documented | ✅     | Deployment runbook in `contracts/README.md` and burn flow instrumentation in Supabase function. |

All verification artifacts are now tracked in-repo, satisfying Tonstarter’s
request for canonical jetton references.
