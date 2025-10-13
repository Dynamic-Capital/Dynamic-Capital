# Closing the DCT Jetton Genesis Window

Once the 100 million DCT genesis allocation is minted, the jetton master must
receive the `closeGenesis` message so that any further mint attempts are
permanently rejected. This runbook explains how to craft and deliver that
message from the admin wallet.

## Preconditions

- The full genesis allocation has been minted and reconciled against the
  distribution schedule.
- You can sign transactions from the multisig (or custodial wallet) configured
  as the jetton master `admin`.
- The jetton master address is confirmed from the deployment dossier (see
  [`docs/onchain/jetton-minter.md`](./jetton-minter.md)).

## Generate the payload

Use the helper script to build the opcode payload required by the contract:

```bash
npx tsx scripts/ton/close-genesis.ts --deeplink EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y
```

The command prints the `closeGenesis` message body in both base64 and hex, and
produces a `ton://transfer/...` deep link aimed at the jetton master address.
Share the base64 string with any custodial signer that prefers raw payloads, or
open the deep link directly in Tonkeeper / Tonhub to prefill the transaction.

- Omit `--deeplink` to generate just the base64 / hex body.
- Pass `--query-id <number>` if you need to stamp a 64-bit query identifier for
  multisig bookkeeping.
- Use `--amount <tons>` or `--nanotons <value>` when the admin wallet must send
  additional TON alongside the message (not required in normal operations).

## Submit from Ton Console

1. Connect to [Ton Console](https://tonconsole.com/) with the workspace that
   manages Dynamic Capital’s jetton operations.
2. Open **Tokens → Jetton Minter** and search for the DCT jetton master.
3. Click **Send message** in the action bar, choose the connected admin wallet,
   and paste the base64 payload produced above into the **Body** field. Leave
   the TON amount at `0.0` unless instructed otherwise.
4. Confirm the TonConnect prompt. The transaction should settle within a few
   seconds.

## Post-close verification

After the transaction lands on-chain:

1. Reload the jetton card in Ton Console or tonviewer to ensure the master
   account reflects the new inbound message.
2. Attempting another mint should now fail with `"genesis closed"`. You can
   confirm this by running a dry-run mint inside Ton Console (do **not** submit
   it) or by calling the master contract’s `get_jetton_data` method and checking
   that `mintable = false`.
3. Record the transaction hash in the operations log and update the
   `docs/onchain/jetton-minter.md` dossier if this is part of a redeployment.

With `closeGenesis` executed and the admin slot renounced, all further supply
changes are impossible—DCT now remains permanently capped at the 100M genesis
allocation.
