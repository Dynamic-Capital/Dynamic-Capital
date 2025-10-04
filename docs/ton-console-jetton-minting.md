# Ton Console Jetton Minting Runbook

## Overview

This playbook explains how to use [Ton Console](https://tonconsole.com/) to mint
additional Dynamic Capital Token (DCT) supply from the on-chain jetton master
contract. It assumes the genesis deployment already satisfied the hard-cap and
governance constraints codified in the Tact sources.

## Prerequisites

- **Admin wallet:** Access to the multisig or custodial wallet configured as the
  jetton master `admin`.
- **Jetton master address:** Copy the DCT minter address from the on-chain
  dossier so it can be resolved inside Ton Console.
- **TonConnect-ready wallet:** Ton Console relies on TonConnect to sign
  transactions. Tonkeeper and OpenMask both work in production.
- **Operator entitlements:** The connected Ton Console workspace must have the
  Jetton Minter beta module enabled for the project handling DCT operations.

## Minting workflow

1. **Open the Jetton Minter.** Sign in to Ton Console, switch to the relevant
   project, and navigate to **Tokens → Jetton Minter**. Use the search box to
   paste the DCT jetton master address and open the detail view.
2. **Connect the admin wallet.** Click the TonConnect button in the upper-right
   corner and authorize the wallet that owns the jetton. Ton Console will load
   the connected wallet’s jetton balance and confirm ownership before showing
   privileged actions.
3. **Launch the Mint modal.** Inside the "Total Supply" row of the jetton card,
   click **Mint**. The control is only visible when the connected wallet matches
   the admin address defined in the jetton data.
4. **Enter the emission amount.** Specify the number of DCT tokens to mint in
   whole units. Ton Console automatically multiplies by the jetton decimals (9)
   before crafting the `JettonMint` payload.
5. **Confirm the transaction.** Review the TonConnect prompt, verify the TON fee
   allocation, and approve the transaction. Ton Console sends an internal
   message to the jetton master with opcode `0x00000015` (`JettonMint`) and a
   nested transfer to the connected wallet, matching the structure enforced by
   the Tact contract.
6. **Verify supply updates.** Wait for the toast notification to confirm success
   and refresh the jetton card. The "Total Supply" field should increase by the
   minted amount, and the connected wallet balance should reflect the new
   tokens.

## Post-mint validation

- **Hard-cap guard:** Cross-check the resulting supply against the `MAX_SUPPLY`
  constant (100,000,000 × 10^9 nanoDCT) defined in
  [`dynamic-capital-ton/contracts/jetton/master.tact`](../dynamic-capital-ton/contracts/jetton/master.tact).
  Ton Console surfaces RPC errors if the mint would exceed the cap.
- **Genesis lock:** Ensure `closeGenesis` was executed prior to production mint
  flows so only scripted emissions can succeed. The contract rejects mint
  attempts while `genesisClosed` is true unless they originate from the admin
  wallet.
- **Audit trail:** Record the Ton Console transaction hash in the operations
  ledger and notify finance so downstream burns or allocations stay reconciled.

## Closing minting access

Once the planned emissions land on-chain, immediately revoke the ability to mint
more supply until the next scheduled governance window. There are two paths: the
Ton Console UI for operators and the signed webhook for automated runs.

### Ton Console UI

1. Sign in to [Ton Console](https://tonconsole.com/) with the operator account
   that manages Dynamic Capital’s workspace (project ID `3672406698`).
2. Navigate to **Tokens → Jetton Minter**, open the DCT jetton card, and locate
   the **Mint settings** menu in the upper-right corner of the supply module.
3. Choose **Close minting**. Ton Console will prompt for confirmation and send a
   management message to the jetton master to flip the `mintable` flag off.
4. Refresh the card and confirm the banner now reads “Minting closed”. This
   status propagates to all project operators and prevents further emissions
   until re-enabled by the admin wallet.

### Automation webhook

Operations can also close minting through the Ton Console webhook interface. The
secret token provided by the console (store it as
`TONCONSOLE_WEBHOOK_TOKEN=<webhook token from Ton Console>`) must never be
committed to source control.

Run the helper script from the repo root:

```bash
TONCONSOLE_PROJECT_ID=3672406698 \
TONCONSOLE_WEBHOOK_TOKEN="$TONCONSOLE_WEBHOOK_TOKEN" \
npx tsx scripts/ton/close-minting.ts
```

The script calls `https://tonconsole.com/api/webhook/<token>` with a
`close_minting` action payload. Pass `--dry-run` first to inspect the JSON
before executing in production. Successful responses should log the JSON body
returned by Ton Console; any non-2xx status aborts with the response text so the
operator can retry manually.

## Troubleshooting

| Symptom                                    | Resolution                                                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mint button hidden                         | Confirm the connected wallet matches the `admin` address and that the jetton is marked `mintable` in Ton Console.                                                    |
| Transaction rejected with `genesis closed` | Reopen the deployment checklist and verify the mint is still part of the genesis allocation. Once genesis is permanently closed the contract cannot emit new supply. |
| Supply unchanged after approval            | Wait for the Ton Console poller to detect the transaction (up to ~75 seconds) or inspect the transaction hash in Tonviewer for failures.                             |
| TonConnect prompt shows unexpected fees    | Double-check the amount entered and ensure no extra forward TON was configured in the mint modal.                                                                    |
