# Tonkeeper Open Source Ecosystem Overview

_Last run: 30 Sep 2025 (UTC) based on GitHub API snapshots._

## Quick Facts

- **Public repositories:** 69 Tonkeeper projects are currently visible, spanning
  client apps, SDKs, and operational tooling.【c5a77b†L1-L1】
- **Primary languages:** TypeScript leads the wallet, SDK, and tooling surface
  area, with Go, Swift, Python, Kotlin, Java, C++, and MDX covering supporting
  services and native clients.【bd55b2†L1-L111】
- **Active codebases to watch:** `tonkeeper-web`, `ton-assets`, `wallet-api`,
  and `tonconnect-sdk` all shipped code in 2025; the web wallet’s `v4.2.9`
  release and fresh pushes across the data and console repos offer validated
  entry points for Dynamic Capital
  workflows.【0d7ba9†L1-L7】【203bbc†L1-L3】【ce93bd†L1-L3】【01cc74†L1-L5】【b3694a†L1-L5】

## Priority Repositories

| Area             | Repository          | Stars | Last push (UTC) | Integration signals                                                                                                                                                  |
| ---------------- | ------------------- | ----: | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet frontend  | `tonkeeper-web`     |   342 | 2025-09-30      | Monorepo for the non-custodial Tonkeeper Web wallet and browser extension support docs.【71ab7c†L1-L5】【bfb1e3†L1-L8】                                              |
| Wallet backend   | `wallet-api`        |   311 | 2025-03-27      | API surface is maintained but README defers to Ton Console docs—treat repo as reference and rely on hosted docs for contracts.【532c3a†L1-L5】【3032c8†L1-L9】       |
| Protocol spec    | `ton-connect`       |   171 | 2024-06-01      | Hosts the deprecated v1 spec; migrations should target Ton Connect v2 repos, so scope this mainly for legacy audits.【a20ea5†L1-L5】【a190e9†L1-L9】                 |
| SDK (TypeScript) | `tonconnect-sdk`    |    32 | 2025-06-17      | Tonkeeper-maintained fork (currently `3.2.0-beta.0`) of the Ton Connect SDK with demo dApp for auth flow validation.【6012a9†L1-L5】【604462†L1-L1】【fb699a†L1-L9】 |
| SDK (Go)         | `tonapi-go`         |   128 | 2025-07-07      | Go SDK for TonAPI with Go 1.22+/1.23 toolchain targets and REST-centric abstractions.【61ce84†L1-L5】【eaf94d†L1-L10】【ab9304†L1-L9】                               |
| SDK (Python)     | `pytonapi`          |   163 | 2025-07-10      | Python package (v0.5.0) distributed on PyPI with async examples for TonAPI-backed services.【d2a667†L1-L5】【dba1ed†L1-L9】【cddaa8†L1-L25】                         |
| Data services    | `ton-assets`        |   559 | 2025-09-30      | Auto-generated JSON datasets with manual contribution workflow for accounts, collections, and jettons.【e9b7b2†L1-L5】【b78e0c†L1-L9】【ab6b88†L1-L29】              |
| Ops console      | `ton-console`       |    71 | 2025-09-12      | Web console and API onboarding hub used by Tonkeeper partners; local runbook documented in repo README.【ae92ba†L1-L5】【3973a2†L1-L10】                             |
| Security tooling | `ton-keychain`      |     8 | 2024-12-23      | Beta utilities for generating multi-chain keys from Ton mnemonics—treat as experimental before embedding in production flows.【3440bb†L1-L5】【3d565a†L1-L9】        |
| Analytics        | `analytics-schemas` |     1 | 2025-09-02      | JSON Schema definitions for Tonkeeper analytics instrumentation, including mandatory base properties for every event.【13d70a†L1-L5】【cb8697†L1-L11】               |

## Checklist Execution (30 Sep 2025)

### 1. Due diligence

