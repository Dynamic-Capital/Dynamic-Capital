# Tonkeeper Ton Connect Staging Auth Runbook

## Objective

Mirror Ton Connect authorization flows against Dynamic Capital staging services
by pairing the Tonkeeper web wallet with Ton Connect demo dApps. This runbook
packages the environment requirements, boot configuration overrides, demo
manifest publishing, and validation steps needed to execute end-to-end wallet ↔️
dApp handshakes in staging once credentials are available.

## Pre-flight checklist

1. **Toolchain**
   - Install Node.js 20.7.0 (matches the Tonkeeper web monorepo guidance).
     Verify with `node --version`.
   - Enable Yarn 4 via Corepack and pin the workspace version:
     `corepack enable && corepack use yarn@4.3.0`.
   - Confirm Turbo is available through the repo scripts
     (`npx turbo --version`).
2. **Access**
   - Dynamic Capital staging TonAPI / Wallet API credentials (JWT, API keys, or
     tunnel URLs) for both mainnet-style and testnet sandboxes.
   - Tonkeeper-provided staging boot endpoint or build label (for example, a
     `web-staging` build key or alternate `boot` domain) that surfaces staging
     `tonkeeper_api_url` and Ton Connect bridge overrides.
   - Ton Connect demo manifest host with HTTPS (can be GitHub Pages, Vercel, or
     S3 behind CloudFront) so wallets can retrieve the manifest.
   - Telegram Mini App / bot credentials if flows must be validated inside
     Telegram clients.
3. **Networking**
   - Allow outbound HTTPS to `*.tonkeeper.com`, `*.tonapi.io`, Ton Connect demo
     hosting, and any Dynamic Capital staging ingress endpoints.
   - If testing inside Telegram, expose local hosts with `ngrok` or
     `localtunnel` so Telegram can reach your demo dApp callback URLs.

## 1. Prepare `tonkeeper-web` for staging

1. Clone the Tonkeeper web monorepo into an isolated workspace:
   ```bash
   git clone https://github.com/tonkeeper/tonkeeper-web.git tonkeeper-web && cd tonkeeper-web
   ```
2. Enable the Yarn 4 workspace and install dependencies:
   ```bash
   corepack enable
   corepack use yarn@4.3.0
   yarn install
   ```
3. Build shared packages that power the web app:
   ```bash
   yarn build:pkg
   ```
4. Launch the web wallet in development mode while pointing to staging build
   metadata. The simplest patch is to surface a Vite build override for
   `BrowserAppSdk.version` so boot requests can target a staging label:
   ```diff
   --- a/apps/web/src/libs/appSdk.ts
   +++ b/apps/web/src/libs/appSdk.ts
   @@
   -    version = packageJson.version ?? 'Unknown';
   +    version =
   +        import.meta.env.VITE_TONKEEPER_BUILD ??
   +        packageJson.version ??
   +        'Unknown';
   ```
   Apply the patch (either with `git apply` or Yarn’s patch workflow) and start
   the dev server with a staging build tag:
   ```bash
   VITE_TONKEEPER_BUILD=web-staging yarn --cwd apps/web start
   ```
5. If Tonkeeper provides a dedicated boot host for staging (for example
   `https://boot-staging.tonkeeper.com`), export it before starting Vite so the
   patched bundle can read it from `import.meta.env.VITE_TONKEEPER_BOOT_BASE`
   and feed it into `Tonendpoint` requests. Extend the patch above to thread the
   environment variable into `Tonendpoint.boot` when the value is present.

> ✅ Keep the staging patch out of `main` by stashing or using a throwaway
> branch. Production builds should continue to rely on the committed package
> version string so auto-update logic stays intact.

## 2. Inspect boot configuration with the helper script

The repository now ships `scripts/tonkeeper/tonendpoint-config.mjs` for querying
Tonkeeper boot endpoints without hand-crafting curl requests.

- Fetch mainnet staging configuration (replace `web-staging` and the boot URL
  with Tonkeeper’s actual staging identifiers):
  ```bash
  node scripts/tonkeeper/tonendpoint-config.mjs \
    --build web-staging \
    --platform web \
    --network mainnet \
    --boot https://boot.tonkeeper.com \
    --pretty
  ```
