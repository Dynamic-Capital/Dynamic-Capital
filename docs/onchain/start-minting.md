# DCT Mint Activation Runbook

This playbook documents how to mint additional Dynamic Capital Token (DCT)
supply from the Tonstarter production deployment. Use it after refreshing the
treasury multisig or jetton master coordinates so the on-chain supply resumes
from the new addresses supplied by governance.

## Prerequisites

- Access to the treasury multisig that administers the jetton master contract:
  `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq`.
- Confirm the jetton master address is
  `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` by querying
  [`get_jetton_data`](https://tonviewer.com/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y).
- Node.js 20+ with the repository dependencies installed (`npm install`).
- The multisig signer seed phrase loaded into Tonkeeper, MyTonWallet, or the
  hardware signer used by operations.

## Generate the mint payload

The `tools/ton/start-minting.ts` helper builds a Jetton `mint` message body that
can be pasted into the multisig proposal UI or sent through the TON CLI. Run the
script with the desired mint amount (decimals respected) and the target jetton
wallet address.

```bash
npm run ton:start-minting -- \
  --amount 250000 \
  --destination EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq \
  --comment "Mint 250k DCT to treasury" \
  --forward-ton 0.05
```

The command prints:

- The base64-encoded BOC payload for the `mint` call.
- The nano DCT amount that will be minted (`250000 * 1e9` in the example).
- The TON forwarded to the destination jetton wallet (covers wallet storage and
  forwarding costs).

If you already calculated the nano DCT amount externally, pass `--nano-amount`
instead of `--amount`.

## Submit through the treasury multisig

1. Open the treasury multisig in Tonkeeper or your preferred wallet.
2. Create a new transaction targeting the jetton master address
   `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` with **0 TON** attached.
3. Paste the base64 payload generated in the previous step into the comment/body
   field.
4. Collect the required multisig approvals and broadcast the transaction.

The mint executes once the transaction is confirmed on-chain. The jetton master
forwards the minted balance plus the configured TON amount to the destination
jetton wallet.

## Post-mint verification

- Query the treasury jetton wallet on Tonviewer and confirm the balance
  increase:
  <https://tonviewer.com/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq>.
- Log the mint transaction hash in Supabase `tx_logs` with `kind = 'dct_mint'`
  for audit coverage.
- Update the `_static/ton/dct-jetton` transcripts if the mint materially changes
  circulating supply snapshots.
- Notify the finance channel so the new supply is reflected in liquidity,
  rewards, and buyback calculations.

## Troubleshooting

| Symptom                                | Resolution                                                                |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `genesis closed` error in multisig UI  | Governance previously executed `closeGenesis`; deploy a patched master or |
|                                        | roll back the action before minting.                                      |
| `insufficient funds` on submission     | Ensure the treasury multisig holds enough TON to cover forwarding costs   |
|                                        | (0.05 TON by default) and transaction fees.                               |
| Mismatched wallet ownership after mint | Verify you minted to the correct destination address and rerun the helper |
|                                        | with the intended wallet if necessary.                                    |
