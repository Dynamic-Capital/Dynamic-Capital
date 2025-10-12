# TON Signer Mobile Application Specification

## Overview

The TON Signer mobile application is an open source, offline-first wallet
companion that manages cold-stored TON key material and signs blockchain
transactions. The application is designed to run entirely without network
access, enabling secure signing workflows on an air-gapped device while
remaining compatible with Tonkeeper and other wallets that implement the same
protocols.

## Key Features

- **Offline operation:** All critical flows function without an internet
  connection. Transactions are transported via QR codes or deeplinks and the app
  never attempts to communicate with remote services.
- **Multiple key support:** Users can store and switch between multiple TON (or
  supported network) keypairs within the same installation.
- **Secure signing:** Transactions are signed locally in SignerApp and can be
  exported back to Tonkeeper in the safe area without exposing private keys.
- **Tonkeeper interoperability:** The Signer protocol mirrors Tonkeeper's
  expectations, enabling seamless linking, transaction submission, and
  confirmation loops.
- **Encrypted storage:** Private keys are encrypted with the user's password and
  never leave the device, are exported, or copied to the clipboard.

## Privacy Principles

- No analytics or activity logging is collected; the application has no network
  connectivity by design.
- All secure data, including private keys and metadata, is encrypted with the
  user's password and is only accessible locally.
- Developers and maintainers have no ability to access user data.

## Supported Payload Previews

The Signer can decode and display the human-readable contents of common
transaction payloads before signing:

- TON value transfer with text comment.
- NFT transfer payloads.
- Jetton transfer payloads.

## Interface Overview

SignerApp can be installed on the same device as Tonkeeper or on a separate,
air-gapped device. Data exchange is supported via QR codes or deeplinks,
depending on the device setup and platform capabilities.

## Dynamic Offline Wallet Support

Dynamic offline mode keeps the signer isolated from any network while still
allowing flexible, multi-chain usage. To enable it end to end:

1. **Prepare a dedicated device**
   - Factory reset or wipe an existing handset, then keep it permanently in
     airplane mode.
   - Sideload the SignerApp build (from source or a verified package) using a
     wired transfer. Disable all auto-update and background network services.
2. **Provision keys locally**
   - Generate new wallets inside SignerApp or import seed phrases using the
     offline key manager. Each key can be tagged by chain (`ton`, `btc`,
     `tron20`) so the signer can dynamically select the right schema.
   - Assign strong passwords for every key vault. Back up the encrypted key set
     to external storage that never reconnects to the internet.
3. **Shuttle requests air-gapped**
   - Use animated QR codes or deeplinks encoded on another device to deliver
     unsigned transactions to the offline signer.
   - Validate the decoded payload preview before authorizing. Signing never
     exposes private material.
4. **Export signed payloads securely**
   - Mirror the transfer channel used for import (QR or deeplink). Ensure the
     recipient device is trusted before revealing the signed BoC.
   - Rotate keys or wipe the device immediately if an offline compromise is
     suspected.

Following this checklist keeps the signer cold while still supporting dynamic
network coverage and rapid transaction turnaround.

## Signing Protocol

Transactions originate in Tonkeeper and are presented to SignerApp for
authorization. Deeplinks follow the `tonsign://v1/` schema and accept the
parameters described below. Parameters marked with an asterisk (`*`) are
required.

| Parameter | Description | Default |
| --- | --- | --- |
| `network` | Blockchain/network selector. Accepts symbolic values (`ton`, `btc`, `tron20`). When `ton` is supplied, the same field can also contain numeric workchain identifiers (`-239` Mainnet, `-3` Testnet). | `ton` |
| `pk`* | Wallet public key (hex). Helps Signer select the correct key. | — |
| `body`* | Signature payload in hex (send only the body payload). | — |
| `return` | Callback URL for returning a signed transaction. If omitted, Signer displays a QR code. | — |
| `v` | TON wallet version (UI hint: `v3r1`, `v3r2`, `v4r2`, `v5r1`). | `v4r2` |
| `seqno` | Wallet sequence number. | `1` |

Example deeplink:

```
tonsign://v1/?network=ton&pk=5a13667c677535f94d8b365c7952e3b63e069babf8133d93470f8dad8055626d&body=b5ee9c7241010101000a0000100000000000000000768999bf
```

The deeplink above should be embedded in a QR code when transferring payloads
between devices.

### Inspecting signer payloads

Developers can decode signer requests or state-init blobs locally with the
`inspect-boc` helper:

```bash
tsx dynamic-capital-ton/apps/tools/inspect-boc.ts <hex-or-base64-boc>
```

The command prints each cell's hash, depth, and references so payloads can be
audited before being shared with the offline signer. Hex strings such as the
example above are detected automatically; base64 deeplinks can be pasted
verbatim.

