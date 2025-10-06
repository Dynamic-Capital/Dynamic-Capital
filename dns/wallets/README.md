# DNS Wallet Toolkit

This folder tracks the signing assets required to broadcast resolver updates for
`dynamiccapital.ton` via `toncli`. The [`dns-updater`](./dns-updater/) project mirrors the
standard toncli wallet template so operations can restore the authorised mnemonic and sign
`change_dns_record` payloads.

Use [`provision_dns_wallet.py`](./provision_dns_wallet.py) to hydrate the wallet project
with the governance-approved mnemonic, then follow the broadcast steps in
[`dns/toncli-dns-runbook.md`](../toncli-dns-runbook.md).
