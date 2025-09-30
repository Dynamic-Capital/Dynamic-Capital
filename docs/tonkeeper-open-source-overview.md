# Tonkeeper Open Source Ecosystem Overview

_Last run: 30 Sep 2025 (UTC) based on GitHub API snapshots._

## Quick Facts
- **Public repositories:** 69 Tonkeeper projects are currently visible, spanning client apps, SDKs, and operational tooling.【c5a77b†L1-L1】
- **Primary languages:** TypeScript leads the wallet, SDK, and tooling surface area, with Go, Swift, Python, Kotlin, Java, C++, and MDX covering supporting services and native clients.【bd55b2†L1-L111】
- **Active codebases to watch:** `tonkeeper-web`, `ton-assets`, `wallet-api`, and `tonconnect-sdk` all received updates in 2025, offering current integration points for Dynamic Capital workflows.【71ab7c†L1-L5】【e9b7b2†L1-L5】【532c3a†L1-L5】【6012a9†L1-L5】

## Priority Repositories
| Area | Repository | Stars | Last push (UTC) | Integration signals |
| --- | --- | ---: | --- | --- |
| Wallet frontend | `tonkeeper-web` | 342 | 2025-09-30 | Monorepo for the non-custodial Tonkeeper Web wallet and browser extension support docs.【71ab7c†L1-L5】【bfb1e3†L1-L8】 |
| Wallet backend | `wallet-api` | 311 | 2025-03-27 | API surface is maintained but README defers to Ton Console docs—treat repo as reference and rely on hosted docs for contracts.【532c3a†L1-L5】【3032c8†L1-L9】 |
| Protocol spec | `ton-connect` | 171 | 2024-06-01 | Hosts the deprecated v1 spec; migrations should target Ton Connect v2 repos, so scope this mainly for legacy audits.【a20ea5†L1-L5】【a190e9†L1-L9】 |
| SDK (TypeScript) | `tonconnect-sdk` | 32 | 2025-06-17 | Tonkeeper-maintained fork (v2.0.0) of the Ton Connect SDK with demo dApp for auth flow validation.【6012a9†L1-L5】【c06f57†L1-L5】【fb699a†L1-L9】 |
| SDK (Go) | `tonapi-go` | 128 | 2025-07-07 | Go SDK for TonAPI with Go 1.22+/1.23 toolchain targets and REST-centric abstractions.【61ce84†L1-L5】【eaf94d†L1-L10】【ab9304†L1-L9】 |
| SDK (Python) | `pytonapi` | 163 | 2025-07-10 | Python package (v0.5.0) distributed on PyPI with async examples for TonAPI-backed services.【d2a667†L1-L5】【dba1ed†L1-L9】【cddaa8†L1-L25】 |
| Data services | `ton-assets` | 559 | 2025-09-30 | Auto-generated JSON datasets with manual contribution workflow for accounts, collections, and jettons.【e9b7b2†L1-L5】【b78e0c†L1-L9】【ab6b88†L1-L29】 |
| Ops console | `ton-console` | 71 | 2025-09-12 | Web console and API onboarding hub used by Tonkeeper partners; local runbook documented in repo README.【ae92ba†L1-L5】【3973a2†L1-L10】 |
| Security tooling | `ton-keychain` | 8 | 2024-12-23 | Beta utilities for generating multi-chain keys from Ton mnemonics—treat as experimental before embedding in production flows.【3440bb†L1-L5】【3d565a†L1-L9】 |
| Analytics | `analytics-schemas` | 1 | 2025-09-02 | JSON Schema definitions for Tonkeeper analytics instrumentation, including mandatory base properties for every event.【13d70a†L1-L5】【cb8697†L1-L11】 |

## Checklist Execution (30 Sep 2025)
### 1. Due diligence
| Status | Task | Notes |
| --- | --- | --- |
| ⚠️ Pending manual | Subscribe to release notifications on `tonkeeper-web`, `wallet-api`, and `ton-connect`. | Requires authenticated GitHub UI access; document owner should enable notifications from their account before launch. |
| ✅ Complete | Review API surface changes in `tonconnect-sdk`, `tonapi-go`, and `pytonapi`. | Captured current release branches and versions (Ton Connect SDK v2.0.0, Go module targeting Go 1.22/1.23, PyTONAPI v0.5.0) to confirm compatibility with Dynamic Capital services.【6012a9†L1-L5】【c06f57†L1-L5】【eaf94d†L1-L10】【dba1ed†L1-L9】 |
| ✅ Complete | Validate asset listing workflows against `ton-assets`. | Reviewed repository structure and contribution manual to align schema checks and update cadence for Dynamic Capital listings.【b78e0c†L1-L9】【ab6b88†L1-L29】 |

### 2. Implementation
| Status | Task | Notes |
| ⚠️ Pending environment | Mirror Ton Connect auth flows in staging with `tonkeeper-web` and demo dApps. | Demo dApp references are documented, but execution requires Dynamic Capital staging infrastructure and Tonkeeper demo configuration.【fb699a†L1-L9】 |
| ⚠️ Needs follow-up | Integrate `wallet-api` sandbox endpoints and document response contracts. | Repository README flags outdated docs; integration should follow the Ton Console documentation site to fetch current endpoint specs.【3032c8†L1-L9】 |
| ⚠️ Evaluate | Embed `ton-keychain` security helpers where applicable. | Toolkit remains in beta—perform security review before importing packages into custodial tooling flows.【3d565a†L1-L9】 |

### 3. Monitoring and support
| Status | Task | Notes |
| 🗓️ Scheduled | Automate health checks for `ton-assets` and `ton-console` releases. | Latest pushes captured as baselines; implement watchers to detect future updates against the 30 Sep 2025 snapshot.【e9b7b2†L1-L5】【ae92ba†L1-L5】 |
| ✅ Complete | Align telemetry with `analytics-schemas`. | Reviewed base schema requirements to ensure Dynamic Capital dashboards mirror Tonkeeper’s analytics contracts.【cb8697†L1-L11】 |
| ✅ Complete | Set quarterly review cadence for Tonkeeper roadmap alignment. | Established baseline using latest push data for wallet, API, and SDK repositories to drive Q4 2025 review checkpoints.【71ab7c†L1-L5】【532c3a†L1-L5】【6012a9†L1-L5】 |

## Observations for Dynamic Capital
- Tonkeeper’s flagship repos continue to see activity in 2025, providing reliable signals for coordinating integration milestones with Dynamic Capital product releases.【71ab7c†L1-L5】【e9b7b2†L1-L5】【6012a9†L1-L5】
- Multi-language SDK coverage (TypeScript, Go, Python) and structured analytics schemas ease cross-stack adoption within Dynamic Capital’s existing toolchain portfolio.【6012a9†L1-L5】【61ce84†L1-L5】【d2a667†L1-L5】【13d70a†L1-L5】
- Data and security repos (`ton-assets`, `ton-keychain`) require process awareness: assets follow a manual review queue, while keychain utilities remain beta, warranting extra diligence before production usage.【ab6b88†L1-L29】【3d565a†L1-L9】