### Return Parameter

When SignerApp runs on the same device as Tonkeeper, the `return` parameter
redirects the user back to the requesting application with the signed payload as
an additional `boc` parameter. For example, a return URL might redirect to
`https://wallet.tonkeeper.com/?boc=hex`.

Example with return parameter:

```
tonsign://v1/?network=ton&pk=5a13667c677535f94d8b365c7952e3b63e069babf8133d93470f8dad8055626d&body=b5ee9c7241010101000a0000100000000000000000768999bf&return=https://wallet.tonkeeper.com/
```

## Publishing Signed Transactions

After authorization within Signer, the signed payload is returned to Tonkeeper
using either `tonkeeper://publish` or the HTTPS fallback
`https://app.tonkeeper.com/publish` (primarily for iOS deep links). The signed
payload must be hex-encoded.

| Parameter | Description |
| --- | --- |
| `sign`* | Signature of the transaction hash in hex (`PrivateKey.sign(body.hash)`). |

Example deeplink:

```
tonkeeper://publish?sign=9dfab96f555563f48a641c628ae74168d37f7da1745bfd3cbf1b6013cce5533c03ae59e87c8ebe0146c1d832b797020ac29ff6a1797e7ae7d4b61df89c34540f
```

This URL is encoded as a QR code when Tonkeeper resides on a separate device.

## Wallet Pairing Flow

Signer can link wallets to Tonkeeper via deeplinks or QR codes. The linking
scheme uses `tonkeeper://signer/link` or `https://app.tonkeeper.com/signer/link`
(with the corresponding web variant `https://wallet.tonkeeper.com/signer/link`).

| Parameter | Description | Default |
| --- | --- | --- |
| `network` | Blockchain network identifier (`ton`, `btc`, `tron20`). | `ton` |
| `pk`* | Wallet public key in hex. | — |
| `name` | URL-safe key name, prefilled in Tonkeeper. | — |
| `local` | Pass `true` to indicate Tonkeeper opened locally from Signer. | — |

Example application deeplink:

```
tonkeeper://signer/link?pk=5a13667c677535f94d8b365c7952e3b63e069babf8133d93470f8dad8055626d&name=MyKey
```

Example web deeplink:

```
https://wallet.tonkeeper.com/signer/link?pk=5a13667c677535f94d8b365c7952e3b63e069babf8133d93470f8dad8055626d&name=MyKey
```

## QR Code Requirements

To ensure reliable scanning between devices, all QR codes should begin with the
appropriate schema prefix (`tonsign://` or `tonkeeper://`). Android-specific
recommendations:

- Error correction level: **M**.
- Maximum size: **256 characters** per code.
- Display duration for animated sequences: **100 ms** per QR code.

## Interaction Diagrams

The following sequences summarise the primary integration flows between
Tonkeeper and Signer. Each step may be mediated via QR codes (air-gapped) or
deeplinks (same device).

### Linking Flow

1. **Initiate linking**
   - *Deeplink:* The user taps **"Link wallet from Signer"** inside Tonkeeper.
   - *QR:* The user selects **"Link wallet"** within Signer.
2. **Transfer pairing payload**
   - *Deeplink:* Tonkeeper opens Signer with a linking deeplink.
   - *QR:* Signer renders a QR code that embeds `WalletLinkResponse`.
3. **Confirm in counterparty app**
   - *Deeplink:* Signer presents wallet options; the user confirms **"Link wallet"** to trigger a response deeplink back to Tonkeeper.
   - *QR:* Tonkeeper scans the QR code, launches the add wallet flow, and the user confirms the pairing.
4. **Persist pairing**
   - Tonkeeper stores the wallet and finalises the link.

### Signing Flow

1. **Create signing request**
   - *Deeplink:* The user taps **"Confirm and send"** in Tonkeeper, generating a `SignTransferRequest` deeplink.
   - *QR:* Tonkeeper encodes the same payload into a QR code for air-gapped usage.
2. **Authorize inside Signer**
   - Signer displays the confirmation screen; the user taps **"Sign"**.
3. **Return the signed payload**
   - *Deeplink:* Signer responds with a `SignTransferResponse` deeplink that Tonkeeper opens automatically.
   - *QR:* Signer renders a QR code carrying the signed payload for Tonkeeper to scan.
4. **Submit to the blockchain**
   - Tonkeeper receives the signed BoC and broadcasts the transaction.

## Security Considerations

- Enforce strong password requirements for encrypting key material.
- Perform all cryptographic operations within secure hardware modules when the
  device provides them (e.g., iOS Secure Enclave, Android Keystore).
- Keep Signer open source to enable independent security reviews and encourage
  contributions.
- Provide mechanisms to wipe keys after multiple failed password attempts or
  device compromise.

