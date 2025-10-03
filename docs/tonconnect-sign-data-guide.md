# SignData in TON via TonConnect: Developer Guide

TonConnect's `signData` request gives wallets a way to confirm sensitive dApp
actions with a cryptographically verifiable signature instead of a simple button
press. Wallets display the payload, gather consent, and respond with an Ed25519
signature that you can validate off-chain or pass to smart contracts for
on-chain enforcement.

## When to Use SignData

Use SignData whenever a workflow requires explicit, auditable consent without
executing a TON transaction. Common examples include updating a public profile,
linking a new email or phone number, or agreeing to DAO terms.

Key properties:

- **Non-custodial:** The user signs with the same key that approves
  transactions, but the signature does not expose funds.
- **Auditable:** You can persist signatures as receipts or feed them into
  on-chain checks.
- **Explicit:** Wallets show users exactly what they are approving (for
  supported formats).

## Payload Formats

TonConnect supports three payload types. Choose the format that best matches
your use case and validation strategy.

### Text

Use text when humans need to read and confirm the content.

```ts
const payload = {
  type: "text",
  text: "I confirm deletion of my account and all associated data.",
};
```

- Shown exactly as provided in the wallet UI.
- Ideal for off-chain acknowledgements and legal-style agreements.

### Binary

Use binary when you need to sign arbitrary bytes or a hash.

```ts
const payload = {
  type: "binary",
  bytes: "1Z/SGh+3HFMKlVHSkN91DpcCzT4C5jzHT3sA/24C5A==",
};
```

- Suitable for receipts, document hashes, or data that should not be displayed
  directly.
- Wallets warn users that the payload is not human-readable.

### Cell

Use cell when smart contracts must validate or restore the payload.

```ts
const payload = {
  type: "cell",
  schema: "message#_ text:string = Message;",
  cell: "te6ccgEBAQEAVwAAqg+KfqVUbeTvKqB4h0AcnDgIAZucsOi6TLrf...",
};
```

- Encodes structured data that contracts can parse with TL-B schemas.
- Contracts can verify the signature using the schema hash, timestamp, wallet
  address, and domain.
- If multiple TL-B types are defined, the final type in the schema is treated as
  the root during serialization.

## Requesting a Signature

```ts
const result = await tonConnectUi.signData({
  type: "text",
  text: "I confirm this action.",
});
```

Wallets return an object containing the signature, the signing wallet address,
timestamp, originating domain, and the payload you provided.

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

Always verify that the returned `address` matches the wallet you prompted and
enforce reasonable timestamp freshness to prevent replay attacks.

## How Signatures Are Constructed

### Text and Binary Payloads

Wallets construct a byte buffer before signing:

```
0xffff ++ "ton-connect/sign-data/" ++ Address ++ AppDomain ++ Timestamp ++ Payload
```

The payload portion includes a prefix (`txt` or `bin`), the content length, and
the UTF-8 encoded text or bytes. The wallet signs `sha256(message)` with
Ed25519.

### Cell Payloads

Wallets build a TON cell containing:

1. Prefix `0x75569022`
2. CRC32 of the TL-B schema
3. 64-bit timestamp
4. Wallet address
5. App domain string reference
6. A reference to the payload cell

The wallet signs the hash of this cell using Ed25519.

## Verifying Signatures Off-Chain

Recreate the message (text/binary) or cell (cell payloads), fetch the signer's
public key, and validate with an Ed25519 library such as TweetNaCl.

```ts
import nacl from "tweetnacl";

const isValid = nacl.sign.detached.verify(hash, signature, publicKey);
```

Reject signatures whose addresses do not match the expected wallet, or whose
timestamps fall outside your allowed window.

## Verifying Signatures On-Chain

Smart contracts can verify cell-format signatures by checking:

1. Prefix `0x75569022`
2. TL-B schema hash
3. Timestamp freshness
4. Wallet address
5. App domain string
6. Ed25519 signature using `check_signature`

Example FunC implementations are available in the TonConnect ecosystem
repositories.

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
