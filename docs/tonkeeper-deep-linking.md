# Tonkeeper Deep Linking Guide

Tonkeeper deep links let web apps, native clients, and automations open a
specific screen inside a user's wallet without manual navigation. Use the
formats below to prefill transfers, launch staking views, or connect users to
Tonkeeper-compatible dApps from external experiences.

## Supported URI Schemes

Use the `{PREFIX}` placeholder to swap between equivalent schemes based on the
calling surface.

| Scheme                       | When to use                                                   | Notes                                                                                      |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ton://`                     | Cross-wallet standard that works with TON-compatible wallets. | Follows the broader TON URI specification so links can fall back to non-Tonkeeper clients. |
| `tonkeeper://`               | Mobile deep link for the Tonkeeper iOS and Android apps.      | Launches the installed Tonkeeper client directly.                                          |
| `https://app.tonkeeper.com/` | Browser-based experiences.                                    | Ideal for desktop flows and environments that do not support custom schemes.               |

## Transfer Actions

The following routes prefill the Tonkeeper Send screen. Replace `{ADDRESS}` with
the destination wallet (bounceable or non-bounceable) and include optional query
parameters as needed.

### 1. Standard Transfer

```
{PREFIX}transfer/{ADDRESS}?amount={AMOUNT}&text={TEXT}
```

- `amount` (optional) — TON amount in nanocoins.
- `text` (optional) — URL-encoded UTF-8 comment attached to the message.
- Omit parameters you do not need, e.g. `{PREFIX}transfer/{ADDRESS}` or
  `{PREFIX}transfer/{ADDRESS}?amount=100000`.

### 2. Transfer with Binary Payload

```
{PREFIX}transfer/{ADDRESS}?amount={AMOUNT}&bin={BINARY_DATA}
```

- `bin` — URL-encoded base64 BoC payload attached to the internal message.
- `amount` is required whenever `bin` is present.
- Tonkeeper displays a blind-signing warning so users can confirm payload
  details before proceeding.

### 3. Transfer with Expiry Timestamp

```
{PREFIX}transfer/{ADDRESS}?amount={AMOUNT}&text={TEXT}&exp={EXPIRY_TIMESTAMP}
```

- `exp` — Unix timestamp (seconds) after which the blockchain rejects the
  transaction.
- Include every parameter you submit during signing so the on-chain message is
  invalidated if the timestamp expires.

### 4. Jetton Transfer

```
{PREFIX}transfer/{ADDRESS}?jetton={JETTON_ADDRESS}&amount={AMOUNT}&text={TEXT}
```

- `jetton` — Jetton master address identifying the token contract.
- `amount` (optional) — Jetton amount in smallest units.
- `text` (optional) — URL-encoded comment.

## Non-Transfer Routes

| Action   | Format                                                   | Purpose                                                                         |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Buy TON  | `{PREFIX}buy-ton`                                        | Opens Tonkeeper's fiat on-ramp.                                                 |
| Staking  | `{PREFIX}staking`                                        | Navigates to the staking dashboard for bonding or unbonding TON.                |
| Pool     | `{PREFIX}pool/{ADDRESS}`                                 | Loads the specified liquidity pool by address.                                  |
| Exchange | `{PREFIX}exchange?provider={PROVIDER}&toToken={TOKEN}`   | Jumps to a third-party exchange. `provider` is required; `toToken` is optional. |
| Swap     | `{PREFIX}swap?fromToken={FROM_TOKEN}&toToken={TO_TOKEN}` | Prefills the swap interface with optional from/to tokens.                       |
| Battery  | `{PREFIX}battery?promocode={PROMOCODE}`                  | Opens Tonkeeper Battery and optionally applies a promo code.                    |
| Action   | `{PREFIX}action?eventId={EVENT_ID}`                      | Shows a transaction bottom sheet tied to a known event hash.                    |
| DApp     | `{PREFIX}dapp/{DAPP_URL}`                                | Launches the in-app browser for catalog-approved HTTPS dApps.                   |

## Tonkeeper Implementation Tips

- **URL encoding:** Encode special characters in `text`, `bin`, and other query
  values to prevent parsing errors.
- **Fallback handling:** Offer multiple schemes when possible. For example,
  render `tonkeeper://` for mobile clients and fall back to the HTTPS variant on
  desktop.
- **Security:** Explain blind-signing risks whenever you supply a `bin` payload,
  and surface expiry timestamps when you rely on `exp` so users understand that
  expired links must be regenerated.
- **Testing:** Validate links on both iOS and Android Tonkeeper builds to catch
  schema or encoding differences.

## Example Workflows

- **Quick payments:** Embed `{PREFIX}transfer/...` links in invoices or chatbots
  so users confirm transfers with a single tap.
- **In-app transactions:** Trigger transfers from your product's UI to move
  users between accounts without exposing private keys.
- **Cross-wallet compatibility:** Default to `ton://` links when you want other
  TON wallets (Tonhub, MyTonWallet, etc.) to handle the same experience.

## Tonhub Compatibility

Tonhub mirrors Tonkeeper's transfer structure. Use HTTPS links such as the
examples below when you want to support both wallets:

```
https://tonhub.com/transfer/{ADDRESS}?amount={AMOUNT}&text={TEXT}
```

Examples:

- `https://tonhub.com/transfer/EQD2NmD_lH5f5u1Kj3KfGyTvhZSX0Eg6qp2a5IQUKXxOG21n`
- `https://tonhub.com/transfer/EQD2NmD_lH5f5u1Kj3KfGyTvhZSX0Eg6qp2a5IQUKXxOG21n?amount=10000`
- `https://tonhub.com/transfer/EQD2NmD_lH5f5u1Kj3KfGyTvhZSX0Eg6qp2a5IQUKXxOG21n?text=just%20message`
- `https://tonhub.com/transfer/EQD2NmD_lH5f5u1Kj3KfGyTvhZSX0Eg6qp2a5IQUKXxOG21n?amount=7000&text=just%20message`

## Further Reading

- [TON Connect standard (`ton://` scheme)](https://github.com/ton-blockchain/ton-connect/blob/main/bridge.md)
- Tonkeeper updates occasionally introduce new actions—monitor release notes to
  keep your deep links current.
