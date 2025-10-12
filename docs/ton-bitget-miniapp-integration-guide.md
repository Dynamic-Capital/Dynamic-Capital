# Bitget Wallet Integration Guide for Telegram Mini Apps

Bitget Wallet and Bitget Wallet Lite both support TonConnect, which lets your
Telegram Mini App and companion web dapp deliver a unified wallet-linking
experience. Follow the steps below to configure TonConnect, surface Bitget in
your wallet selectors, and validate the experience across desktop, mobile, and
in-app browsers.

## Prerequisites

- **Telegram Mini App foundations.** Complete the
  [Telegram App Development Instructions](https://docs.ton.org/develop/dapps/telegram-apps)
  so your bot and mini app share a verified domain, HTTPS hosting, and the
  required `initData` validation middleware.
- **TonConnect manifest hosting.** Publish a TonConnect manifest (JSON) at a
  stable HTTPS URL that lists your dapp name, icon, and supported bridges. Many
  teams co-locate the manifest in their Next.js app under `/tonconnect-manifest`
  and serve it via Vercel or Cloudflare.
- **Package management.** Ensure your project uses Node 18+ and has `npm`
  available. The examples below assume a React/Next.js setup, but the same
  TonConnect bindings can be used in plain JavaScript.

## Install TonConnect UI bindings

Bitget Wallet integrates through the open TonConnect protocol. Install the UI
bindings so you can render wallet buttons, trigger modals, and manage session
state from React:

```bash
npm i @tonconnect/ui
```

If you maintain a TypeScript codebase, install the React helper package for type
support:

```bash
npm i @tonconnect/ui-react
```

> **Tip:** Pin the version in `package.json` during audits so production and
> mini app builds depend on the same TonConnect widgets.

## Publish a TonConnect manifest

Wallets load your metadata from a manifest file, so publish it before wiring up
the provider. The example below uses `/public/tonconnect-manifest.json` in a
Next.js project and assumes the app is hosted on Vercel:

```json
{
  "url": "https://your-domain.example",
  "name": "Your Mini App",
  "iconUrl": "https://your-domain.example/assets/tonconnect-icon.png",
  "termsOfUseUrl": "https://your-domain.example/legal/terms",
  "privacyPolicyUrl": "https://your-domain.example/legal/privacy",
  "bridge": {
    "url": "https://bridge.tonapi.io/bridge"
  },
  "manifestVersion": "1.0",
  "platforms": [
    "ios",
    "android",
    "macos",
    "windows"
  ]
}
```

Deployment checklist:

- Host the manifest over HTTPS and verify that
  `curl https://your-domain.example/tonconnect-manifest.json` returns `200`
  locally and from your production environment.
- Add the file to your CI/CD publish artifacts so staging and production point
  to the same URL, preventing mismatched wallet metadata.
- Keep icons under 512×512 px PNG to minimize load times inside the Telegram
  webview.

## Configure the TonConnect provider

Wrap the portion of your application that needs wallet access with the
`TonConnectUIProvider`. Provide your manifest URL and preferred UI
configuration. Example in a Next.js provider component:

```tsx
import { TonConnectUIProvider } from "@tonconnect/ui-react";

const TONCONNECT_MANIFEST_URL =
  "https://your-domain.example/tonconnect-manifest.json";

export function TonConnectProvider(
  { children }: { children: React.ReactNode },
) {
  return (
    <TonConnectUIProvider
      manifestUrl={TONCONNECT_MANIFEST_URL}
      actionsConfiguration={{
        returnStrategy: "back",
        twaReturnUrl: "https://t.me/your_bot/app",
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}
```

Key settings:

- `manifestUrl`: Points TonConnect-compatible wallets to your manifest.
- `actionsConfiguration.twaReturnUrl`: Ensures Telegram deep links redirect back
  into your mini app after signing.
- `actionsConfiguration.returnStrategy`: Keeps users inside the Telegram mini
  app by returning to the previous screen once the wallet sends a response.

## Surface Bitget Wallet in the web dapp selector

When your users open the web dapp in a desktop or mobile browser, let them pick
Bitget Wallet directly from the TonConnect modal:

1. Capture the Bitget metadata from the official manifest or from the Bitget
   developer portal.
2. Extend the wallets list configuration to include the Bitget entry.
3. Render a wallet button that opens the TonConnect modal.

```tsx
import { TonConnectButton, useTonConnectUI } from "@tonconnect/ui-react";

const BITGET_WALLET_CONFIG = {
  includeWallets: [
    {
      appName: "bitgetTonWallet",
      name: "Bitget Wallet",
      imageUrl: "https://web3.bitgetapps.com/icon-256.png",
      aboutUrl: "https://www.bitget.com/wallet",
      universalLink: "https://web3.bitgetapps.com/ton-connect",
      bridgeUrl: "https://bridge.web3.bitgetapps.com/bridge",
      deepLink: "tonconnect://bitgetTonWallet",
      jsBridgeKey: "bitgetTonWallet",
      platforms: ["ios", "android", "macos", "windows"],
    },
  ],
};

export function BitgetWalletButton() {
  const [ui] = useTonConnectUI();

  return (
    <TonConnectButton
      onClick={() =>
        ui?.openModal({ walletsListConfiguration: BITGET_WALLET_CONFIG })}
    />
  );
}
```

This configuration ensures that desktop users see Bitget Wallet in the list and
mobile users launch the Bitget app through a universal deep link. Confirm that
the Bitget manifest still exposes these URLs before each release. When the
[Bitget Wallet TonConnect manifest](https://web3.bitgetapps.com/tonconnect-manifest.json)
is unreachable (for example during DNS downtime), fall back to the cached values
above and surface a warning in your logs so the team can validate the production
behavior.

## Trigger a Bitget-only flow in the Telegram Mini App

Inside the Telegram Mini App, the fastest integration path is to bypass the full
wallet picker and open Bitget Wallet directly. Attach a handler that calls
`openSingleWalletModal` when the user taps **Connect Bitget Wallet**:

```tsx
import { useTonConnectUI } from "@tonconnect/ui-react";

export function ConnectBitgetAction() {
  const [ui] = useTonConnectUI();

  const connect = async () => {
    await ui?.openSingleWalletModal("bitgetTonWallet");
  };

  return (
    <button className="ton-button" onClick={connect}>
      Connect Bitget Wallet
    </button>
  );
}
```

Telegram loads the mini app inside a webview, so the call opens Bitget Wallet
via `ton://` deep link. After the user approves the session, the `TonConnectUI`
instance will emit the account details and your theme manager can update the
interface accordingly.

### Handle TonConnect session events

Track the connection lifecycle in your Mini App so product analytics and risk
systems can audit wallet interactions:

```tsx
import { useEffect } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";

export function WalletStatusBanner() {
  const wallet = useTonWallet();
  const [ui] = useTonConnectUI();

  useEffect(() => {
    const unsubscribe = ui?.onStatusChange((nextStatus) => {
      console.info("TonConnect status", nextStatus);
      // forward nextStatus to your logger or analytics pipeline
    });

    return () => unsubscribe?.();
  }, [ui]);

  if (!wallet) {
    return <span className="status status--disconnected">Not connected</span>;
  }

  return (
    <span className="status status--connected">
      Connected to {wallet.account.address}
    </span>
  );
}
```

`nextStatus` includes wallet metadata, permissions, and the connected account.
Persist the payload in your session store so support teams can replay user
journeys when debugging failed signatures.

## Support Bitget Wallet Lite

Bitget Wallet Lite ships inside some Telegram builds and inherits the same
TonConnect identifier (`bitgetTonWallet`). Detect the Lite environment via the
user agent or the `tonconnect://` callback payload. If the Lite build is
present, confirm that deep links resolve locally before falling back to the App
Store or Google Play listing.

Recommended checks:

- When the Telegram Web App environment equals `macos` or `windows`, prompt the
  user to scan a QR code with their mobile Bitget Wallet.
- When deep links fail (no Bitget installation), display a toast with store
  links: `https://apps.apple.com/app/bitget-wallet/id1609258880` and
  `https://play.google.com/store/apps/details?id=com.bitget.wallet`.

## Session lifecycle and testing

| Scenario                                 | Expected Behavior                                                   |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Desktop browser + Bitget plugin          | TonConnect modal lists Bitget; plugin handshake completes inline.   |
| Desktop browser + no plugin              | TonConnect shows QR; Bitget mobile app scans and links the session. |
| Mobile browser (non-wallet)              | `ton://` deep link opens Bitget; fallback redirects to store.       |
| Telegram Mini App + Bitget installed     | `openSingleWalletModal` deep links into Bitget and returns success. |
| Telegram Mini App + Bitget not installed | Show download prompt, allow QR fallback via `openModal`.            |
| Telegram Mini App + Lite build           | Connection remains in-webview; confirm signing and return payload.  |

Run through each scenario before launch so operations and support can replicate
user issues quickly.

## Recommended next steps

1. **Automate TonConnect status logging.** Subscribe to `onStatusChange` and
   stream wallet events into your analytics or logging stack for auditability.
2. **Harden manifest hosting.** Serve the manifest behind a CDN and monitor it
   for unauthorized changes that could reroute users to malicious wallets.
3. **Document recovery flows.** Capture screenshots of each Bitget prompt so the
   support team can guide users who struggle with approvals.
4. **Track Bitget updates.** Monitor the Bitget developer portal for bridge URL
   updates, Lite client rollout notes, and new TonConnect capabilities such as
   `signData` or multi-transaction batches.

Following these steps delivers a reliable Bitget Wallet experience across your
Telegram Mini App and the associated web dapp, while keeping compliance and
operations aligned on the TonConnect session lifecycle.
