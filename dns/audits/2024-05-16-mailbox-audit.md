# 2024-05-16 – dynamiccapital.ton mailbox audit

## Scope
- Confirmed the presence of contact mailboxes `hello@dynamiccapital.ton` and `support@dynamiccapital.ton` within the TON DNS configuration snapshot.
- Documented the verification steps for future compliance reviews.

## Verification steps
1. Reviewed `dns/dynamiccapital.ton.json` and ensured TXT records are present for the `hello` and `support` labels with `mailbox=` attributes pointing to the correct addresses.
2. Cross-checked Supabase contact metadata migrations to confirm the same addresses are referenced in downstream systems responsible for routing inbound requests.
3. Validated that public-facing resources (Telegram bot copy and branding config) align with the advertised mailbox aliases to avoid drift between DNS, marketing, and operations surfaces.

## Result
- TXT records for both aliases are tracked in `dns/dynamiccapital.ton.json` and ready for broadcast via `toncli`.
- No discrepancies were detected between the DNS bundle and application content sources at the time of this review.

## Follow-up actions
- Execute `toncli` broadcast once the multisig packet is approved and log the transaction hash in `dns/ton-dns-operations-log.md`.
- Add monitoring to alert if the TXT records drift from the documented mailbox addresses.
