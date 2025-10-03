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

## Signing Protocol

Transactions originate in Tonkeeper and are presented to SignerApp for
authorization. Deeplinks follow the `tonsign://v1/` schema and accept the
parameters described below. Parameters marked with an asterisk (`*`) are
required.

| Parameter | Description | Default |
| --- | --- | --- |
| `network` | Blockchain network identifier (`ton`, `btc`, `tron20`). | `ton` |
| `pk`* | Wallet public key (hex). Helps Signer select the correct key. | — |
| `body`* | Signature payload in hex (send only the body payload). | — |
| `return` | Callback URL for returning a signed transaction. If omitted, Signer displays a QR code. | — |
| `v` | TON wallet version (UI hint: `v3r1`, `v3r2`, `v4r2`, `v5r1`). | `v4r2` |
| `seqno` | Wallet sequence number. | `1` |
| `network` | TON network ID (`-239` for Mainnet, `-3` for Testnet). | `-239` |

Example deeplink:

```
tonsign://v1/?network=ton&pk=5a13667c677535f94d8b365c7952e3b63e069babf8133d93470f8dad8055626d&body=b5ee9c7241010101000a0000100000000000000000768999bf
```

The deeplink above should be embedded in a QR code when transferring payloads
between devices.

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

### Deeplink Linking

1. User taps **"Link wallet from Signer"** in Tonkeeper.
2. Tonkeeper generates a linking deeplink and opens it in Signer.
3. Signer displays a wallet selection screen and the user taps **"Link wallet"**.
4. Signer generates a link deeplink containing `WalletLinkResponse` and opens it
   in Tonkeeper.
5. Tonkeeper adds the wallet after user confirmation and saves the pairing.

### QR Code Linking

1. User selects **"Link wallet"** in Signer.
2. Signer generates a QR code embedding `WalletLinkResponse`.
3. Tonkeeper scans the QR code and parses the payload.
4. Tonkeeper launches the add wallet flow, the user confirms, and the wallet is
   saved.

### Deeplink Signing

1. User taps **"Confirm and send"** in Tonkeeper to create a transfer BoC.
2. Tonkeeper generates a `SignTransferRequest` deeplink and opens Signer.
3. Signer presents the confirmation screen; the user taps **"Sign"**.
4. Signer signs the payload and produces a `SignTransferResponse` deeplink.
5. Tonkeeper receives the signed payload and submits the transfer to the
   blockchain.

### QR Code Signing

For fully air-gapped flows, Tonkeeper renders a QR code containing the
`SignTransferRequest`. Signer scans the code, signs the payload, and renders a
QR code with the `SignTransferResponse`. Tonkeeper scans the signed payload and
submits it to the blockchain.

## Security Considerations

- Enforce strong password requirements for encrypting key material.
- Perform all cryptographic operations within secure hardware modules when the
  device provides them (e.g., iOS Secure Enclave, Android Keystore).
- Keep Signer open source to enable independent security reviews and encourage
  contributions.
- Provide mechanisms to wipe keys after multiple failed password attempts or
  device compromise.

