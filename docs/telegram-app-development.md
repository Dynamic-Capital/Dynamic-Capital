# Telegram App Development Guide

This guide walks through the practical steps required to launch a Telegram bot,
ship a companion mini app, and integrate Bitget Wallet using Ton Connect. It is
intended for product and engineering teams standing up their first Telegram
experience.

---

## 1. Telegram Bot Development

### 1.1 How Telegram Bots Work

- A Telegram Bot is a virtual account that receives user messages through the
  Telegram Bot API. Telegram forwards every user interaction to the bot server
  you operate.
- The bot server is responsible for processing commands, storing state, and
  replying back to the user through the Bot API. No standalone client needs to
  be shipped—the bot lives inside the official Telegram apps.

### 1.2 Create a Bot with BotFather

1. Open Telegram, search for **@BotFather**, and start a chat.
2. Send `/newbot`, then follow the prompts to enter the display name and
   username (e.g., `demo_bot`).
3. BotFather returns a **bot token** that authorizes API calls. Store it in a
   secure secrets manager; you will load it at runtime with an environment
   variable such as `TELEGRAM_BOT_TOKEN`.
4. Optionally configure `/setdescription`, `/setuserpic`, and `/setcommands` to
   improve the in-chat experience.

> **Security Reminder:** Never hard-code the token in source control. Inject it
> via environment variables in development and production.

### 1.3 Stand Up a Bot Server

