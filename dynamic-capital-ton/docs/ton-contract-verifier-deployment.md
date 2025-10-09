# TON Contract Verifier Deployment Playbook

## Overview

Dynamic Capital relies on the open source
[TON Contract Verifier UI](https://github.com/ton-blockchain/verifier) to
surface on-chain proofs for FunC/Tact smart contracts and to publish new source
bundles. This runbook explains how to clone, configure, and host the upstream
Vite application so it can be consumed by the Supabase `verify-payment` Edge
Function as part of the treasury reconciliation workflow.

## Prerequisites

- Node.js 18+ and npm 9+ (matching the upstream `package.json`).
- Access to a TON verifier ID registered in the Sources Registry.
- Backend compilation endpoints from a trusted
  [contract-verifier-backend](https://github.com/ton-community/contract-verifier-backend)
  deployment or proxy.

## Environment variables

The verifier UI is configured entirely through Vite's build-time environment
variables. Create a `.env.local` file in the repository root and populate the
table below.

| Variable                                                  | Description                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `VITE_VERIFIER_ID`                                        | Verifier identifier registered on-chain.                           |
| `VITE_SOURCES_REGISTRY` / `VITE_SOURCES_REGISTRY_TESTNET` | Mainnet and testnet Sources Registry addresses.                    |
| `VITE_BACKEND_URL` / `VITE_BACKEND_URL_TESTNET`           | Comma-separated list of backend compilation endpoints per network. |

Example `.env.local` template:

```bash
VITE_VERIFIER_ID=dynamic-capital
VITE_SOURCES_REGISTRY=EQD-BJSVUJviud_Qv7Ymfd3qzXdrmV525e3YDzWQoHIAiInL
VITE_SOURCES_REGISTRY_TESTNET=EQAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_BACKEND_URL=https://verifier-backend.dynamic.capital/api
VITE_BACKEND_URL_TESTNET=https://verifier-backend-testnet.dynamic.capital/api
```

Placeholders left empty are ignored by the app at runtime, so keep unset values
blank instead of deleting the key.

## Local development

1. Clone the upstream repository and install dependencies:
   ```bash
   git clone https://github.com/ton-blockchain/verifier.git
   cd verifier
   npm install
   ```
2. Copy `.env.local` into the project root and adjust the values for your
   verifier ID, registry, and backend endpoints.
3. Launch the development server:
   ```bash
   npm run dev
   ```
   The UI defaults to `http://localhost:5173`; update the port via Vite config
   if required.
4. Build a production snapshot when ready to deploy:
   ```bash
   npm run build
   npm run preview # optional smoke test
   ```

The static artifacts under `dist/` can be deployed to any CDN or static host
(Cloudflare Pages, Vercel, DigitalOcean, etc.). Pin the build output to
decentralized storage (TON Storage or IPFS) to preserve an immutable checksum
for auditors before uploading to the host.

## Linking to Supabase verification

Expose the hosted verifier under a stable HTTPS URL and set the
`TON_VERIFIER_URL` environment variable for the Supabase `verify-payment`
function. The Edge Function will POST `txHash`, `wallet`, and `amountTon` to the
configured endpoint before falling back to TonAPI if the verifier responds with
`verdict: "unknown"` or `verified: null`.

Optional `TON_VERIFIER_TOKEN` support allows you to secure the verifier endpoint
with a bearer token—the function automatically prepends `Bearer` if the secret
does not already include the prefix. On successful responses (`verified: true`),
the function records the reported TON amount, response metadata, and the
declared data source for downstream auditing (see
`supabase/functions/verify-payment/index.ts`).

## Keeping parity with upstream releases

- Track upstream `verifier` releases for UI changes and new FunC compiler
  binaries. When the upstream project adds a new compiler version, replicate the
  dependency entry (for example, `"func-js-bin-0.4.x"`) in your fork and
  redeploy the backend configuration to expose the compiler.
- Re-run `npm install && npm run build` after pulling upstream changes to ensure
  the pinned lockfile incorporates the new asset versions.
- Document any local patches applied to the UI so auditors can compare your
  deployment against the official repository.
