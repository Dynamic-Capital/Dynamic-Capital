# TON Infrastructure Configuration Playbook

This playbook consolidates the operational steps required to provision and
maintain the TON-facing services that Dynamic Capital relies on. Each section
summarises the configuration workflow, references the in-repo artifacts to
update, and calls out the operational owners.

## Table of contents

- [Prerequisites](#prerequisites)
- [TON Sites & Services](#ton-sites--services)
- [TON Storage](#ton-storage)
- [TON Proxy](#ton-proxy)
- [TON Wallet Provisioning](#ton-wallet-provisioning)
- [TON Node Operations](#ton-node-operations)

## Prerequisites

- Production TON wallet with multisig controls
  (`dynamic-capital-ton/config.yaml` → `governance.multisig`).
- Access to Supabase so releases can be recorded in `tx_logs` and `app_config`
  tables.
- `toncli` tooling installed locally or wired into CI for automated uploads and
  DNS updates.
- Secure vault (1Password, HashiCorp Vault, or equivalent) for seed phrases,
  ADNL keys, and storage provider credentials.

## TON Sites & Services

Dynamic Capital publishes the Telegram Mini App and ancillary static assets to
TON Sites so they resolve under `.ton` domains.

### Configuration checklist

- [ ] **Build static bundle**
  - Run `npm run build:miniapp` from the repo root (the script executes
    `scripts/build-miniapp.sh`). The build script writes the Mini App bundle to
    `supabase/functions/miniapp/static`; `apps/miniapp/out` is not generated in
    this repository.
  - The build completes with `scripts/assert-miniapp-bundle.mjs`, which fails if
    `supabase/functions/miniapp/static/index.html` is missing or suspiciously
    small. Re-run the build and address any reported errors before continuing.
  - Verify the compiled assets under `supabase/functions/miniapp/static` and
    confirm `supabase/functions/miniapp/manifest.json` reflects the release
    metadata.
  - Zip the `static` directory and move the archive to the secure hand-off
    folder (`Supabase storage -> ton/releases/<yyyy-mm-dd>`).
- [ ] **Upload via TON Storage + DNS update**
  - Execute
    `toncli storage upload ./supabase/functions/miniapp/static --dns dynamiccapital.ton --verbose`
    from the release branch.
  - Verify the Supabase release record fields before logging: set
    `meta.host` to the `.ton` domain being promoted and `meta.summary` to a
    one-line release synopsis so the provenance is clear to auditors.
  - Store the returned content hash in Supabase
    (`tx_logs.kind = 'ton_site_publish'`) alongside:
    - `git_ref`
    - `storage_bag_id`
    - `operator`
    - `meta.host`
    - `meta.summary`
    - `notes`
  - Commit the DNS change in `dns/dynamiccapital.ton.json` (update
    `ton_site.content_id`). Use a PR labelled `infra-ton` so rotation is
    auditable and validate the file with `node scripts/verify/ton_site.mjs`.
- [ ] **ADNL certificate management**
  - Generate or rotate the TON Site certificate with
    `npm run ton:generate-adnl`.
  - Store the generated `adnl-cert.pem` in the vault with an expiration reminder
    (90 days prior) and update `dns/dynamiccapital.ton.json` →
    `ton_site.adnl_address`.
  - Update the `TON_ADNL_CERT` secret in GitHub and trigger the infrastructure
    workflow that redeploys the proxy hosts so the new certificate reaches each
    host.
- [ ] **Post-deploy verification**
  - Open the domain through Tonkeeper/MyTonWallet and the TON Proxy CLI
    (`toncli proxy open dynamiccapital.ton`) and capture screenshots for the
    release notes.
  - Trigger the Supabase health check (`/supabase/functions/v1/link-wallet`)
    from the hosted site to confirm API connectivity; log the response payload
    in `tx_logs.metadata`.
  - Update the release checklist template (see
    [Execution tracker](#execution-tracker)) with a signed-off verification
    entry.

### Operational ownership

| Task                                 | Owner     | Cadence       |
| ------------------------------------ | --------- | ------------- |
| Promote new site hash                | Front-end | Per release   |
| Rotate proxy keys / ADNL certs       | DevOps    | Quarterly     |
| Monitor latency via TON Proxy poller | DevOps    | 5‑minute cron |
| DNS rollback / incident response     | Ops       | On demand     |

## TON Storage

Dynamic Capital maintains a dedicated TON Storage provider so site bundles,
jetton metadata, and governance files remain highly available.

### Configuration checklist

- [ ] **Daemon deployment**
  - Install the official `ton-storage-daemon` on a hardened VM (≥100 GB SSD)
    following the steps in `docs/ton-storage-setup.md`.
  - Initialise the daemon with the provider key recorded in
    `dynamic-capital-ton/config.yaml`; export the seed phrase to the vault under
    `infra/ton/storage/<hostname>`.
  - Verify the daemon status with `systemctl status ton-storage` and capture the
    activation timestamp.
- [ ] **Access controls**
  - Restrict gRPC/HTTP endpoints to private networks or authenticated tunnels;
    CI jobs should authenticate via service tokens stored in Supabase
    (`app_config.storage_token`).
  - Enable automatic pinning for the latest Mini App bundle hashes
    (`toncli storage pin <hash>`); document pinned hashes in
    `docs/ton-storage-pins.md`.
- [ ] **Payments & renewals**
  - Fund the provider wallet via the treasury multisig and enable auto-renewal
    within the storage contracts.
  - Log provider heartbeats in Supabase (`tx_logs.kind = 'storage_heartbeat'`)
    to confirm uptime, attaching `ton-storage-daemon status` output.
- [ ] **Testing**
  - For dry-runs, point wallets and resolvers at TON testnet endpoints and use
    throwaway domains before promoting to mainnet.
  - Use `scripts/verify/ton_site.mjs` or `scripts/verify/ton_site.sh` to confirm
    DNS metadata and ADNL certificates before switching traffic.

### Operational ownership

| Role                | Responsibilities                                                               |
| ------------------- | ------------------------------------------------------------------------------ |
| Uploader            | Runs `toncli storage upload`, coordinates DNS updates, and records provenance. |
| Provider maintainer | Monitors disk usage, daemon uptime, and stake renewals.                        |
| Auditor             | Confirms bag IDs match Git commits and DNS resolvers.                          |

## TON Proxy

The adaptive proxy pool balances traffic between TON-enabled endpoints and falls
back when providers degrade. The implementation lives in
`dynamic_proxy/proxy.py`.

### Configuration checklist

- [ ] **Define proxy endpoints**
  - Update the configuration that instantiates `dynamic_proxy.ProxyEndpoint`
    objects (for example the Supabase function or worker that constructs the
    pool) with the latest providers, including `identifier`, `url`, `weight`,
    `max_sessions`, and thresholds.
  - Run or extend the existing unit tests in `tests/test_dynamic_proxy.py` to
    confirm configuration changes keep acquisition logic healthy before
    deploying.
- [ ] **Warm-up & health scoring**
  - Set `warmup_requests` to `min(10, expected_qps * 2)` for new endpoints;
    document the rationale directly in the service configuration comments or
    commit notes.
  - Monitor EWMA success/latency metrics (`success_ewma`, `latency_ewma`) via
    the `DynamicProxyPool.describe()` snapshots and capture them in telemetry
    dashboards or Supabase tables.
- [ ] **Leasing & stickiness**
  - Use `DynamicProxyPool.acquire()` (see module docstring) to allocate sessions
    with optional client stickiness.
  - Persist `ProxyLease` metadata (`client_id`, `expires_at`) to Supabase
    (`proxy_leases` table). Confirm TTL expirations via the daily cron job
    (`supabase/functions/v1/cleanup-proxy-leases`).
- [ ] **Rotation policy**
  - Rotate provider credentials quarterly; archive historical configs in the
    vault and update CI secrets simultaneously.
  - Document the rotation in `docs/ton-proxy-rotations.md` with provider,
    operator, and rotation summary.

## TON Wallet Provisioning

Wallets handle treasury inflows, storage payments, and operational expenses.

### Configuration checklist

- [ ] **Programmatic provisioning**
  - Follow `docs/ton-wallet-quickstart.md` to generate mnemonics, derive key
    pairs, and instantiate `WalletContractV4` against community RPC endpoints
    discovered via `@orbs-network/ton-access`.
  - Store the generated keys in the vault (`infra/ton/wallets/<wallet-name>`).
    Record wallet metadata (label, public key, environment) in
    `Supabase.app_config`.
- [ ] **Segregate roles**
  - Confirm treasury wallet entries (e.g., `governance.multisig`) in
    `dynamic-capital-ton/config.yaml`.
  - Ensure operations wallets documented in Supabase `app_config` have spending
    limits enforced via `wallet_limits` table entries.
- [ ] **Security controls**
  - Store mnemonics offline; enforce multisig for treasury actions and time-lock
    high-impact transfers (48 hours per `config.yaml`).
  - Rotate signing devices annually; record attestation logs in
    `docs/ton-wallet-audits.md`.
- [ ] **Monitoring**
  - Mirror wallet balances through TON explorer APIs (TON API, toncenter) and
    reconcile against Supabase `tx_logs` entries after each transaction batch.
  - Configure `supabase/functions/v1/ton-wallet-monitor` to send alerts when
    balances drift ±10% from expected operational floats.

## TON Node Operations

Running a local TON full node improves indexing latency and removes reliance on
community RPCs during incidents.

### Configuration checklist

- [ ] **Provision infrastructure**
  - Deploy on compute with ≥8 vCPU, 16 GB RAM, NVMe SSD storage (≥1 TB) to
    accommodate the blockchain state and archives.
  - Harden the host (firewall, automatic security updates, restricted SSH
    access). Capture the hardening output in `docs/ton-node-hardening.md`.
- [ ] **Install node software**
  - Fetch the official TON node packages or build from source
    (`ton-blockchain/ton`). Use `scripts/ton/install_node.sh` for reproducible
    builds.
  - Initialise with the liteserver configuration found in
    `dynamic-capital-ton/config.yaml` (`network.liteservers`). Keep a copy of
    `global.config.json` in the vault.
- [ ] **Synchronisation & monitoring**
  - Enable telemetry (Prometheus or built-in metrics) to track block height,
    peer counts, and resource usage.
  - Configure alerting when lag exceeds 50 blocks or disk utilisation crosses
    80%; record alert routing rules in `docs/ton-node-monitoring.md`.
- [ ] **Integrations**
  - Point internal services (edge functions, analytics jobs) to the node’s RPC
    endpoint to reduce reliance on public gateways.
  - Maintain a fallback list of community endpoints for disaster recovery and
    store it in `dynamic-capital-ton/config.yaml` under `network.fallback_rpcs`.
- [ ] **Maintenance**
  - Schedule weekly snapshots and monthly restarts with graceful shutdowns to
    minimise data corruption risk; log runs in
    `docs/ton-node-maintenance-log.md`.
  - Apply protocol updates promptly; verify compatibility in a staging node
    before touching production. Capture staging results in the maintenance log.

## Execution tracker

Use the following template to record each run of the configuration checklist.
Copy the table into release notes or the runbook entry for the respective
change.

| Date       | Scope                          | Operator | Evidence                                                                                                          | Verification summary                                      | Notes                             |
| ---------- | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| YYYY-MM-DD | Sites / Storage / Proxy / Node | Name     | `[PR](https://github.com/dynamic-capital/...)`<br>`[tx_logs](https://app.supabase.com/...)`<br>`Vault: infra/...` | e.g. "Supabase health check 200 OK; Tonkeeper screenshot" | Follow-ups, incidents, next steps |

Document completed runs in the shared runbook folder so handovers and audits can
trace configuration changes end-to-end.

---

Keep this playbook updated as TON tooling evolves. When new automation scripts
or infrastructure providers come online, link them here so the operational
context remains discoverable.
