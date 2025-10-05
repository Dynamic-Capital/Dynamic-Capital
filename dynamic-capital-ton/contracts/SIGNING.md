# Signing the discoverable FunC contract

The Dynamic Capital jetton master should be signed before any mainnet
broadcast. The steps below describe how to compile the FunC sources, export the
state-init, and authorize the deployment message with an offline signer.

## 1. Compile the contract artifacts

1. Generate the Fift assembly for the discoverable FunC contract:

   ```bash
   func -o build/discoverable-master.fif \
     jetton/discoverable/master.fc
   ```

2. Convert the assembly into a BoC that contains both the code and data cells.
   If you rely on the standard TON toolchain, one option is to run a Fift helper
   such as `func-to-fift.fif` or `func-to-boc.fif` shipped with the compiler:

   ```bash
   fift -s <path-to-helper>/func-to-boc.fif \
     build/discoverable-master.fif \
     build/discoverable-master.boc
   ```

   When using `toncli`, the equivalent command is `toncli build`. Any pipeline
   that produces a state-init BoC is acceptable as long as the output contains
   the exact code and data that will be deployed on-chain.

## 2. Compute the state-init hash

Use the TON toolchain to obtain the representation hash of the state-init BoC.
With `toncli` this can be done via:

```bash
toncli boc hash build/discoverable-master.boc
```

Record the resulting 256-bit hash. This value is what the offline signer will
authorize.

## 3. Prepare an offline signing request

Create a signing payload that embeds the state-init hash and desired workchain
address. The [`SIGNER_APP_SPEC.md`](../SIGNER_APP_SPEC.md) document describes the
`tonsign://` request schema supported by the Dynamic Capital Signer.
Populate the following query parameters:

- `network` – `ton` for mainnet or `sandbox` for testnet.
- `pk` – the public key of the deployment wallet.
- `body` – the base64-encoded state-init hash.
- `return` – (optional) callback URL for returning the signed payload.

Example request:

```
tonsign://v1/?network=ton&pk=<PUBLIC_KEY>&body=<BASE64_STATE_INIT_HASH>
```

QR encode or otherwise transfer the request to the offline signer. After
verification, the signer will return a signature in the `sign` parameter.

## 4. Assemble the deployment message

Combine the signed hash, state-init BoC, and any required deployment funds into
an external message. Broadcast the message with a trusted wallet or the TON
lite-client. Retain the signature and hash in deployment records for future
attestation.

Following this checklist ensures that the FunC contract is immutably signed
prior to activation and keeps the deployment aligned with Dynamic Capital's
security controls.