Use the official Bot API through the
[`node-telegram-bot-api`](https://github.com/yagop/node-telegram-bot-api)
library or any HTTP client. The example below mirrors the quick start flow from
BotFather and echoes back any text supplied after `/add`.

```ts
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new TelegramBot(token, {
  polling: true,
  testEnvironment: process.env.NODE_ENV !== "production",
});

bot.onText(/\/add\s+(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match?.[1]?.trim();

  if (!text) {
    return bot.sendMessage(chatId, "Usage: /add <text>");
  }

  return bot.sendMessage(chatId, `balabala... ${text}`);
});

bot.on("polling_error", (error) => {
  console.error("Polling error", error);
});
```

**Development vs. Production**

- Polling is simple for local development. When you are ready for production,
  switch to a webhook hosted at `https://<your-domain>/telegram/webhook` and
  register it with `bot.setWebHook()`.
- Protect the webhook endpoint with HTTPS, validate the
  `x-telegram-bot-api-secret-token` header, and add observability (logging,
  metrics, and alarms) around command handlers.

### 1.4 Operational Checklist

- Rotate bot tokens if an incident occurs and update environment variables.
- Track key commands (`/start`, `/help`, custom actions) with analytics for
  product insight.
- Maintain runbooks covering incident escalation, rate limiting, and manual
  broadcast procedures.

---

## 2. Telegram Mini App Development

### 2.1 Register a Mini App

1. Chat with **@BotFather** and run `/newapp`.
2. Provide the mini app title, short name, and HTTPS domain that will host your
   web app.
3. Telegram returns a web app link in the format
   `https://t.me/<bot_username>/<mini_app_path>`. Opening this link from a
   Telegram client loads your mini app inside a secure webview.

### 2.2 Build the Webview

Mini apps are standard web pages that use Telegram’s JavaScript bridge. Start
with a minimal scaffold and expand into your framework of choice (React, Vue,
etc.).

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Title</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    Hello World
  </body>
</html>
```

Key webview behaviors to implement:

- Call `Telegram.WebApp.ready()` once the UI has mounted so Telegram can size
  the container correctly.
- Respect theming by reading `Telegram.WebApp.colorScheme` and reacting to the
  `themeChanged` event.
- Use `Telegram.WebApp.expand()` when the interface should consume the full
  screen and `Telegram.WebApp.MainButton` for primary calls to action.

### 2.3 Handling State and Analytics

- Parse `Telegram.WebApp.initDataUnsafe` to obtain the user profile, chat ID,
  and optional `start_param` that triggered the mini app.
- Extract marketing parameters such as `utm_source` or campaign IDs from the
  query string to attribute traffic.
- Persist transient data with `sessionStorage`. Avoid long-term storage in the
  client; Telegram clears cache data frequently.

### 2.4 Quality Assurance

- Smoke-test the mini app on iOS, Android, and Desktop Telegram clients.
- Confirm the experience fails gracefully when opened in a regular browser
  (e.g., show a message instructing users to open the Telegram app).
- Run Lighthouse or your preferred performance tooling against the hosted page
  to verify Core Web Vitals.

---

## 3. Integrating Bitget Wallet with Ton Connect

### 3.1 Why Ton Connect

Telegram mini apps cannot directly access injected wallet providers. Instead,
Ton Connect uses an HTTP bridge so your web app can communicate with wallets
like Bitget Wallet through QR codes (desktop) or deeplinks (mobile).

### 3.2 Compose a Connect Request

Create a JSON payload that specifies your Ton Connect manifest and the data you
need from the wallet:

```json
{
  "manifestUrl": "https://<your-domain>/tonconnect-manifest.json",
  "items": [
    { "name": "ton_addr" }
  ]
}
```

Host `tonconnect-manifest.json` on the same domain as the mini app. It declares
your app name, icon, and permissions.

### 3.3 Build the Universal Link

Ton Connect transports the request via a universal URL. Encode the JSON payload
using URL-safe Base64 or `encodeURIComponent`.

```
https://<wallet-universal-url>?
  v=2&
  id=<hex_client_id>&
  r=<urlsafe(json.stringify(ConnectRequest))>&
  ret=back
```

Parameters:

- `v`: Protocol version; Bitget Wallet currently supports `v=2`.
- `id`: Client identifier encoded as a hexadecimal string (no `0x` prefix).
- `r`: URL-safe JSON representation of the ConnectRequest.
- `ret`: Where the wallet should return after the user acts. Use `back` to jump
  back to Telegram, `none` to stay in the wallet, or provide a custom URL.

Example encoded link:

```
https://bkcode.vip/ton-connect?v=2&id=4d725f278e98c9dfb55bbf83fbd7b565be17176e9f9c6fc75cd0ec700e241021&r=%7B%22manifestUrl%22%3A%22https%3A%2F%2Fapp.ston.fi%2Ftonconnect-manifest.json%22%2C%22items%22%3A%5B%7B%22name%22%3A%22ton_addr%22%7D%5D%7D&ret=none
```

### 3.4 Support Desktop and Mobile Flows

| Scenario                        | Implementation tips                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mobile deeplink                 | Link to `https://bkcode.vip/ton-connect...`; Bitget Wallet redirects via `bitkeep://` to the app. |
| Desktop QR                      | Render the universal link as a QR code for scanning.                                              |
| Telegram event page attribution | Append `utm_source=BitgetWallet` to the mini app URL so you can auto-connect.                     |
| Returning users                 | Store the last wallet connection state and reconnect silently when possible.                      |

### 3.5 Auto-Connecting Bitget Wallet

To open Bitget Wallet directly from Ton Connect UI, use
`openSingleWalletModal()` once you detect the Bitget campaign parameter.

```ts
import { TonConnectUI } from "@tonconnect/ui";

const tonConnectUI = new TonConnectUI({
  manifestUrl: "https://<your-domain>/tonconnect-manifest.json",
});

function shouldAutoConnect(params: URLSearchParams) {
  return params.get("utm_source") === "BitgetWallet";
}

async function initTonConnect() {
  const params = new URLSearchParams(window.location.search);

  if (shouldAutoConnect(params)) {
    await tonConnectUI.openSingleWalletModal("bitgetTonWallet");
  }
}

initTonConnect();
```

Log telemetry events such as `wallet_connect_attempt` and
`wallet_connect_success` so product teams can monitor the conversion funnel.

---

## 4. Testing and Launch Checklist

1. **Bot** – Run unit tests for command handlers, confirm `/start` and `/help`
   behave as expected, and monitor logs for rate-limit or auth errors.
2. **Mini app** – Validate on iOS, Android, and desktop Telegram clients.
3. **Wallet flows** – Test both deeplink and QR handshakes with Bitget Wallet in
   staging before pushing to production.
4. **Security** – Rotate tokens, verify HTTPS certificates, and ensure the Ton
   Connect manifest is reachable by external clients.

---

## Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram Mini App Guides](https://core.telegram.org/bots/webapps)
- [Ton Connect Specification](https://github.com/ton-blockchain/tonconnect)
- [@tonconnect/ui Package](https://github.com/ton-connect/sdk)

---

## Recommended Next Steps

1. Host the Ton Connect manifest on your production domain and set up a staging
   copy for testing.
2. Coordinate with Bitget Wallet to register your deeplink parameters and event
   tracking requirements.
3. Schedule a full end-to-end rehearsal covering bot commands, mini app flows,
   and wallet handshakes before launch day.
