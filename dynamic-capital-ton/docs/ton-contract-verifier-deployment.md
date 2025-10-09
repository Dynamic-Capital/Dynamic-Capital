# TON Contract Verifier Deployment Playbook

This runbook captures everything the Dynamic Capital engineering team needs to
own the TON Contract Verifier experience—from cloning the upstream UI to hosting
a reproducible build that serves Dynamic Capital Token bundles.

## Table of contents

- [Activation checklist](#activation-checklist)
- [Environment and tooling](#environment-and-tooling)
- [Repository strategy](#repository-strategy)
- [Local development workflow](#local-development-workflow)
- [Optimized build pipeline](#optimized-build-pipeline)
- [Publishing static artifacts](#publishing-static-artifacts)
- [Dynamic Capital Token bundles](#dynamic-capital-token-bundles)
- [End-to-end verification procedure](#end-to-end-verification-procedure)
- [Supabase integration](#supabase-integration)
- [Upstream maintenance cadence](#upstream-maintenance-cadence)

## Activation checklist

Before touching code, confirm the following prerequisites:

1. **Accounts and access**
   - GitHub organization permissions to create the
     [`dynamiccapital/verifier`](https://github.com/dynamiccapital/verifier)
     fork.
   - Sources Registry verifier ID with Dynamic Capital governance approval.
   - Access to the trusted
     [contract-verifier-backend](https://github.com/ton-community/contract-verifier-backend)
     deployment (production + testnet) or an internal proxy cluster.
2. **Toolchain**
   - Node.js **18.x** (LTS) and npm **9.x**; install via
     [fnm](https://github.com/Schniz/fnm) or [volta](https://volta.sh/) to lock
     versions per project.
   - `toncli` for FunC/Tact compilation (`pip install toncli`).
   - `zip` command line tools for packaging bundles.
3. **Secrets management**
   - Populate `.env.local` with read-only credentials; keep write-capable keys in
     your secrets manager (1Password, AWS Secrets Manager, etc.).

## Environment and tooling

The Vite UI reads build-time environment variables only. Create
`verifier/.env.local` with the template below and share a scrubbed copy in the
1Password vault so new maintainers can bootstrap quickly.

| Variable                                                  | Description                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `VITE_VERIFIER_ID`                                        | On-chain verifier identifier registered to Dynamic Capital. |
| `VITE_SOURCES_REGISTRY` / `VITE_SOURCES_REGISTRY_TESTNET` | Mainnet and testnet registry addresses.                     |
| `VITE_BACKEND_URL` / `VITE_BACKEND_URL_TESTNET`           | Comma-separated compilation endpoints per network.          |

```bash
VITE_VERIFIER_ID=dynamic-capital
VITE_SOURCES_REGISTRY=EQD-BJSVUJviud_Qv7Ymfd3qzXdrmV525e3YDzWQoHIAiInL
VITE_SOURCES_REGISTRY_TESTNET=EQAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_BACKEND_URL=https://verifier-backend.dynamic.capital/api
VITE_BACKEND_URL_TESTNET=https://verifier-backend-testnet.dynamic.capital/api
```

Unfilled values should remain blank to keep the keys discoverable inside the
build output.

## Repository strategy

Dynamic Capital tracks the upstream project via a long-lived fork that carries
branding, environment defaults, and pre-built bundles.

```bash
git clone git@github.com:dynamiccapital/verifier.git
cd verifier
git remote add upstream https://github.com/ton-blockchain/verifier.git
```

- Keep **`main`** fast-forwardable with `upstream/main` to reduce merge debt.
- Land Dynamic Capital customizations on feature branches and rebase before
  merging into `main`.
- Cut release branches (for example, `release/2024-06-ton-verifier`) for every
  production deployment so you can hotfix without blocking new work.

### Syncing with upstream

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
npm install # refresh the lockfile if upstream bumped dependencies
```

Push the fast-forward commit so CI can regenerate build artifacts immediately.

## Local development workflow

1. **Install dependencies**
   ```bash
   git clone https://github.com/ton-blockchain/verifier.git
   cd verifier
   npm install
   cp ../secrets/verifier.env .env.local # or manually populate variables
   ```
2. **Run the dev server**
   ```bash
   npm run dev
   ```
   The Vite preview listens on `http://localhost:5173` by default. Override the
   port through the `--port` flag if necessary.
3. **Lint before committing**
   ```bash
   npm run lint
   npm run typecheck
   npm run test # optional, executes UI component smoke tests
   ```
4. **Smoke test production output**
   ```bash
   npm run build
   npm run preview
   ```
   Inspect bundle sizes using Vite's output and flag regressions over 200 kB.

## Optimized build pipeline

Use GitHub Actions to keep builds reproducible. The workflow below installs the
correct Node version, caches npm modules, builds the static assets, and uploads
an artifact for deployment.

```yaml
name: build-verifier

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm run build
        env:
          VITE_VERIFIER_ID: ${{ secrets.VITE_VERIFIER_ID }}
          VITE_SOURCES_REGISTRY: ${{ secrets.VITE_SOURCES_REGISTRY }}
          VITE_SOURCES_REGISTRY_TESTNET: ${{ secrets.VITE_SOURCES_REGISTRY_TESTNET }}
          VITE_BACKEND_URL: ${{ secrets.VITE_BACKEND_URL }}
          VITE_BACKEND_URL_TESTNET: ${{ secrets.VITE_BACKEND_URL_TESTNET }}
      - uses: actions/upload-artifact@v4
        with:
          name: ton-verifier-dist
          path: dist
```

Key optimizations:

- `npm ci` ensures deterministic dependency installs.
- Cache hits keep build times under one minute after the first run.
- Environment variables flow from GitHub Secrets, eliminating plaintext copies.

## Publishing static artifacts

Two common hosting patterns are supported:

1. **GitHub Pages / Cloudflare Pages**
   - Push the `dist/` directory to a `gh-pages` branch via CI or manually.
   - For GitHub Pages, enable the Pages deployment on the repository settings.
2. **Object storage CDN (S3, R2, Backblaze B2)**
   - Upload the `dist/` contents as immutable versioned objects.
   - Configure `verifier.dynamic.capital` DNS to point at the CDN distribution.

Manual publication snippet (use sparingly—CI should own this):

```bash
npm run build
rm -rf publish && mkdir publish
cp -R dist/* publish/
cd publish
zip -r ../verifier-dist.zip .
```

Keep hashes of the `verifier-dist.zip` artifact in the release notes so auditors
can confirm integrity.

## Dynamic Capital Token bundles

Deliver pre-built jetton master + wallet bundles in the fork under
`static/artifacts/` to guarantee byte-for-byte parity with on-chain deployments.

1. **Compile contracts**
   ```bash
   cd dynamic-capital-ton/contracts/jetton
   toncli build --config ../../config.yaml --output ./artifacts
   ```
2. **Assemble bundles**
   ```bash
   cd artifacts
   zip dynamic-capital-jetton-master.zip master.boc master.tvc ../src/master.tact
   zip dynamic-capital-jetton-wallet.zip wallet.boc wallet.tvc ../src/wallet.tact
   ```
3. **Publish inside the fork**
   - Commit the ZIP archives under `static/artifacts/`.
   - Reference them in the UI so "Download bundle" buttons appear for auditors.
4. **Register with the Sources Registry**
   - Upload each ZIP via the hosted verifier.
   - Confirm the registry marks the contracts as `verified` before announcing the
     release.

Rebuild bundles whenever contract code or compiler flags change and rotate the
release tag accordingly.

## End-to-end verification procedure

Follow this checklist whenever you need to (re)verify the Dynamic Capital
Token contracts on mainnet or testnet. Treat every verification as an auditable
event—capture the command output and store it in the release ticket.

1. **Confirm on-chain references**
   - Note the master and wallet contract addresses from the latest deployment.
   - Record the exact FunC/Tact compiler versions used for the build (available
     inside `artifacts/metadata.json`).
   - Fetch the on-chain code cell hash with `toncli inspect --address <ADDR>` and
     compare it against the locally compiled `.boc` files.
2. **Upload bundles via the hosted verifier**
   - Visit `https://verifier.dynamic.capital` and authenticate with your
     read/write token.
   - Select **Jetton** → **Dynamic Capital Token** from the preset list (wired in
     by referencing `static/artifacts/` in the forked UI).
   - Provide the target network (mainnet or testnet), contract address, and the
     ZIP archive generated in [Dynamic Capital Token bundles](#dynamic-capital-token-bundles).
   - Submit the verification job and wait for the "Verified" banner.
3. **Cross-check through the API**
   - Call the backend directly to capture an immutable audit log:

     ```bash
     curl -X POST "${VITE_BACKEND_URL}/verify" \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer ${TON_VERIFIER_TOKEN}" \
       -d '{
         "network": "mainnet",
         "address": "<MASTER_CONTRACT_ADDR>",
         "bundleUrl": "https://verifier.dynamic.capital/static/artifacts/dynamic-capital-jetton-master.zip"
       }'
     ```

     Swap `network` and `bundleUrl` for the wallet contract and for testnet as
     required. Archive the JSON response in the release ticket.
4. **Register verification state**
   - In the Sources Registry UI, confirm the contracts transitioned to the
     `verified` state with the expected build hash.
   - Update the Dynamic Capital changelog with links to the registry entries and
     attach the saved API responses.
5. **Monitor Supabase events**
   - Trigger a nominal payment that should be gated by verification.
   - Inspect the `verify-payment` Edge Function logs to ensure the `verified`
     flag was consumed before the payment was marked settled.

## Supabase integration

Expose the hosted verifier URL and configure the Supabase Edge Function in
`supabase/functions/verify-payment/index.ts`:

```env
TON_VERIFIER_URL=https://verifier.dynamic.capital
TON_VERIFIER_TOKEN=prod-ton-verifier-rw-token
```

The function records TON payment confirmations only when the verifier responds
with `verified: true`. Keep the token scoped to read-only endpoints if possible
and rotate every quarter.

## Upstream maintenance cadence

- Watch the upstream repository for tagged releases and FunC compiler updates.
- When upstream adds a compiler binary (for example `func-js-bin-0.4.x`), mirror
  the dependency in your fork and update backend configuration to expose the new
  compiler.
- Run `npm ci && npm run build` before merging upstream changes to ensure the
  lockfile and static assets stay in sync.
- Document any local patches in the fork's `CHANGELOG.md` so auditors can review
  deviations from the official project.

