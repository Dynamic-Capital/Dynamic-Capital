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

## Masterchain configuration reference

Audits frequently require a quick mapping between masterchain configuration IDs
and the operational levers they control. The tables below consolidate the core
entries Dynamic Capital tracks when reviewing on-chain governance proposals or
validator set changes. The parameter names match the TL‑B definitions in
[`crypto/block/block.tlb`](https://github.com/ton-blockchain/ton/blob/master/crypto/block/block.tlb)
and the narrative explanations provided in the TON community documentation.

To inspect live values, use either Tonviewer
(`https://tonviewer.com/config/<id>`) or the lite client
(`lite-client -C ~/.config/ton/global.config.json -rc 'getconfig <id>'`).

### Quick lookup index

Auditors often need to jump straight to a specific TON configuration entry
without scanning multiple tables. The matrix below links the most frequently
requested IDs to their Tonviewer inspection pages. Each label mirrors the
headings used later in this guide so you can pivot from the live value back to
the operational context described in the detailed tables.

| ID | Label | Tonviewer |
| -- | ----- | --------- |
| 0  | Config address | https://tonviewer.com/config/0 |
| 1  | Elector address | https://tonviewer.com/config/1 |
| 2  | System address | https://tonviewer.com/config/2 |
| 4  | Root DNS Contract | https://tonviewer.com/config/4 |
| 5  | Blackhole address | https://tonviewer.com/config/5 |
| 7  | Currencies volume | https://tonviewer.com/config/7 |
| 8  | Network version | https://tonviewer.com/config/8 |
| 9  | Mandatory parameters | https://tonviewer.com/config/9 |
| 10 | Critical parameters | https://tonviewer.com/config/10 |
| 11 | Proposal conditions | https://tonviewer.com/config/11 |
| 12 | Workchain configuration | https://tonviewer.com/config/12 |
| 13 | Complaints fee | https://tonviewer.com/config/13 |
| 14 | Block reward | https://tonviewer.com/config/14 |
| 15 | Election data | https://tonviewer.com/config/15 |
| 16 | Validators count | https://tonviewer.com/config/16 |
| 17 | Staking parameters | https://tonviewer.com/config/17 |
| 18 | Storage price | https://tonviewer.com/config/18 |
| 20 | Gas params | https://tonviewer.com/config/20 |
| 21 | Masterchain gas params | https://tonviewer.com/config/21 |
| 22 | Masterchain block limits | https://tonviewer.com/config/22 |
| 23 | Workchain block limits | https://tonviewer.com/config/23 |
| 24 | Masterchain message cost | https://tonviewer.com/config/24 |
| 25 | Workchain message cost | https://tonviewer.com/config/25 |
| 28 | Catchain configuration | https://tonviewer.com/config/28 |
| 29 | Consensus configuration | https://tonviewer.com/config/29 |
| 31 | Preferential addresses | https://tonviewer.com/config/31 |
| 32 | Previous round validators | https://tonviewer.com/config/32 |
| 34 | Current round validators | https://tonviewer.com/config/34 |
| 44 | Suspended addresses | https://tonviewer.com/config/44 |
| 45 | config.param_45.title | https://tonviewer.com/config/45 |
| 71 | ETH Toncoin Bridge | https://tonviewer.com/config/71 |
| 72 | BSC Toncoin Bridge | https://tonviewer.com/config/72 |
| 79 | ETH Bridge (jettons) | https://tonviewer.com/config/79 |

### Governance contracts & economic routing

| ID | Parameter (TL‑B type)                                | Operational focus                                                                    |
| -- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 0  | `config_addr` (`ConfigParam 0`)                      | Configuration contract that stores the masterchain dictionary validators load.       |
| 1  | `elector_addr` (`ConfigParam 1`)                     | Elector contract in charge of validator elections, stake locking, and reward payout. |
| 2  | `minter_addr` (`ConfigParam 2`)                      | System account that mints Toncoin rewards (falls back to `config_addr` if absent).   |
| 3  | `fee_collector_addr` (`ConfigParam 3`)               | Collector for transaction fees that are not routed to the elector.                   |
| 4  | `dns_root_addr` (`ConfigParam 4`)                    | Root DNS resolver anchoring `.ton` domain lookups.                                   |
| 5  | `BurningConfig` (`ConfigParam 5`)                    | Ratio of collected fees that are burned (`fee_burn_num` / `fee_burn_denom`).         |
| 6  | `mint_new_price`, `mint_add_price` (`ConfigParam 6`) | Pricing schedule for issuing extra currencies via the minting contract.              |
| 7  | `to_mint` (`ConfigParam 7`)                          | Circulating volumes declared for each extra currency ID.                             |

### Validator governance parameters

| ID | Parameter (TL‑B type)                  | Operational focus                                                                     |
| -- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| 8  | `GlobalVersion` (`ConfigParam 8`)      | Signals supported protocol version and feature flags to validators.                   |
| 9  | `mandatory_params` (`ConfigParam 9`)   | Hashmap of configuration IDs that must exist in every proposal.                       |
| 10 | `critical_params` (`ConfigParam 10`)   | IDs that require heightened voting thresholds and multi-round approval.               |
| 11 | `ConfigVotingSetup` (`ConfigParam 11`) | Proposal round counts, quorum thresholds, and storage fees.                           |
| 12 | `workchains` (`ConfigParam 12`)        | Describes workchain shards, zerostate hashes, VM format, and activation flags.        |
| 13 | `ComplaintPricing` (`ConfigParam 13`)  | Stake required to file validator misconduct complaints.                               |
| 14 | `BlockCreateFees` (`ConfigParam 14`)   | Base block rewards for masterchain and workchain production.                          |
| 15 | `ConfigParam 15`                       | Election timing (`validators_elected_for`, `elections_start_before`, etc.).           |
| 16 | `ConfigParam 16`                       | Limits on total, masterchain, and minimum validator counts.                           |
| 17 | `ConfigParam 17`                       | Staking thresholds (`min_stake`, `max_stake`, `min_total_stake`, `max_stake_factor`). |
| 18 | `ConfigParam 18`                       | Storage price schedule for workchains and the masterchain.                            |

### Execution costs & block limits

| ID | Parameter (TL‑B type)                       | Operational focus                                                               |
| -- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| 20 | `config_mc_gas_prices` (`ConfigParam 20`)   | Gas limits and pricing applied to masterchain transactions.                     |
| 21 | `config_gas_prices` (`ConfigParam 21`)      | Gas limits and pricing for workchain transactions.                              |
| 22 | `config_mc_block_limits` (`ConfigParam 22`) | Masterchain block size, gas, and logical time ceilings.                         |
| 23 | `config_block_limits` (`ConfigParam 23`)    | Workchain block limits mirroring the masterchain fields.                        |
| 24 | `config_mc_fwd_prices` (`ConfigParam 24`)   | Message forwarding fees for the masterchain (lump, bit, cell, IHR factors).     |
| 25 | `config_fwd_prices` (`ConfigParam 25`)      | Message forwarding fees for workchains.                                         |
| 28 | `CatchainConfig` (`ConfigParam 28`)         | Catchain tuning (validator shuffling, lifetime, per-shard validator counts).    |
| 29 | `ConsensusConfig` (`ConfigParam 29`)        | Above-catchain consensus settings (round cadence, timeouts, dependency limits). |

### Validator rosters & network safety nets

| ID | Parameter (TL‑B type)                             | Operational focus                                                                                    |
| -- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 31 | `fundamental_smc_addr` (`ConfigParam 31`)         | Privileged masterchain contracts exempt from gas/storage fees and allowed to emit tick‑tock traffic. |
| 32 | `prev_validators` (`ConfigParam 32`)              | Previous validator set used for reconciliation and stake release.                                    |
| 34 | `cur_validators` (`ConfigParam 34`)               | Active validator set with weights, ADNL addresses, and validity window.                              |
| 36 | `next_validators` (`ConfigParam 36`)              | (Completeness) Scheduled validator set once the current elections conclude.                          |
| 39 | `ConfigParam 39`                                  | (Completeness) Signed temporary validator keys published for the round.                              |
| 40 | `MisbehaviourPunishmentConfig` (`ConfigParam 40`) | Flat/proportional slashing multipliers and grace intervals.                                          |
| 43 | `SizeLimitsConfig` (`ConfigParam 43`)             | Account/message size ceilings, VM depth limits, and library cell caps.                               |
| 44 | `SuspendedAddressList` (`ConfigParam 44`)         | Accounts barred from initialization until `suspended_until`.                                         |
| 45 | `PrecompiledContractsConfig` (`ConfigParam 45`)   | Registry of precompiled system contracts and their gas usage.                                        |

Rows labelled "(Completeness)" capture adjacent TL‑B entries auditors typically
review alongside the requested parameters.

### Bridge registries

| ID | Parameter (TL‑B type)                   | Operational focus                                                           |
| -- | --------------------------------------- | --------------------------------------------------------------------------- |
| 71 | `OracleBridgeParams` (`ConfigParam 71`) | TON ↔ Ethereum Toncoin bridge contract, oracle multisig, and oracle roster. |
| 72 | `OracleBridgeParams` (`ConfigParam 72`) | TON ↔ BNB Smart Chain Toncoin bridge metadata.                              |
| 73 | `OracleBridgeParams` (`ConfigParam 73`) | TON ↔ Polygon Toncoin bridge metadata.                                      |
| 79 | `JettonBridgeParams` (`ConfigParam 79`) | Ethereum asset bridge configuration for wrapped jettons on TON.             |
| 81 | `JettonBridgeParams` (`ConfigParam 81`) | BNB Smart Chain asset bridge configuration for wrapped jettons on TON.      |
| 82 | `JettonBridgeParams` (`ConfigParam 82`) | Polygon asset bridge configuration for wrapped jettons on TON.              |

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
  - Step through the Supabase release record **before** you create the log
    entry:
    1. Open the latest release in Supabase → `tx_logs` and locate the draft
       `ton_site_publish` row for the bundle you just uploaded.
    2. Confirm `meta.host` matches the `.ton` domain being promoted (for example
       `dynamiccapital.ton`).
    3. Confirm `meta.summary` is a concise, single-line synopsis that auditors
       can scan quickly.
    4. Update the release record so the host and summary reflect the version you
       are promoting before you proceed. Save the record to lock the values in
       place.
  - Record the publish event with the verified metadata in Supabase
    (`tx_logs.kind = 'ton_site_publish'`). Persist the returned content hash
    together with the fields you just validated so future audits have a single
    source of truth:
    - `git_ref`
    - `storage_bag_id`
    - `operator`
    - `meta.host`
    - `meta.summary`
    - `notes`
  - Mirror the verified host, summary, and returned content hash inside the
    `metadata` JSON payload so auditors can rely on the row without cross-
    referencing other tables.
  - Confirm the saved row echoes the verified host, summary, and content hash in
    both the top-level fields and the `metadata` payload, then capture the
    content hash for the DNS update.
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
    release notes. Include a desktop capture via the public TON Foundation
    gateway (`https://ton.site/dynamiccapital.ton`) so the fallback documented
    in [`docs/ton-site-gateway-access.md`](./ton-site-gateway-access.md) is
    covered in the runbook evidence. Capture legacy DigitalOcean/Lovable proxies
    after they are redeployed.
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
