# DCT Jetton Minter Verification

This dossier captures the canonical on-chain references for the Dynamic Capital
Token (DCT) jetton minter and records the evidence collected during the
Tonstarter production review.

## Contract Coordinates

| Item                   | Value                                              | Reference                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jetton master address  | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | [tonviewer](https://tonviewer.com/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) · [tonscan](https://tonscan.org/address/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| Treasury multisig      | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | [tonviewer](https://tonviewer.com/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) · [tonscan](https://tonscan.org/address/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| Treasury jetton wallet | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | [tonviewer](https://tonviewer.com/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq) · [tonscan](https://tonscan.org/address/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq) |
| DEX router             | `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` | [tonviewer](https://tonviewer.com/EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt) · [tonscan](https://tonscan.org/address/EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt) |
| Symbol / Decimals      | `DCT`, `9`                                         | [`dynamic-capital-ton/contracts/jetton/metadata.json`](../../dynamic-capital-ton/contracts/jetton/metadata.json)                                                              |
| Max supply             | `100,000,000 DCT`                                  | [`dynamic-capital-ton/config.yaml`](../../dynamic-capital-ton/config.yaml)                                                                                                    |

> **Note:** The deployment templates (`dynamic-capital-ton/config.yaml`,
> `dynamic-capital-ton/supabase/schema.sql`) now ship with the Tonstarter
> treasury multisig and STON.fi router listed above. Rotate the entries if the
> governance wallet or liquidity endpoint changes before redeploying.

### Address verification

Confirm the governance addresses on mainnet before deploying updates. The
`ton:mainnet-status` CLI wraps the toncenter checks and prints a summary for the
treasury, jetton master, treasury jetton wallet, and router:

```sh
npm run ton:mainnet-status
```

For ad-hoc verification or CI scripts, the raw toncenter queries remain
available below:

```sh
curl -s "https://toncenter.com/api/v2/getAddressInformation?address=0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38" \
  | jq '{balance: .result.balance, state: .result.state}'

curl -s "https://toncenter.com/api/v2/getAddressInformation?address=0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7" \
  | jq '{balance: .result.balance, state: .result.state}'

curl -s "https://toncenter.com/api/v2/getAddressInformation?address=0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789" \
  | jq '{balance: .result.balance, state: .result.state}'

curl -s "https://toncenter.com/api/v2/getAddressInformation?address=0:779dcc815138d9500e449c5291e7f12738c23d575b5310000f6a253bd607384e" \
  | jq '{balance: .result.balance, state: .result.state}'
```

Expect the treasury multisig, jetton master, treasury jetton wallet, and router
queries to return `"state": "active"`. Investigate any other status before
rotating configuration values.

#### 2025-10-05 toncenter confirmation

Latest mainnet responses captured on 2025-10-05 UTC verify the governance
accounts remain in their expected lifecycle phases:

| Account             | Friendly address                                   | State      | Raw balance (nanoton) |
| ------------------- | -------------------------------------------------- | ---------- | --------------------- |
| Treasury multisig   | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | `"active"` | `22755768333`         |
| Jetton master       | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | `"active"` | `74313081`            |
| DCT treasury wallet | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | `"active"` | `28931229`            |
| STON.fi router      | `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` | `"active"` | `3225088046992`       |

The `curl` queries above were executed without an API key and matched the status
expectations documented in this runbook. Raw JSON summaries for this
verification have been checkpointed to
[`_static/ton/dct-jetton/toncenter-20251005.json`](../../_static/ton/dct-jetton/toncenter-20251005.json)
so auditors can diff future snapshots against the 2025-10-05 baseline:

```json
{
  "treasuryMultisig": { "balance": "22755768333", "state": "active" },
  "jettonMaster": { "balance": "74313081", "state": "active" },
  "jettonTreasuryWallet": { "balance": "28931229", "state": "active" },
  "stonfiRouter": { "balance": "3225088046992", "state": "active" }
}
```

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
  For redeployments, follow the runbook in
  [`docs/onchain/close-genesis.md`](./close-genesis.md) to craft and submit the
  management message once the genesis supply is minted.
- Holder-initiated burns remain active; the Supabase `process-subscription`
  function routes burn tranches through `burnDCT` and logs the resulting
  transaction hashes for finance review (see
  [`dynamic-capital-ton/supabase/functions/process-subscription/index.ts`](../../dynamic-capital-ton/supabase/functions/process-subscription/index.ts)).

## Checklist Outcome

| Check                      | Result | Evidence                                                                                        |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Jetton metadata published  | ✅     | `metadata.json` committed with symbol/decimals/logo fields.                                     |
| Explorer links archived    | ✅     | `_static/ton/dct-jetton/*` transcript snapshots listed above.                                   |
| Supply controls documented | ✅     | Deployment runbook in `contracts/README.md` and burn flow instrumentation in Supabase function. |

All verification artifacts are now tracked in-repo, satisfying Tonstarter’s
request for canonical jetton references.
