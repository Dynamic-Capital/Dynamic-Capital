# 2024-05-16 – dynamiccapital.ton mailbox audit

## Scope
- Confirmed the presence of contact mailboxes `hello@dynamiccapital.ton` and `support@dynamiccapital.ton` within the TON DNS configuration snapshot.
- Documented the verification steps for future compliance reviews.

## Verification steps
1. Reviewed `dns/dynamiccapital.ton.json` and ensured TXT records are present for the `hello` and `support` labels with `mailbox=` attributes pointing to the correct addresses.
2. Cross-checked Supabase contact metadata migrations to confirm the same addresses are referenced in downstream systems responsible for routing inbound requests.
3. Validated that public-facing resources (Telegram bot copy and branding config) align with the advertised mailbox aliases to avoid drift between DNS, marketing, and operations surfaces.
4. Ran `dns/verify_mailbox_records.py` against the DNS bundle to assert the TXT records match the expected aliases.

## Result
- TXT records for both aliases are tracked in `dns/dynamiccapital.ton.json` and ready for broadcast via `toncli`.
- No discrepancies were detected between the DNS bundle and application content sources at the time of this review.

## Evidence

```shell
$ dns/verify_mailbox_records.py
Mailbox verification succeeded.

label | mailbox | ttl | note
----- | ------- | --- | ----
hello | hello@dynamiccapital.ton | 3600 | General inquiries mailbox alias advertised through TON DNS
support | support@dynamiccapital.ton | 3600 | Customer support mailbox alias advertised through TON DNS
```

## Follow-up actions
- Execute `toncli` broadcast once the multisig packet is approved and log the transaction hash in `dns/ton-dns-operations-log.md`.
- Add monitoring to alert if the TXT records drift from the documented mailbox addresses.

## 2025-10-06 broadcast readiness status

- Installed the official TON toolchain AppImage bundle (`v2025.07`), extracted the native binaries, and placed `func`, `fift`, and `lite-client` in `/usr/local/bin`. Verified each executable advertises the published build metadata via the `-V` flag.
- Bootstrapped `toncli 0.0.43` after pinning the executable paths in `~/.config/toncli/config.ini` and downgrading `bitstring` to the 3.x API expected by the CLI. `toncli --help` now loads successfully and exposes the broadcast subcommands.
- The wallet project and private keys required to sign the DNS update are still absent from the repository workspace, so the TXT broadcast remains pending until governance restores the authorised signer.
