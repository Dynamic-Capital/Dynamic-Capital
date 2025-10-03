# SignData in TON via TonConnect: Developer Guide

TonConnect's `signData` request lets wallets collect strong user consent by
signing structured payloads with the same Ed25519 key that authorizes TON
transactions. The signature can be validated in your backend or on-chain without
moving funds.

## Quick Start

1. Pick a payload format (`text`, `binary`, or `cell`).
2. Call `tonConnectUi.signData(payload)` from your dApp.
3. Receive `{ signature, address, timestamp, domain, payload }` from the wallet.
4. Reconstruct the signed bytes or cell and verify the signature with the wallet
   public key.
5. Enforce freshness (timestamp) and wallet binding (address) before acting on
   the result.

## When to Use SignData

Reach for SignData whenever you need explicit, auditable confirmation without
submitting an on-chain transaction—for example, profile updates, email or phone
linking, DAO membership agreements, or acceptance of terms of service.

| Property      | Details                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| Non-custodial | Wallets sign with the user's transaction key but cannot transfer funds. |
| Explicit      | Wallets render the payload (or warn for non-readable bytes).            |
| Auditable     | Persist signatures as receipts or pass them into smart contracts.       |

## Choosing a Payload Format

TonConnect supports three payload types. Use the following matrix to avoid
back-to-back conversions between human-readable text, hashes, and TL-B cells.

| Format   | What the wallet signs              | Wallet UI experience                  | Typical use cases                                                |
| -------- | ---------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `text`   | UTF-8 message                      | Rendered exactly as provided          | Disclosures, policy updates, off-chain agreements                |
| `binary` | Arbitrary bytes or hashes          | Warning: "Data is not human-readable" | Document receipts, content hashes, capability tokens             |
| `cell`   | TON cell with TL-B schema metadata | Schema preview + warning              | Smart-contract validated inputs, structured governance decisions |

> **Root type note:** When you provide multiple TL-B type definitions in
> `payload.schema`, the final type acts as the root for serialization and
> deserialization.

### `text` payload example

```ts
const payload = {
  type: "text",
  text: "I confirm deletion of my account and all associated data.",
};
```

### `binary` payload example

```ts
const payload = {
  type: "binary",
  bytes: "1Z/SGh+3HFMKlVHSkN91DpcCzT4C5jzHT3sA/24C5A==",
};
```

### `cell` payload example

```ts
const payload = {
  type: "cell",
  schema: "message#_ text:string = Message;",
  cell: "te6ccgEBAQEAVwAAqg+KfqVUbeTvKqB4h0AcnDgIAZucsOi6TLrf...",
};
```

## Requesting a Signature

```ts
const result = await tonConnectUi.signData({
  type: "text",
  text: "I confirm this action.",
});
```

Wallets resolve with:

```json
{
  "signature": "base64-ed25519-signature",
  "address": "0:9a...",
  "timestamp": 1710000000,
  "domain": "your-app.com",
  "payload": {
    "type": "text",
    "text": "I confirm this action."
  }
}
```

## Signature Construction

### Text and binary payloads

Wallets concatenate the components below, hash them with SHA-256, and sign the
result with Ed25519:

```
0xffff ++ "ton-connect/sign-data/" ++ Address ++ AppDomain ++ Timestamp ++ Payload
```

The payload chunk encodes a short prefix (`txt` or `bin`), the content length,
and either the UTF-8 bytes or the raw payload bytes.

### Cell payloads

Wallets assemble a cell and sign its hash:

1. Prefix `0x75569022`
2. CRC32 of the TL-B schema string
3. 64-bit timestamp
4. User wallet address
5. App domain string (stored as a reference)
6. Reference to the payload cell data

## Verification Workflow

### Off-chain verification

1. Reconstruct the signed message or cell using the same rules as the wallet.
2. Fetch the signer's public key (from TonConnect session data or your records).
3. Validate the signature:

   ```ts
   import nacl from "tweetnacl";

   const isValid = nacl.sign.detached.verify(hash, signature, publicKey);
   ```

4. Check that `result.address` matches the expected wallet address.
5. Enforce a maximum acceptable age for `result.timestamp`.

### On-chain verification (FunC/TVM)

Smart contracts can validate `cell` payload signatures by asserting:

1. Prefix `0x75569022`.
2. TL-B schema hash equality.
3. Timestamp freshness.
4. Wallet address match.
5. App domain string match.
6. Ed25519 signature validity using `check_signature`.

## Security Checklist

- Bind the signature to the wallet address you initiated the request with.
- Enforce timestamp freshness to mitigate replay attacks.
- Persist signatures and payloads for auditing or dispute resolution.
- For binary payloads, display a human-readable summary in your UI before
  invoking the wallet prompt.
- For cell payloads, version your TL-B schema so contracts can reject stale
  shapes.

## Resources

- [Demo dApp: SignData Playground](https://tonkeeper.github.io/demo-dapp-with-wallet)
- [JavaScript signing and verification reference](https://github.com/mois-ilya/ton-sign-data-reference)
- [On-chain FunC verification example](https://github.com/p0lunin/sign-data-contract-verify-example)
- [Tonkeeper SignData specification](https://github.com/tonkeeper/ton-connect-docs)
- [TON `check_signature` documentation](https://docs.ton.org/develop/func/stdlib#check_signature)

## Glossary

- **Cell:** A TON blockchain data structure that stores bits and references to
  other cells.
- **TL-B:** Type Language Binary, TON's schema language for defining serialized
  structures.
- **Public key:** The Ed25519 key published by the wallet and used to verify
  signatures.
- **Domain:** The requesting dApp domain displayed in the wallet during a
  SignData prompt.
- **Timestamp:** Unix epoch (seconds) marking when the user approved the
  payload.
