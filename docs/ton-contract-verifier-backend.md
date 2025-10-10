# TON Contract Verifier Backend Runbook

## Overview

The
[ton-community/contract-verifier-backend](https://github.com/ton-community/contract-verifier-backend)
service compiles FunC and Tact projects, signs the output, and uploads the
resulting bundle to IPFS so it can be published through the TON Sources
Registry. Dynamic Capital deploys the backend alongside the Contract Verifier UI
to power end-to-end proof generation for wallet and token audits.

This document captures the dependencies, environment variables, and operational
steps required to stand up and maintain a production-ready backend instance.

## Architecture

- **Runtime**: Node.js 22.x with `ts-node` for on-the-fly TypeScript execution.
- **Web framework**: Express with async error handling, CORS, and rate limiting.
- **Compilation toolchain**:
  - FunC binaries (0.2.x, 0.3.x, 0.4.x) and matching `fiftlib` folders.
  - Tact compiler builds (1.4.0, 1.4.1, 1.6.7) bundled as scoped npm packages.
  - Tolk transpiler (`@ton/tolk-js` 0.12) to support the latest Tact contracts.
- **Storage**: IPFS uploads via Infura or a compatible pinning service.
- **Signing**: Ed25519 key material stored in `PRIVATE_KEY`, validated by the
  Sources Registry verifier contract.

The backend exposes REST endpoints that the UI and automation scripts call to
submit bundles, stream compilation logs, and publish signed proofs.

## Prerequisites

### System packages

1. Node.js **22.x** (use `fnm`, `volta`, or `nvm` to pin the runtime).
2. `npm` **10.x** (ships with Node.js 22). Avoid mixing package managers to keep
   the lockfile deterministic.
3. `zip` and `unzip` for handling uploaded bundles.

### FunC toolchain layout

Download prebuilt binaries from
[ton-defi-org/ton-binaries](https://github.com/ton-defi-org/ton-binaries) or the
official [ton-blockchain/ton](https://github.com/ton-blockchain/ton) repository
and place them under `resources/binaries` before launching the backend:

```
resources/
  binaries/
    0.2.0/
      func
      fift
      fiftlib/
    0.3.0/
      func
      fift
      fiftlib/
    0.4.0/
      func
      fift
      fiftlib/
```

Ensure the binaries are executable (`chmod +x`). Add additional versions as the
Sources Registry expands support.

## Environment variables

Create `.env` (or configure your orchestrator secrets) with the following keys:

| Variable           | Purpose                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `INFURA_ID`        | Infura project ID for IPFS uploads. Required unless you use a self-hosted IPFS node.        |
| `INFURA_SECRET`    | Infura project secret used with `INFURA_ID` for authenticated uploads.                      |
| `PRIVATE_KEY`      | Ed25519 private key that signs compilation outputs. Keep this in an HSM or secrets manager. |
| `SOURCES_REGISTRY` | Address of the Sources Registry contract (defaults to mainnet).                             |
| `VERIFIER_ID`      | Verifier identifier registered on-chain for Dynamic Capital.                                |
| `PORT`             | Optional port override for the Express server (defaults to 3000).                           |
| `LOG_LEVEL`        | Optional Winston logger level (`info`, `debug`, etc.).                                      |

For Dynamic Capital's staging and production deployments, load these values from
1Password or the infrastructure secrets backend. Never check private keys into
source control.

## Local development

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/ton-community/contract-verifier-backend.git
   cd contract-verifier-backend
   npm install
   ```
2. Populate `.env` with non-production credentials (for example, a test verifier
   key and a dedicated Infura project).
3. Prepare the `resources/binaries` directory described above.
4. Start the backend:
   ```bash
   npm run start
   ```
   The server listens on `http://localhost:3000` by default. Use tools like
   `curl` or the Contract Verifier UI to submit a sample bundle and confirm that
   the compile + sign flow succeeds.
5. Run tests and the TypeScript build check before opening a pull request:
   ```bash
   npm run build
   npm run test
   ```

## Deployment considerations

### Containerization

Dynamic Capital deploys the backend as a container image. Include the FunC
binaries inside the image under `/app/resources/binaries`. A minimal Dockerfile
looks like:

```Dockerfile
FROM node:22-bullseye

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
COPY resources /app/resources

ENV NODE_ENV=production
CMD ["npm", "run", "start"]
```

Mount secrets at runtime (Docker secrets, Kubernetes `Secret`, or platform
variables) so the image remains portable.

### Heroku or PaaS

If you deploy to Heroku, attach the
[Func compiler buildpack](https://github.com/ton-defi-org/heroku-buildpack-func-compiler)
after the Node buildpack to provision the binaries. Populate config vars for the
environment keys listed above.

### Observability and scaling

- Enable structured logs by setting `LOG_LEVEL=info` and forward stdout to your
  logging stack.
- Place the backend behind a reverse proxy (NGINX, Cloudflare Tunnel, etc.) to
  enforce TLS and Web Application Firewall policies.
- Configure autoscaling triggers around CPU usage and request latency. Each
  compile job is CPU bound, so horizontal scaling yields the best improvements.

## Operations

### Health checks

Expose `/health` (add if missing) or rely on a lightweight compile smoke test in
your monitoring stack. For Kubernetes, configure a readiness probe that posts a
small FunC snippet and expects a 200 response.

### Key rotation

Rotate `PRIVATE_KEY` on a fixed cadence and whenever the verifier key is
suspected to be compromised. After rotation, update the on-chain verifier
registry so the new public key is trusted.

### Storage management

The backend relies on IPFS pinning. Monitor pin quotas on Infura and configure
alerting when usage approaches plan limits. For self-hosted nodes, set up
snapshotting and backups to avoid data loss.

## Integrating with Dynamic Capital systems

1. **Contract Verifier UI**: Set the `VITE_BACKEND_URL` and
   `VITE_BACKEND_URL_TESTNET` values in the UI deployment to point at your
   backend instance(s). The UI expects the same REST signature as upstream.
2. **Supabase Edge Functions**: Update `TON_VERIFIER_URL` (and optional
   `TON_VERIFIER_TOKEN`) to call your backend when verifying payment proofs. The
   backend's signed response is forwarded to the Sources Registry.
3. **CI automation**: Extend the `build-ton-verifier.ts` script to download the
   latest backend build metadata if you want to bundle both services together in
   release notes.

## Maintenance checklist

- Track upstream changes monthly and apply patches that add compiler versions or
  security fixes.
- Rebuild container images whenever the base Node image receives security
  updates.
- Validate the compile matrix quarterly using representative Dynamic Capital
  contracts.
- Review rate-limit settings and adjust thresholds if CI pipelines trigger 429
  responses during bursts.

## References

- [TON Contract Verifier backend repository](https://github.com/ton-community/contract-verifier-backend)
- [TON Sources Registry contracts](https://github.com/ton-community/contract-verifier-contracts)
- [TON Contract Verifier UI runbook](./ton-contract-verifier.md)
