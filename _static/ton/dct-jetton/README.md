# DCT Jetton On-chain Snapshot

_Last updated: 4 October 2025 (automated scan via `scripts/ton/dct-snapshot.ts`)._

## Jetton master status

- **Master address:** `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`
- **Token:** Dynamic Capital Token (DCT), 9 decimals, mintable
- **Total minted supply (tonapi):** `500` DCT (`500000000000` nanoDCT)
- **Reported holders:** `1` wallet (100% of minted supply)

## Supply controls (config vs on-chain)

- **Configured max supply:** `100000000` DCT (per `dynamic-capital-ton/config.yaml`)
- **Minted supply:** `500` DCT
- **Remaining to mint before lock:** `99999500` DCT
- **Action:** Mint the remaining max supply to the treasury-controlled jetton wallet, then submit `set_mintable(false)` from the treasury multisig to lock further issuance.

## Holder distribution (tonapi.io)

| Rank | Owner (friendly) | Jetton wallet | Balance |
| ---- | ---------------- | ------------- | ------- |
| 1 | `dynamiccapital.ton` (`0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38`) | `0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789` | `500` DCT |

_No other holders were returned by the Tonapi jetton holder endpoint._

## Treasury/admin wallet (`dynamiccapital.ton`)

- **TON balance:** `40.856076572` TON (nanotons: `40856076572`)
- **DCT balance:** `500` DCT held in jetton wallet `0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789`
- **Treasury coverage:** Treasury wallet currently holds 100% of minted DCT supply.
- **Domain resolver:** `dynamiccapital.ton` → owner `0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38`, expires `2026-10-02T11:22:24Z`

## DEX liquidity checks (automated)

| Venue  | HTTP status | Result |
| ------ | ----------- | ------ |
| STON.fi | `404` | Jetton not listed |
| DeDust | `404` | Jetton not listed |

## Reproduction

```bash
npx tsx scripts/ton/dct-snapshot.ts
npx tsx scripts/ton/query-ton-domain.ts dynamiccapital.ton
```

The helper script reads `dynamic-capital-ton/config.yaml`, queries Tonapi for the
jetton supply/holder set, and verifies whether the jetton appears on STON.fi or
DeDust. Output is captured in CI logs for audit purposes.