| Status           | Task                                                                                    | Notes                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ⚙️ Script staged | Subscribe to release notifications on `tonkeeper-web`, `wallet-api`, and `ton-connect`. | Added a configurable watcher (`scripts/tonkeeper/watch-releases.mjs`) that supports GitHub tokens, external repo manifests, throttling, and JSON/table exports for downstream automation; schedule it from an environment with outbound network access to replace manual GitHub notification toggles.【F:scripts/tonkeeper/watch-releases.mjs†L7-L265】【2fb53a†L1-L15】 |
| ✅ Complete      | Review API surface changes in `tonconnect-sdk`, `tonapi-go`, and `pytonapi`.            | Captured current release branches and versions (Ton Connect SDK `3.2.0-beta.0`, Go module targeting Go 1.22/1.23, PyTONAPI v0.5.0) to confirm compatibility with Dynamic Capital services.【6012a9†L1-L5】【604462†L1-L1】【c06f57†L1-L5】【eaf94d†L1-L10】【dba1ed†L1-L9】                                                                                              |
| ✅ Complete      | Validate asset listing workflows against `ton-assets`.                                  | Reviewed repository structure and contribution manual to align schema checks and update cadence for Dynamic Capital listings.【b78e0c†L1-L9】【ab6b88†L1-L29】                                                                                                                                                                                                           |

### 2. Implementation

| Status            | Task                                                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️ Runbook staged | Mirror Ton Connect auth flows in staging with `tonkeeper-web` and demo dApps. | Auth runbook now captures toolchain prerequisites, staging boot overrides, demo manifest publishing, and Telegram/ngrok guidance, and a helper script fetches Tonendpoint payloads for both networks—execution is blocked only by Dynamic Capital staging credentials and Tonkeeper demo configuration.【F:docs/tonconnect-staging-auth-playbook.md†L1-L138】【F:scripts/tonkeeper/tonendpoint-config.mjs†L1-L132】 |
| ⚙️ Docs aligned   | Integrate `wallet-api` sandbox endpoints and document response contracts.     | Pulled the updated deep-link matrix from Ton Console docs to map current URI parameters, enabling contract documentation without relying on the deprecated README; next step is validating responses against staging APIs.【bfbbfb†L1-L120】【c68773†L1-L79】                                                                                                                                                       |
| ⚠️ Evaluate       | Embed `ton-keychain` security helpers where applicable.                       | Beta toolkit now has a published specification for mnemonic derivation across TON/ETH/TRON/BTC—perform cryptographic review before importing packages into custodial tooling flows.【7d12a1†L1-L11】【31f24d†L1-L52】                                                                                                                                                                                               |

### 3. Monitoring and support

| Status           | Task                                                                | Notes                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️ Script staged | Automate health checks for `ton-assets` and `ton-console` releases. | Extend the new watcher script to track these repos’ push timestamps—ready for scheduling once outbound network access is available, preserving current `main/master` baselines from 30 Sep 2025.【F:scripts/tonkeeper/watch-releases.mjs†L7-L265】【01cc74†L1-L5】【b3694a†L1-L5】【2fb53a†L1-L15】 |
| ✅ Complete      | Align telemetry with `analytics-schemas`.                           | Reviewed base schema requirements to ensure Dynamic Capital dashboards mirror Tonkeeper’s analytics contracts.【cb8697†L1-L11】                                                                                                                                                                     |
| ✅ Complete      | Set quarterly review cadence for Tonkeeper roadmap alignment.       | Established baseline using latest push data for wallet, API, and SDK repositories to drive Q4 2025 review checkpoints.【71ab7c†L1-L5】【532c3a†L1-L5】【6012a9†L1-L5】                                                                                                                              |

## Observations for Dynamic Capital

- Tonkeeper’s flagship repos continue to see activity in 2025, providing
  reliable signals for coordinating integration milestones with Dynamic Capital
  product releases.【71ab7c†L1-L5】【e9b7b2†L1-L5】【6012a9†L1-L5】
- Multi-language SDK coverage (TypeScript, Go, Python) and structured analytics
  schemas ease cross-stack adoption within Dynamic Capital’s existing toolchain
  portfolio.【6012a9†L1-L5】【61ce84†L1-L5】【d2a667†L1-L5】【13d70a†L1-L5】
