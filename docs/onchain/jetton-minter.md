# DCT Jetton Minter Verification

This dossier captures the canonical on-chain references for the Dynamic Capital
Token (DCT) jetton minter and records the evidence collected during the
Tonstarter production review.

## Contract Coordinates

| Item                  | Value                                              | Reference                                                                                                                                                                     |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jetton master address | `EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6` | [tonviewer](https://tonviewer.com/EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6) · [tonscan](https://tonscan.org/address/EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6) |
| Treasury multisig     | `EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD` | [tonviewer](https://tonviewer.com/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD) · [tonscan](https://tonscan.org/address/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD) |
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
- Operations can stage controlled mint events via the `start-jetton-minter`
  Supabase function, which enforces the configured `JETTON_MINTER_NETWORK` guard
  and records the initiator, target supply, and mainnet transaction hash inside
  `jetton_minter_runs` for auditability (see
  [`dynamic-capital-ton/supabase/functions/start-jetton-minter/index.ts`](../../dynamic-capital-ton/supabase/functions/start-jetton-minter/index.ts)).
  A local dry-run harness is available through
  `scripts/supabase/run-start-jetton-minter.ts`, which mirrors the deployed
  handler and persists state to `supabase/.tmp/jetton-minter-state.json` for
  iterative rehearsals without touching production services. Operators can
  invoke it with familiar npm tooling:

  ```bash
  npm run supabase:run:start-jetton-minter -- --network testnet --initiator ops
  ```

## Holder Discovery

Operations can now query addresses that simultaneously hold a theme collection
NFT and the DCT jetton through the Supabase RPC function
`get_collection_jetton_holders`. The helper wraps the on-chain indexer tables
(`blockchain.accounts`, `getmethods.get_nft_data`, and
`getmethods.get_wallet_data`) so analysts do not have to stitch the joins by
hand. Example request:

```sql
select *
from public.get_collection_jetton_holders(
  'EQDvRFMYLdxmvY3Tk-cfWMLqDnXF_EclO2Fp4wwj33WhlNFT',
  'EQCcLAW537KnRg_aSPrnQJoyYjOZkzqYp6FVmRUvN1crSazV'
);
```

The function returns the `human_readable` TON addresses matching both
constraints, making it straightforward to export holder snapshots for snapshot
votes or allowlist reviews.

## Checklist Outcome

| Check                      | Result | Evidence                                                                                        |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Jetton metadata published  | ✅     | `metadata.json` committed with symbol/decimals/logo fields.                                     |
| Explorer links archived    | ✅     | `_static/ton/dct-jetton/*` transcript snapshots listed above.                                   |
| Supply controls documented | ✅     | Deployment runbook in `contracts/README.md` and burn flow instrumentation in Supabase function. |

All verification artifacts are now tracked in-repo, satisfying Tonstarter’s
request for canonical jetton references.
