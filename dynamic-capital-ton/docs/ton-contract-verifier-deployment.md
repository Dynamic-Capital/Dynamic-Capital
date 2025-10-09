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

## Fork and sync the verifier codebase

Dynamic Capital maintains its own fork of the upstream verifier so we can host
custom branding, environment defaults, and pre-built Dynamic Capital Token
bundles. Create the fork under the `dynamiccapital` organization (or your
personal GitHub namespace during staging) and wire the remotes as follows:

```bash
git clone git@github.com:dynamiccapital/verifier.git
cd verifier
git remote add upstream https://github.com/ton-blockchain/verifier.git
```

Use the fork's default branch for any UI tweaks or configuration committed to
source control. To stay current with upstream fixes, periodically pull from the
`upstream` remote and fast-forward merge into `main` before cutting a release
branch for deployment:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
```

Push the updated branch back to GitHub so GitHub Actions (or your preferred CI)
can produce the static build artifacts for hosting.

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

## Uploading static builds from the fork

To keep the deployment reproducible, publish the `dist/` output from your fork
to a dedicated branch (for example, `gh-pages`) or artifact repository after
each release build:

```bash
npm run build
git switch --orphan gh-pages
rm -rf .github src tests # remove source-only directories from the orphan branch
cp -R dist/* .
git add .
git commit -m "chore: publish verifier build"
git push -f origin gh-pages
```

If you prefer GitHub Actions, configure the workflow to upload the Vite build as
a Pages deployment or release asset so the Supabase function always fetches the
latest verified UI. Document the resulting CDN URL in the repository README and
update DNS so `verifier.dynamic.capital` resolves to the published build.

## Preparing Dynamic Capital Token verification bundles

The fork should include pre-generated source bundles for the Dynamic Capital
Token (DCT) jetton master and wallet contracts so auditors can reproduce on-chain
code hashes without rebuilding Tact locally:

1. Compile the contracts from `dynamic-capital-ton/contracts/jetton` using the
   canonical `config.yaml` parameters:
   ```bash
   toncli build --config config.yaml --output ./artifacts
   ```
2. Package the generated `.boc`, `.tvc`, and source `.tact` files into ZIP
   archives that follow the verifier's naming convention (for example,
   `dynamic-capital-jetton-master.zip` and `dynamic-capital-jetton-wallet.zip`).
3. Commit the archives to the fork under `static/artifacts/` so the hosted UI can
   surface "Download bundle" links alongside the verified contract metadata.
4. After deploying the updated UI, submit each bundle to the Sources Registry via
   the verifier UI to mark the on-chain Dynamic Capital Token contracts as
   `verified`.

Rebuild the bundles whenever the contracts change and update the published ZIP
files in the fork so users always receive byte-for-byte identical artifacts to
the versions registered on-chain.

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
