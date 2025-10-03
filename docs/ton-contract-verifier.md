# TON Contract Verifier Integration

## Overview

The official TON Contract Verifier web application is open source and lives at [ton-blockchain/verifier](https://github.com/ton-blockchain/verifier). It provides a Vite-powered UI for publishing FunC source bundles, requesting backend compilation, and surfacing on-chain proofs from the TON Sources Registry contracts. Self-hosting the UI lets you pin a trusted build to your own infrastructure and align it with Dynamic Capital's wallet verification flows.

## Repository layout and build requirements

- **Framework**: Vite + React (TypeScript).
- **Package manager**: The upstream project uses `npm`, but `pnpm` or `yarn` work if you generate the lockfile yourself.
- **Environment variables**:
  - `VITE_VERIFIER_ID` — the verifier identifier registered on-chain.
  - `VITE_SOURCES_REGISTRY` / `VITE_SOURCES_REGISTRY_TESTNET` — registry contract addresses for mainnet and testnet.
  - `VITE_BACKEND_URL` / `VITE_BACKEND_URL_TESTNET` — comma-separated list of backend compilation endpoints per network.

Copy `.env` from the repository root into `.env.local` (or your hosting provider's secret store), then edit the values above for your deployment. Empty placeholders are ignored at runtime.

## Local development workflow

1. Clone the upstream repository and install dependencies:
   ```bash
   git clone https://github.com/ton-blockchain/verifier.git
   cd verifier
   npm install
   ```
2. Create `.env.local` with the required `VITE_*` settings (see above).
3. Launch the dev server:
   ```bash
   npm run dev
   ```
   Vite serves the UI at `http://localhost:5173` by default. Adjust ports via the standard Vite configuration if required.
4. Build a production snapshot when you're ready to deploy:
   ```bash
   npm run build
   npm run preview # optional smoke test
   ```

## Hosting considerations

- The static build in `dist/` can be served from any CDN or static host (Cloudflare Pages, Vercel, DigitalOcean App Platform, etc.).
- Harden the deployment by pinning the build artifact to decentralized storage (TON Storage or IPFS) before uploading to a CDN. This preserves an immutable checksum for auditors.
- If you mirror the UI under a Dynamic Capital domain, enforce HTTPS and add the hostname to `ALLOWED_ORIGINS` in the main application so Supabase functions accept callbacks.

## Linking with Dynamic Capital's verification flow

Set `TON_VERIFIER_URL` in the Supabase Edge Function environment (or `.env.local` when developing locally) to point at your hosted Contract Verifier instance. The `verify-payment` function will POST `{ txHash, wallet, amountTon }` to that endpoint before falling back to TonAPI. Ensure your deployment exposes a compatible JSON handler—either proxy the UI to the official backend or stand up the [ton-community/contract-verifier-backend](https://github.com/ton-community/contract-verifier-backend) alongside the UI. Optionally add `TON_VERIFIER_TOKEN` if your proxy requires bearer authentication.

## Additional resources

- [TON Contract Verifier UI repository](https://github.com/ton-blockchain/verifier)
- [TON Contract Verifier backend](https://github.com/ton-community/contract-verifier-backend)
- [TON Sources Registry contracts](https://github.com/ton-community/contract-verifier-contracts)
