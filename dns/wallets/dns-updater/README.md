# DNS Updater Wallet Project

This directory contains the toncli wallet project used to sign resolver updates for
`dynamiccapital.ton`. The project structure mirrors the default `toncli start wallet`
template so the CLI can compile messages and broadcast resolver payloads after the keys
are restored.

## Hydrating the wallet

Use [`../provision_dns_wallet.py`](../provision_dns_wallet.py) to populate the project
with the authorised mnemonic. The script validates the derived address against
`dns/dynamiccapital.ton.json → nft.ownerAddress` and writes the signing artefacts that
`toncli` expects:

```bash
python dns/wallets/provision_dns_wallet.py \
  --mnemonic-b64 "$(secret-tool lookup DCT_TON_DNS_WALLET)" \
  --write-mnemonic
```

The command produces:

- `build/contract.pk` – 32-byte private key loaded by `fift/data.fif`.
- `build/contract.addr` – binary address payload consumed by `TonUtil.fif`.
- `build/contract_address` – human-readable raw, bounceable, and non-bounceable forms.
- `wallet.meta.json` – audit metadata (version, wallet ID, derived addresses).
- `keys/mnemonic.txt` (optional) – plaintext mnemonic for vault backups when
  `--write-mnemonic` is supplied.

All secret material lives under `build/` or `keys/` and is ignored via
[`.gitignore`](./.gitignore).

## Next steps after hydration

1. Run `toncli build` to confirm the wallet compiles with the restored keys.
2. Use `toncli wallet` to print the bounceable address and confirm it matches the
   resolver owner account (`UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G`).
3. Execute the DNS payload broadcast described in
   [`dns/toncli-dns-runbook.md`](../../toncli-dns-runbook.md) and record the resulting
   transaction hash in [`dns/ton-dns-operations-log.md`](../../ton-dns-operations-log.md).
