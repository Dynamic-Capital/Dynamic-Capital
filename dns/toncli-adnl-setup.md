# TON Site ADNL provisioning with toncli

This guide walks through generating and activating a TON Site ADNL address so
`dynamiccapital.ton` can serve a static site through the TON Sites network. The
workflow uses the repository's helper tooling and `toncli` to produce the
cryptographic material, capture it securely, and publish the resolver update.

## 1. Generate a fresh Ed25519 key pair

1. Run the helper script to create a new site key pair and ADNL address:

   ```bash
   npm run ton:generate-adnl
   ```

   The command prints a JSON blob similar to:

   ```json
   {
     "adnl": "0:192631d3bc9dd251d3b6d5cd4e807c68e53e1b6126499d8c5db3e7bb4ccc9243",
     "publicKey": {
       "hex": "192631d3bc9dd251d3b6d5cd4e807c68e53e1b6126499d8c5db3e7bb4ccc9243",
       "base64": "0PiJ9VlwxSxHP7XyEV5sKzgj9jkgWOH8bCWdSPM5LGc="
     },
     "privateKey": {
       "base64": "lR5HC/aGcnhhQtrZTWki4MWyCq1VKvXuwMz4mZdT7Ts=",
       "note": "Store this 32-byte Ed25519 seed securely; it controls the TON Site certificate."
     }
   }
   ```

2. Immediately store the private key seed in the operations password manager and
   archive the JSON output in the encrypted infra vault. The 32-byte seed controls
   the TLS certificate for the TON Site endpoint—losing it requires a full site
   reprovisioning.

## 2. Record the ADNL in the domain snapshot

Update [`dns/dynamiccapital.ton.json`](./dynamiccapital.ton.json) so the
`ton_site` block references the freshly generated ADNL and public key:

```jsonc
{
  "ton_site": {
    "adnl_address": "0:<ADNL_HEX>",
    "public_key_base64": "<PUBLIC_KEY_BASE64>",
    "generated": {
      "command": "npm run ton:generate-adnl",
      "timestamp": "<ISO8601_TIMESTAMP>",
      "note": "ADNL derived from Ed25519 key pair for TON Site certificate provisioning"
    }
  }
}
```

Keep the previous values in Git history so auditors can trace key rotations.

## 3. Publish the site record with toncli

1. Regenerate the `change_dns_record` payload, injecting the new ADNL:

   ```bash
   python dns/toncli_build_dns_update.py \
     dns/dynamiccapital.ton.json \
     --output dns/toncli-out \
     --categories site \
     --site-adnl 0:<ADNL_HEX>
   ```

2. Broadcast the payload with the wallet that owns `dynamiccapital.ton`:

   ```bash
   toncli send --net mainnet \
     --address EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo \
     --amount 0.05 \
     --body dns/toncli-out/site-change-dns-record.boc
   ```

   Increase `--amount` if the resolver reports insufficient gas.

## 4. Verify resolver and TON Site availability

- Use the lite-client to confirm the resolver stored the new ADNL:

  ```bash
  CATEGORY=$(python - <<'PY'
import hashlib
print(int.from_bytes(hashlib.sha256(b"site").digest(), 'big'))
PY)

  toncli lite-client "runmethod EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo dnsresolve \"\\0\" $CATEGORY"
  ```

- Access `https://dynamiccapital.ton` through a TON-aware browser or Tonkeeper
  to validate the site certificate served under the new ADNL.

Document the key fingerprint, transaction hash, and resolver cell hash in the
operations run log so auditors can tie the Web3 update back to the key ceremony.
