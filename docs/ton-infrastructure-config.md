# TON Infrastructure Configuration Playbook

This playbook consolidates the operational steps required to provision and maintain the TON-facing services that Dynamic Capital relies on. Each section summarises the configuration workflow, references the in-repo artifacts to update, and calls out the operational owners.

## Table of contents

- [Prerequisites](#prerequisites)
- [TON Sites & Services](#ton-sites--services)
- [TON Storage](#ton-storage)
- [TON Proxy](#ton-proxy)
- [TON Wallet Provisioning](#ton-wallet-provisioning)
- [TON Node Operations](#ton-node-operations)

## Prerequisites

- Production TON wallet with multisig controls (`dynamic-capital-ton/config.yaml` → `governance.multisig`).
- Access to Supabase so releases can be recorded in `tx_logs` and `app_config` tables.
- `toncli` tooling installed locally or wired into CI for automated uploads and DNS updates.
- Secure vault (1Password, HashiCorp Vault, or equivalent) for seed phrases, ADNL keys, and storage provider credentials.

## TON Sites & Services

Dynamic Capital publishes the Telegram Mini App and ancillary static assets to TON Sites so they resolve under `.ton` domains.

### Configuration checklist

1. **Build static bundle**
   - Run `npm run build:miniapp` and export the bundle with `scripts/build-miniapp.sh` so artifacts land in `apps/miniapp/out` ready for upload.
2. **Upload via TON Storage + DNS update**
   - Execute `toncli storage upload ./apps/miniapp/out --dns dynamiccapital.ton` from the release branch.
   - Record the returned hash in Supabase (`tx_logs.kind = 'ton_site_publish'`) alongside the Git commit.
3. **ADNL certificate management**
   - Generate or rotate the TON Site certificate with `npm run ton:generate-adnl`.
   - Update `dns/dynamiccapital.ton.json` → `ton_site` with the new ADNL address and archive the private key in the vault.
4. **Post-deploy verification**
   - Open the domain through Tonkeeper/MyTonWallet and the TON Proxy CLI (`toncli proxy open dynamiccapital.ton`) and capture screenshots for the release notes.
   - Trigger the Supabase health check (`/supabase/functions/v1/link-wallet`) from the hosted site to confirm API connectivity.

### Operational ownership

| Task | Owner | Cadence |
| --- | --- | --- |
| Promote new site hash | Front-end | Per release |
| Rotate proxy keys / ADNL certs | DevOps | Quarterly |
| Monitor latency via TON Proxy poller | DevOps | 5‑minute cron |
| DNS rollback / incident response | Ops | On demand |

## TON Storage

Dynamic Capital maintains a dedicated TON Storage provider so site bundles, jetton metadata, and governance files remain highly available.

### Configuration checklist

1. **Daemon deployment**
   - Install the official `ton-storage-daemon` on a hardened VM (≥100 GB SSD).
   - Initialise the daemon with the provider key recorded in `dynamic-capital-ton/config.yaml` and store the seed phrase securely.
2. **Access controls**
   - Restrict gRPC/HTTP endpoints to private networks or authenticated tunnels; CI jobs should use scoped tokens.
   - Enable automatic pinning for latest Mini App bundle hashes and jetton metadata.
3. **Payments & renewals**
   - Fund the provider wallet via the treasury multisig and enable auto-renewal within the storage contracts.
   - Log provider heartbeats in Supabase (`tx_logs.kind = 'storage_heartbeat'`) to confirm uptime.
4. **Testing**
   - For dry-runs, point wallets and resolvers at TON testnet endpoints and use throwaway domains before promoting to mainnet.

### Operational ownership

| Role | Responsibilities |
| --- | --- |
| Uploader | Runs `toncli storage upload`, coordinates DNS updates, and records provenance. |
| Provider maintainer | Monitors disk usage, daemon uptime, and stake renewals. |
| Auditor | Confirms bag IDs match Git commits and DNS resolvers. |

## TON Proxy

The adaptive proxy pool balances traffic between TON-enabled endpoints and falls back when providers degrade. The implementation lives in `dynamic_proxy/proxy.py`.

### Configuration checklist

1. **Define proxy endpoints**
   - Populate `ProxyEndpoint` entries with identifiers, URLs, weights, and session caps. Use the `failure_threshold`, `recovery_threshold`, and `cooldown_seconds` fields to encode SLO expectations.
2. **Warm-up & health scoring**
   - Set `warmup_requests` high enough to avoid premature downgrades for new endpoints.
   - Monitor EWMA success/latency metrics (`success_ewma`, `latency_ewma`) via the exported `ProxySnapshot` data.
3. **Leasing & stickiness**
   - Rely on `DynamicProxyPool.acquire()` (see module docstring) to allocate sessions with optional client stickiness.
   - Implement usage accounting by persisting `ProxyLease` metadata (`client_id`, `expires_at`) in telemetry tables.
4. **Rotation policy**
   - Rotate provider credentials quarterly; archive historical configs in the vault and update CI secrets simultaneously.

## TON Wallet Provisioning

Wallets handle treasury inflows, storage payments, and operational expenses.

### Configuration checklist

1. **Programmatic provisioning**
   - Use the `docs/ton-wallet-quickstart.md` script to generate mnemonics, derive key pairs, and instantiate `WalletContractV4` against community RPC endpoints discovered via `@orbs-network/ton-access`.
2. **Segregate roles**
   - Treasury wallets (e.g., `governance.multisig`) handle custody and disbursements.
   - Operations wallets (documented in Supabase `app_config`) pay for storage uploads, DNS updates, and CI-driven deployments.
3. **Security controls**
   - Store mnemonics offline; enforce multisig for treasury actions and time-lock high-impact transfers (48 hours per `config.yaml`).
4. **Monitoring**
   - Mirror wallet balances through TON explorer APIs (TON API, toncenter) and reconcile against Supabase `tx_logs` entries after each transaction batch.

## TON Node Operations

Running a local TON full node improves indexing latency and removes reliance on community RPCs during incidents.

### Configuration checklist

1. **Provision infrastructure**
   - Deploy on compute with ≥8 vCPU, 16 GB RAM, NVMe SSD storage (≥1 TB) to accommodate the blockchain state and archives.
   - Harden the host (firewall, automatic security updates, restricted SSH access).
2. **Install node software**
   - Fetch the official TON node packages or build from source (`ton-blockchain/ton`).
   - Initialise with the liteserver configuration found in `dynamic-capital-ton/config.yaml` (`network.liteservers`).
3. **Synchronisation & monitoring**
   - Enable telemetry (Prometheus or built-in metrics) to track block height, peer counts, and resource usage.
   - Configure alerting when lag exceeds 50 blocks or disk utilisation crosses 80%.
4. **Integrations**
   - Point internal services (edge functions, analytics jobs) to the node’s RPC endpoint to reduce reliance on public gateways.
   - Maintain a fallback list of community endpoints for disaster recovery.
5. **Maintenance**
   - Schedule weekly snapshots and monthly restarts with graceful shutdowns to minimise data corruption risk.
   - Apply protocol updates promptly; verify compatibility in a staging node before touching production.

---

Keep this playbook updated as TON tooling evolves. When new automation scripts or infrastructure providers come online, link them here so the operational context remains discoverable.