- Include `--network both` to collect mainnet and testnet payloads in a single
  JSON object.
- Supply credentials with `--header Authorization:Bearer <token>` if Tonkeeper
  restricts staging boot endpoints.
- Append `--output tonendpoint-staging.json` to persist the resolved
  configuration for sharing with the integration team.

Use the JSON payload to verify that `ton_connect_bridge`, `tonkeeper_api_url`,
`tonapiV2Endpoint`, and any feature flags (for swaps, gasless, 2FA, etc.) match
the staging expectations before wiring up demo apps.

## 3. Publish a Ton Connect demo manifest for staging

1. Fork or clone
   [`ton-connect/demo-dapp-with-wallet`](https://github.com/ton-connect/demo-dapp-with-wallet)
   into a sibling directory.
2. Update `public/tonconnect-manifest.json` with Dynamic Capital staging
   metadata:
   ```json
   {
     "url": "https://staging-demo.dynamic.capital/",
     "name": "Dynamic Capital Staging Demo",
     "iconUrl": "https://staging-demo.dynamic.capital/icons/tonconnect.png",
     "termsOfUseUrl": "https://staging-demo.dynamic.capital/terms.txt",
     "privacyPolicyUrl": "https://staging-demo.dynamic.capital/privacy.txt"
   }
   ```
3. Commit and publish the manifest to your HTTPS host. For GitHub Pages this can
   be as simple as pushing to `main`; for Vercel use `vercel deploy`.
4. Set the runtime manifest URL when starting the demo:
   ```bash
   cd demo-dapp-with-wallet
   npm install
   VITE_MANIFEST_URL=https://staging-demo.dynamic.capital/tonconnect-manifest.json npm run dev
   ```
5. If Telegram Mini App validation is required, provision an `ngrok` tunnel and
   update the bot’s menu / web app URL to the forwarded HTTPS address.

## 4. Link the demo dApp to the staging wallet

1. With `tonkeeper-web` running locally (Step 1) and the demo app live (Step 3),
   open the demo dApp in a desktop browser.
2. Initiate a Ton Connect connection and choose the QR code option. Scan it with
   the staging build of the Tonkeeper mobile app or open the universal link in
   the locally running Tonkeeper web instance.
3. Confirm the wallet fetches your staging Tonendpoint payload (inspect network
   requests to `boot.tonkeeper.com/keys` and ensure it resolves to staging APIs)
   and that the Ton Connect bridge matches staging expectations.
4. Approve the connection and execute a no-op transaction (for example, request
   the user’s address or send a testnet transfer) to ensure Tonkeeper signs via
   the staging infrastructure.

## 5. Verification checklist

- [ ] Tonkeeper web dev server bootstraps with staging `tonkeeper_api_url` and
      respects Dynamic Capital feature toggles (swaps, 2FA, etc.).
- [ ] Demo manifest is reachable over HTTPS and advertises accurate staging
      terms/branding.
- [ ] Ton Connect demo successfully completes connect → approve → response flows
      using staging keys.
- [ ] Wallet API requests hit Dynamic Capital staging ingress and return
      expected schemas.
- [ ] Optional Telegram Mini App flow returns to the demo via `twaReturnUrl`
      without console errors.
- [ ] Captured screenshots / HAR files are stored for audit (attach to the
      integration ticket or shared drive).

## 6. Next steps once credentials arrive

1. Replace placeholder URLs and tokens in the environment variables with the
   real Dynamic Capital staging secrets.
2. Re-run the helper script to capture a frozen copy of the staging Tonendpoint
   payload and share it with security/reliability stakeholders.
3. Update the Tonkeeper integration checklist entry to reflect successful
   staging execution and log any edge cases (rate limiting, bridge reliability,
   mobile vs. web differences).
4. Promote the tested manifest and wallet build identifiers to the production
   readiness checklist once QA signs off on the staging run.

---

**References**

- Tonkeeper web monorepo build guidance (`README.md`) for Node 20 + Yarn 4
  prerequisites.
- Ton Connect SDK developer workflow (`DEVELOPERS.md`) for linking demo dApps
  against local packages.
- Demo dApp README for manifest overrides, ngrok/localtunnel usage, and Telegram
  Mini App return URLs.
