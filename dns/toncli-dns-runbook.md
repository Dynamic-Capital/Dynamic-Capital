# TON DNS configuration with toncli

This runbook explains how to publish and verify `dynamiccapital.ton` DNS
updates using `toncli`. It assumes that the domain NFT already exists and
is owned by a multisig or wallet that you control. The workflow generates
`change_dns_record` payloads from the repository's JSON snapshot and sends
them on-chain via a configured `toncli` wallet project.

## Prerequisites

- `toncli` installed and configured (see [`docs/toncli-setup.md`](../docs/toncli-setup.md)).
- Python 3 with the helper dependencies installed:

  ```bash
  pip install -r dns/requirements-toncli.txt
  ```

  This pulls in [`tonsdk`](https://pypi.org/project/tonsdk/) so the payload
  generator can build BOC cells.
- Access to the wallet that owns `dynamiccapital.ton` (seed phrase or
  encrypted key pair) and enough TON to cover gas (~0.05 TON per update).
- The resolver metadata JSON (for example
  [`dns/dynamiccapital.ton.json`](./dynamiccapital.ton.json)) reflects the
  records you intend to publish.

## 0. Provision the TON Site ADNL (if rotating)

If the TON Site endpoint needs a new ADNL, follow the
[`dns/toncli-adnl-setup.md`](./toncli-adnl-setup.md) guide first. It explains how
to generate the Ed25519 key pair with `npm run ton:generate-adnl`, capture the
seed securely, and update `dns/dynamiccapital.ton.json` so the helper script can
emit the correct payload.

## 1. Configure the wallet project

1. Initialise (or reuse) a `toncli` wallet project:

   ```bash
   toncli start wallet --name dns-updater
   cd dns-updater
   ```

2. Import the domain owner's keys into `keys/` and update
   `project.yaml` so `wallet_id`, `workchain`, and `wc_public` match the
   owner account. Confirm the wallet address matches
   `dns/dynamiccapital.ton.json → nft.ownerAddress`.

3. Copy the repository example configuration so `toncli` uses the pinned
   network snapshots:

   ```bash
   mkdir -p ~/.config/toncli
   cp ../dynamic-capital-ton/toncli.config.example.ini ~/.config/toncli/config.ini
   ```

   Adjust the `func`, `fift`, and `lite-client` executable paths in the
   copied file if they differ on your machine.

## 2. Build `change_dns_record` payloads

Use the helper script to turn the JSON snapshot into toncli-ready body
BOCs. The default command regenerates the TON Site (`site` category)
record pointing at the ADNL stored in the JSON file.

```bash
python ../dns/toncli_build_dns_update.py \
  ../dns/dynamiccapital.ton.json \
  --output ../dns/toncli-out
```

Example output:

```
Generated site payload → dns/toncli-out/site-change-dns-record.boc
```

Optional flags:

- `--categories site wallet storage` – build multiple records in one run.
- `--site-adnl <hex>` – override the ADNL without editing the JSON.
- `--wallet-address <addr>` – point the `wallet` record at a new owner or
  treasury address.
- `--storage-bag <hex>` – publish a TON Storage bag for the domain.
- `--next-resolver <addr>` – delegate subdomain resolution to another
  resolver contract.

See [`dns/toncli_build_dns_update.py`](./toncli_build_dns_update.py) for
full parameter support and validation logic.

## 3. Broadcast the update on-chain

1. Ensure the wallet project has been built and funded:

   ```bash
   toncli build
   toncli wallet
   ```

   The second command prints the bounceable and non-bounceable wallet
   addresses so you can cross-check funding on a block explorer.

2. Send the update from the wallet to the domain NFT contract. Replace
   `EQAD...` with the resolver contract from
   `dns/dynamiccapital.ton.json → resolver_contract` and adjust the BOC
   filename per category.

   ```bash
   toncli send --net mainnet \
     --address EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo \
     --amount 0.05 \
     --body ../dns/toncli-out/site-change-dns-record.boc
   ```

   - `--amount` should cover the forwarding fees and gas for the DNS
     contract. 0.05 TON is typically sufficient; raise it if the command
     reports insufficient funds.
   - Repeat the command for each generated `.boc` file when updating
     multiple categories.

3. Wait for the transaction to finalise (a few seconds on mainnet).
   Capture the resulting transaction hash for audit logs and, if
   required, mirror it in Supabase `tx_logs`.

## 4. Verify the resolver contents

Use the resolver's address to confirm the new record is stored on-chain.
The `dnsresolve` get-method returns the category record when you query
with a null byte (`"."`) and the category hash.

```bash
# Resolve the TON Site ADNL record
CATEGORY=$(python - <<'PY'
import hashlib
print(int.from_bytes(hashlib.sha256(b"site").digest(), 'big'))
PY)

toncli lite-client "runmethod EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo dnsresolve \"\\0\" $CATEGORY"
```

The second tuple element in the output is the serialized record cell.
Decode it with [`tonsdk`](https://pypi.org/project/tonsdk/) or
`toncli fift` to confirm the stored ADNL matches the intended value.

Additionally, wallets such as Tonkeeper can resolve
`dynamiccapital.ton` to verify the TON Site renders correctly.

## 5. Rollback and troubleshooting

- **Incorrect payload** – Re-run the helper script with the corrected
  values and send another update. Each call overwrites the existing key
  in the resolver dictionary.
- **Bounce errors** – Confirm the wallet has enough TON, the resolver
  address is correct, and the message uses a bounceable address.
- **Hash mismatch** – Ensure the JSON snapshot and on-chain state stay in
  sync. Commit JSON changes to version control whenever you push a new
  record so downstream automation can reproduce the update.

Document every DNS update (transaction hash, BOC hash, and payload
source) in the operations log ([`ton-dns-operations-log.md`](./ton-dns-operations-log.md))
to keep the Web3 ↔ Web2 provenance trail intact.