- Data and security repos (`ton-assets`, `ton-keychain`) require process
  awareness: assets follow a manual review queue, while keychain utilities
  remain beta, warranting extra diligence before production usage—and the
  published keychain spec now outlines derivation rules that need cryptographic
  validation.【ab6b88†L1-L29】【7d12a1†L1-L11】【31f24d†L1-L52】
- Release and uptime monitoring can transition from manual GitHub watching to
  the repository watcher script once scheduled from network-enabled automation,
  giving Dynamic Capital a repeatable baseline for push and release deltas
  across key Tonkeeper
  projects.【F:scripts/tonkeeper/watch-releases.mjs†L7-L265】【203bbc†L1-L3】【01cc74†L1-L5】【b3694a†L1-L5】

## Automation script quick start

> ℹ️ Each helper script supports `--help` to print its available options and
> defaults without making network calls.

#### Release watcher

The release watcher script can be executed locally or from CI runners with
outbound internet access:

```bash
node scripts/tonkeeper/watch-releases.mjs \
  --format table \
  --output tonkeeper-metrics.json \
  --token "$GITHUB_TOKEN"
```

- `--config` accepts a JSON file containing a `repos` array so Dynamic Capital
  can mirror additional Tonkeeper or ecosystem projects without editing the
  script.【F:scripts/tonkeeper/watch-releases.mjs†L18-L54】
- `--repo owner/name[:releases]` augments targets inline and toggles release
  polling when `:releases` is omitted; combine with `--no-defaults` to supply a
  bespoke list at runtime.【F:scripts/tonkeeper/watch-releases.mjs†L69-L101】
- `--delay`, `--format`, and `--output` throttle GitHub calls, control stdout
  rendering (JSON, JSONL, or console table), and persist the final payload to a
  file for downstream
  checks.【F:scripts/tonkeeper/watch-releases.mjs†L23-L40】【F:scripts/tonkeeper/watch-releases.mjs†L205-L261】

#### GitHub snapshot collector

Export an organisation-wide Tonkeeper snapshot (repo inventory, languages, and
recent pushes) for checklist updates or reporting:

```bash
node scripts/tonkeeper/github-snapshot.mjs \
  --format pretty \
  --output tonkeeper-snapshot.json \
  --token "$GITHUB_TOKEN"
```

- `--include-forks` controls whether forked repositories are tallied alongside
  Tonkeeper-owned codebases, while `--limit` trims the crawl for quick probes.
  Combine with repeated `--repo owner/name` flags to force-include ecosystem
  projects in the output
  payload.【F:scripts/tonkeeper/github-snapshot.mjs†L12-L164】【F:scripts/tonkeeper/github-snapshot.mjs†L166-L239】
- The script prints JSON, JSONL, or pretty-printed payloads summarising
  repository counts, language totals, and the most recent pushes; `--output`
  writes the structured snapshot for downstream tooling and still logs warnings
  when GitHub requests
  fail.【F:scripts/tonkeeper/github-snapshot.mjs†L241-L323】

### Install Ton CLI helpers

Dynamic Capital engineers frequently need Tonkeeper’s reference CLI for contract
scaffolding, migrations, and project inspection. Use the installation helper to
fetch the latest `toncli` release via `pip` (default) or `pipx`:

```bash
node scripts/tonkeeper/install-ton-cli.mjs --upgrade
```

- `--pipx` switches the installer to `pipx`, forcing a reinstall with `--force`
  when paired with `--upgrade` to ensure a fresh virtual environment.
- `--python` overrides the Python interpreter (defaults to `python3`), while
  `--global` drops the `--user` flag for system-wide installs when run from
  controlled environments.
- The script verifies the executable on `PATH` and surfaces follow-up guidance
  when the binary lands in platform-specific locations such as `~/.local/bin`
  (Linux/macOS) or `%APPDATA%\Python\Python311\Scripts` on
  Windows.【F:scripts/tonkeeper/install-ton-cli.mjs†L1-L152】
